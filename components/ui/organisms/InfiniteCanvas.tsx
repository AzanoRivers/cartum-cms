'use client'

import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { throttle } from '@/lib/utils/throttle'
import { NodeCard } from '@/components/ui/molecules/NodeCard'
import { ConnectionLayer } from '@/components/ui/organisms/ConnectionLayer'
import { FieldEditPanel } from '@/components/ui/organisms/FieldEditPanel'
import { BoardContextMenu } from '@/components/ui/molecules/BoardContextMenu'
import { CanvasContextMenu } from '@/components/ui/molecules/CanvasContextMenu'
import type { ConnectionLayerHandle } from '@/components/ui/organisms/ConnectionLayer'
import type { BoardContextMenuState } from '@/components/ui/molecules/BoardContextMenu'
import type { CanvasContextMenuState, CanvasContextMenuDict } from '@/components/ui/molecules/CanvasContextMenu'
import { useNodeBoardStore } from '@/lib/stores/nodeBoardStore'
import { useUIStore } from '@/lib/stores/uiStore'
import { useConnections } from '@/lib/hooks/useConnections'
import { useMobileNodeGestures } from '@/lib/hooks/useMobileNodeGestures'
import { updateNodePosition, deleteNode, createContainerNode, createFieldNode, renameNode } from '@/lib/actions/nodes.actions'
import { RenameNodeDialog } from '@/components/ui/molecules/RenameNodeDialog'
import type { RenameNodeDialogDict } from '@/components/ui/molecules/RenameNodeDialog'
import { checkNodeDeletionRisk } from '@/lib/actions/integrity.actions'
import { useToast } from '@/lib/hooks/useToast'
import { DeleteConfirmDialog } from '@/components/ui/molecules/DeleteConfirmDialog'
import { FullscreenLoader } from '@/components/ui/atoms/FullscreenLoader'
import type { DeleteDialogDict } from '@/components/ui/molecules/DeleteConfirmDialog'
import type { DeletionRisk } from '@/types/integrity'
import type { AnyNode, NodeConnection, PortSide } from '@/types/nodes'

// ── Card geometry (must match ConnectionLayer constants) ─────────────────────
const CARD_W = 208
const CARD_H = 80

const CTRL_OFFSET: Record<PortSide, { x: number; y: number }> = {
  top:    { x: 0,    y: -80 },
  right:  { x: 80,   y: 0 },
  bottom: { x: 0,    y: 80 },
  left:   { x: -80,  y: 0 },
}

function getPortPos(node: AnyNode, side: PortSide) {
  const { positionX: x, positionY: y } = node
  if (side === 'top')    return { x: x + CARD_W / 2, y }
  if (side === 'right')  return { x: x + CARD_W,     y: y + CARD_H / 2 }
  if (side === 'bottom') return { x: x + CARD_W / 2, y: y + CARD_H }
  return                        { x,                  y: y + CARD_H / 2 }
}

// ── Fit-to-view helper (mobile-aware) ────────────────────────────────────────
// Uses clientWidth/clientHeight (layout dimensions) to avoid being affected by
// parent CSS transforms (e.g. VHSTransition scale animation).
function computeFitView(w: number, h: number, nodes: AnyNode[]) {
  const isMobile  = w < 768
  const PADDING   = isMobile ? 32  : 64
  const MIN_SCALE = isMobile ? 0.3 : 0.25
  const MAX_SCALE = isMobile ? 1.0 : 1.0

  const minX = Math.min(...nodes.map((n) => n.positionX))
  const minY = Math.min(...nodes.map((n) => n.positionY))
  const maxX = Math.max(...nodes.map((n) => n.positionX + CARD_W))
  const maxY = Math.max(...nodes.map((n) => n.positionY + CARD_H))
  const scaleX = (w - PADDING * 2) / (maxX - minX || 1)
  const scaleY = (h - PADDING * 2) / (maxY - minY || 1)
  const scale  = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_SCALE), MAX_SCALE)
  const contentW = (maxX - minX) * scale
  const contentH = (maxY - minY) * scale
  // canvas div uses transform-origin:center (cx=w/2, cy=h/2).
  // A node at (nx,ny) renders at: scale*(nx - cx) + tx + cx
  // To center: solve for tx → tx = scale*(cx - minX) - contentW/2
  return {
    scale,
    offsetX: scale * (w / 2 - minX) - contentW / 2,
    offsetY: scale * (h / 2 - minY) - contentH / 2,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export type InfiniteCanvasProps = {
  initialNodes: AnyNode[]
  connections?: NodeConnection[]
  isStorageConfigured?: boolean
}

export function InfiniteCanvas({ initialNodes, connections = [], isStorageConfigured = false }: InfiniteCanvasProps) {
  const router    = useRouter()
  const outerRef  = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const connectionLayerRef = useRef<ConnectionLayerHandle>(null)

  const isPanning     = useRef(false)
  const lastPos       = useRef({ x: 0, y: 0 })
  const dragOriginRef = useRef<{ side: PortSide } | null>(null)

  // Card drag state (all via refs — zero React renders during drag)
  const cardDragRef   = useRef<{
    nodeId:       string
    startMouseX:  number
    startMouseY:  number
    startNodeX:   number
    startNodeY:   number
    moved:        boolean
    wrapperEl:    HTMLElement | null
  } | null>(null)
  // Stores the nodeId that was dragged so onClickCapture can suppress the click
  const suppressClickRef = useRef<string | null>(null)

  const setNodes       = useNodeBoardStore((s) => s.setNodes)
  const nodes          = useNodeBoardStore((s) => s.nodes)
  const addNode        = useNodeBoardStore((s) => s.addNode)
  const removeNode     = useNodeBoardStore((s) => s.removeNode)
  const selectedNodeId = useNodeBoardStore((s) => s.selectedNodeId)
  const selectNode     = useNodeBoardStore((s) => s.selectNode)
  const setOffset      = useNodeBoardStore((s) => s.setOffset)
  const setScale       = useNodeBoardStore((s) => s.setScale)
  const setCanvasDimensions = useNodeBoardStore((s) => s.setCanvasDimensions)
  const updateNodePositionOptimistic = useNodeBoardStore((s) => s.updateNodePositionOptimistic)

  const [contextMenu,      setContextMenu]      = useState<BoardContextMenuState | null>(null)
  const [canvasMenu,       setCanvasMenu]       = useState<CanvasContextMenuState | null>(null)
  const [renameNodeId,     setRenameNodeId]     = useState<string | null>(null)
  const [deleteRisk,       setDeleteRisk]       = useState<DeletionRisk | null>(null)
  const [deleteIsPending,  setDeleteIsPending]  = useState(false)
  const [isCheckingDelete, setIsCheckingDelete] = useState(false)

  const editingFieldId = useUIStore((s) => s.editingFieldId)
  const openFieldEdit  = useUIStore((s) => s.openFieldEdit)
  const d              = useUIStore((s) => s.cmsDict)

  const {
    connections: liveConnections,
    drag,
    dragRef,
    startDrag,
    cancelDrag,
    completeDrag,
    removeConnection,
    changeConnectionType,
  } = useConnections(connections)

  // ── Mobile gesture hook ────────────────────────────────────────────────────
  const {
    onTouchStart:          mobileOnTouchStart,
    onTouchMove:           mobileOnTouchMove,
    onTouchEnd:            mobileOnTouchEnd,
    mobileHoveredNodeId,
    shouldPreventScrollRef,
  } = useMobileNodeGestures({
    outerRef,

    onNodeDragEnd: (nodeId, finalX, finalY) => {
      updateNodePosition({ id: nodeId, x: finalX, y: finalY })
    },

    onNodeTap: (nodeId) => {
      selectNode(nodeId)
    },

    onNodeDoubleTap: (nodeId) => {
      const node = useNodeBoardStore.getState().nodes.find((n) => n.id === nodeId)
      if (!node) return
      if (node.type === 'container') {
        router.push(`/cms/board/${node.id}`)
      } else {
        openFieldEdit(nodeId)
      }
    },

    onPortDragStart: (nodeId, side) => {
      handlePortDragStart(nodeId, side)
    },

    onPortDragMove: (clientX, clientY) => {
      const canvasPos = clientToCanvas(clientX, clientY)
      connectionLayerRef.current?.moveDragLine(canvasPos)
    },

    onPortDragEnd: (targetNodeId) => {
      connectionLayerRef.current?.hideDragLine()
      dragOriginRef.current = null
      if (targetNodeId) {
        completeDrag(targetNodeId)
      } else {
        cancelDrag()
      }
    },

    onCanvasLongPress: (x, y) => {
      setCanvasMenu({ x, y })
    },

    suppressClick: (nodeId) => {
      suppressClickRef.current = nodeId
    },
  })

  // Seed store — then fit all nodes into view.
  // Uses ResizeObserver as fallback for when flex-1 hasn't resolved height yet
  // on the first RAF (common on narrow/mobile viewports).
  useEffect(() => {
    setNodes(initialNodes)

    if (!initialNodes.length) {
      setOffset(0, 0)
      setScale(1)
      return
    }

    let done = false

    function doFit() {
      if (done) return
      const el = outerRef.current
      if (!el) return
      const w = el.clientWidth
      const h = el.clientHeight
      if (h < 50) return
      done = true
      observer?.disconnect()
      const { scale, offsetX, offsetY } = computeFitView(w, h, initialNodes)
      setOffset(offsetX, offsetY)
      setScale(scale)
    }

    // Double RAF: first frame schedules layout, second frame reads settled dimensions
    let frame2: number
    const frame1 = requestAnimationFrame(() => { frame2 = requestAnimationFrame(doFit) })

    // ResizeObserver fallback: fires once the container has a stable size
    // (handles cases where flex layout takes more than 2 frames to settle)
    let observer: ResizeObserver | null = null
    if (outerRef.current) {
      observer = new ResizeObserver(doFit)
      observer.observe(outerRef.current)
    }

    return () => {
      done = true
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
      observer?.disconnect()
    }
  }, [initialNodes, setNodes, setOffset, setScale])

  // Subscribe to offset/scale → direct DOM (zero React re-renders on pan)
  useEffect(() => {
    return useNodeBoardStore.subscribe(
      (state) => [state.offsetX, state.offsetY, state.scale] as [number, number, number],
      ([x, y, scale]) => {
        if (canvasRef.current) {
          canvasRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
        }
      },
    )
  }, [])

  // Track canvas container dimensions in the store so other components (e.g.
  // NodeCreationPanel) can compute the correct viewport-center in canvas-space.
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const update = () => setCanvasDimensions(el.clientWidth, el.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [setCanvasDimensions])

  // ── Canvas-space coordinate conversion ──────────────────────────────────────
  function clientToCanvas(clientX: number, clientY: number) {
    const rect = outerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const { offsetX, offsetY, scale } = useNodeBoardStore.getState()
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top  - offsetY) / scale,
    }
  }

  // ── Port drag start ──────────────────────────────────────────────────────────
  const handlePortDragStart = useCallback(
    (nodeId: string, side: PortSide) => {
      const node = useNodeBoardStore.getState().nodes.find((n) => n.id === nodeId)
      if (!node) return
      const from = getPortPos(node, side)
      dragOriginRef.current = { side }
      startDrag(nodeId, side)
      connectionLayerRef.current?.showDragLine(from, side)
    },
    [startDrag],
  )

  // ── Mouse handlers ───────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Ignore port drag starts (handled by ConnectorPort)
    if ((e.target as HTMLElement).closest('[data-port]')) return

    const nodeEl = (e.target as HTMLElement).closest('[data-nodeid]') as HTMLElement | null

    if (nodeEl) {
      // Start card drag
      const nodeId = nodeEl.dataset.nodeid!
      const node   = useNodeBoardStore.getState().nodes.find((n) => n.id === nodeId)
      if (node) {
        cardDragRef.current = {
          nodeId,
          startMouseX:  e.clientX,
          startMouseY:  e.clientY,
          startNodeX:   node.positionX,
          startNodeY:   node.positionY,
          moved:        false,
          wrapperEl:    nodeEl,
        }
      }
      return
    }

    // Canvas pan
    isPanning.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setAttribute('data-panning', '1')
  }, [])

  const onMouseMoveRaw = useCallback(
    (e: React.MouseEvent) => {
      // Card drag — update position via direct DOM (zero React renders)
      if (cardDragRef.current) {
        const { startMouseX, startMouseY, startNodeX, startNodeY, wrapperEl } = cardDragRef.current
        const dx = e.clientX - startMouseX
        const dy = e.clientY - startMouseY

        if (!cardDragRef.current.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          cardDragRef.current.moved = true
        }

        if (cardDragRef.current.moved && wrapperEl) {
          const { scale } = useNodeBoardStore.getState()
          wrapperEl.style.left = `${startNodeX + dx / scale}px`
          wrapperEl.style.top  = `${startNodeY + dy / scale}px`
        }
        return
      }

      // Connection drag — update rope line via ref (zero React state changes)
      if (dragRef.current.isDragging) {
        const canvasPos = clientToCanvas(e.clientX, e.clientY)
        connectionLayerRef.current?.moveDragLine(canvasPos)
        return
      }

      // Pan
      if (!isPanning.current) return
      const dx = e.clientX - lastPos.current.x
      const dy = e.clientY - lastPos.current.y
      lastPos.current = { x: e.clientX, y: e.clientY }
      const { offsetX, offsetY } = useNodeBoardStore.getState()
      setOffset(offsetX + dx, offsetY + dy)
    },
    [dragRef, setOffset],
  )

  // Throttle to ~60fps so synthetic mouse events don't saturate the main thread
  const onMouseMove = useMemo(() => throttle(onMouseMoveRaw, 16), [onMouseMoveRaw])

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // Card drag end
      if (cardDragRef.current) {
        const { nodeId, startMouseX, startMouseY, startNodeX, startNodeY, moved } = cardDragRef.current
        cardDragRef.current = null

        if (moved) {
          const { scale } = useNodeBoardStore.getState()
          const finalX = startNodeX + (e.clientX - startMouseX) / scale
          const finalY = startNodeY + (e.clientY - startMouseY) / scale

          // Sync Zustand store (triggers React re-render once, settling positions)
          updateNodePositionOptimistic(nodeId, finalX, finalY)

          // Persist to DB (fire-and-forget — optimistic already applied)
          updateNodePosition({ id: nodeId, x: finalX, y: finalY })

          // Mark for click suppression (click fires after mouseup)
          suppressClickRef.current = nodeId
        }
        e.currentTarget.removeAttribute('data-panning')
        return
      }

      if (dragRef.current.isDragging) {
        connectionLayerRef.current?.hideDragLine()
        dragOriginRef.current = null
        const targetEl = (e.target as HTMLElement).closest('[data-nodeid]') as HTMLElement | null
        const targetType = targetEl?.dataset.nodetype
        const targetId   = targetEl?.dataset.nodeid
        if (targetId && targetType === 'container') {
          completeDrag(targetId)
        } else {
          cancelDrag()
        }
        return
      }

      isPanning.current = false
      e.currentTarget.removeAttribute('data-panning')
    },
    [dragRef, cancelDrag, completeDrag, updateNodePositionOptimistic],
  )

  // Suppress click event fired right after a drag ends
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (!suppressClickRef.current) return
    const nodeEl = (e.target as HTMLElement).closest('[data-nodeid]') as HTMLElement | null
    if (nodeEl?.dataset.nodeid === suppressClickRef.current) {
      e.stopPropagation()
      suppressClickRef.current = null
    }
  }, [])

  // ── Wheel + touchmove (non-passive, must be imperative) ─────────────────────
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.08 : 0.08
      const { scale } = useNodeBoardStore.getState()
      setScale(scale + delta)
    }
    // touchmove must be non-passive so e.preventDefault() can suppress native scroll
    // during canvas pan, node drag, pinch-to-zoom, and port connection drag.
    const touchMoveHandler = (e: TouchEvent) => {
      if (shouldPreventScrollRef.current || e.touches.length === 2) e.preventDefault()
    }
    el.addEventListener('wheel', wheelHandler, { passive: false })
    el.addEventListener('touchmove', touchMoveHandler, { passive: false })
    return () => {
      el.removeEventListener('wheel', wheelHandler)
      el.removeEventListener('touchmove', touchMoveHandler)
    }
  }, [setScale, shouldPreventScrollRef])

  // ── Context menu (right-click) ───────────────────────────────────────────────
  const handleFitAll = useCallback(() => {
    const { nodes: currentNodes } = useNodeBoardStore.getState()
    if (!currentNodes.length || !outerRef.current) return
    const { scale, offsetX, offsetY } = computeFitView(outerRef.current.clientWidth, outerRef.current.clientHeight, currentNodes)
    setOffset(offsetX, offsetY)
    setScale(scale)
  }, [setOffset, setScale])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const nodeEl = (e.target as HTMLElement).closest('[data-nodeid]') as HTMLElement | null
    if (!nodeEl) {
      setCanvasMenu({ x: e.clientX, y: e.clientY })
      return
    }
    const nodeId   = nodeEl.dataset.nodeid!
    const nodeType = (nodeEl.dataset.nodetype ?? 'container') as 'container' | 'field'
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId, nodeType })
  }, [])

  // ── Touch handlers — delegated to useMobileNodeGestures hook ────────────────
  // The hook manages the full gesture state machine: single/double-tap, long-press
  // node drag, port connection drag, canvas pan, pinch-to-zoom, and canvas long-press.

  // ── Context menu actions ─────────────────────────────────────────────────────
  const toast = useToast()

  const handleDuplicate = useCallback(async (nodeId: string) => {
    const node = useNodeBoardStore.getState().nodes.find((n) => n.id === nodeId)
    if (!node) return
    const t = d?.board.toast
    const offset = 40
    if (node.type === 'container') {
      const result = await createContainerNode({
        name:      `${node.name}_copy`,
        parentId:  node.parentId,
        positionX: node.positionX + offset,
        positionY: node.positionY + offset,
      })
      if (result.success) { addNode(result.data); toast.success(t?.duplicateSuccess ?? 'Node duplicated successfully.') }
      else toast.error(result.error ?? (t?.duplicateError ?? 'Could not duplicate node.'))
    } else {
      const result = await createFieldNode({
        name:             `${node.name}_copy`,
        parentId:         node.parentId ?? '',
        fieldType:        node.fieldType,
        positionX:        node.positionX + offset,
        positionY:        node.positionY + offset,
      })
      if (result.success) { addNode(result.data); toast.success(t?.duplicateSuccess ?? 'Node duplicated successfully.') }
      else toast.error(result.error ?? (t?.duplicateError ?? 'Could not duplicate node.'))
    }
  }, [addNode, toast, d])

  const handleRename = useCallback(async (nodeId: string, newName: string) => {
    const t = d?.board.toast
    const node = useNodeBoardStore.getState().nodes.find((n) => n.id === nodeId)
    if (!node) return
    // Optimistic update
    setNodes(useNodeBoardStore.getState().nodes.map((n) =>
      n.id === nodeId ? { ...n, name: newName } : n
    ))
    const result = await renameNode({ id: nodeId, name: newName })
    if (result.success) {
      toast.success(t?.renameSuccess ?? 'Node renamed.')
    } else {
      // Revert optimistic update
      setNodes(useNodeBoardStore.getState().nodes.map((n) =>
        n.id === nodeId ? { ...n, name: node.name } : n
      ))
      toast.error(result.error ?? (t?.renameError ?? 'Could not rename node.'))
    }
    setRenameNodeId(null)
  }, [setNodes, toast, d])

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    setIsCheckingDelete(true)
    const t = d?.board.toast
    try {
      const result = await checkNodeDeletionRisk({ id: nodeId })
      if (!result.success) {
        toast.error(t?.checkRiskError ?? 'Could not check node dependencies. Please try again.')
        return
      }

      if (result.data.level === 'safe') {
        removeNode(nodeId)
        const del = await deleteNode({ id: nodeId, confirmed: true })
        if (del.success) toast.success(t?.deleteSuccess ?? 'Node deleted.')
        else toast.error(t?.deleteError ?? 'Could not delete node.')
      } else {
        setDeleteRisk(result.data)
      }
    } finally {
      setIsCheckingDelete(false)
    }
  }, [removeNode, toast, d])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteRisk) return
    const t = d?.board.toast
    setDeleteIsPending(true)
    try {
      removeNode(deleteRisk.entityId)
      const del = await deleteNode({ id: deleteRisk.entityId, confirmed: true })
      if (del.success) toast.success(t?.deleteSuccess ?? 'Node deleted.')
      else toast.error(t?.deleteError ?? 'Could not delete node.')
    } catch {
      toast.error(t?.deleteError ?? 'Could not delete node.')
    } finally {
      setDeleteIsPending(false)
      setDeleteRisk(null)
    }
  }, [deleteRisk, removeNode, toast, d])

  // Connection count per container node (from live connections)
  const connCountMap = liveConnections.reduce<Record<string, number>>((acc, c) => {
    acc[c.sourceNodeId] = (acc[c.sourceNodeId] ?? 0) + 1
    acc[c.targetNodeId] = (acc[c.targetNodeId] ?? 0) + 1
    return acc
  }, {})

  const isEmpty = nodes.length === 0

  return (
    <div
      ref={outerRef}
      role="region"
      aria-label={d?.canvas.ariaLabel ?? 'Node canvas'}
      className="relative flex-1 overflow-hidden bg-bg cursor-grab data-panning:cursor-grabbing"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onContextMenu={onContextMenu}
      onTouchStart={mobileOnTouchStart}
      onTouchMove={mobileOnTouchMove}
      onTouchEnd={mobileOnTouchEnd}
      onClickCapture={onClickCapture}
    >
      {/* Dot-grid background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Scaled + translated canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0 origin-center canvas-layer"
        style={{ transform: 'translate(0px, 0px) scale(1)' }}
      >
        {nodes.map((node) => (
          <div
            key={node.id}
            data-nodeid={node.id}
            data-nodetype={node.type}
            className="absolute cursor-move"
            style={{ left: node.positionX, top: node.positionY }}
          >
            <NodeCard
              node={node}
              selected={selectedNodeId === node.id}
              isValidTarget={drag.isDragging && node.type === 'container' && node.id !== drag.originNodeId}
              connectionCount={connCountMap[node.id] ?? 0}
              onSelect={selectNode}
              onPortDragStart={node.type === 'container' ? handlePortDragStart : undefined}
              onEditField={node.type === 'field' ? openFieldEdit : undefined}
              showPorts={mobileHoveredNodeId === node.id}
            />
          </div>
        ))}

        {/* SVG connection overlay — inside canvas so it transforms with nodes */}
        <ConnectionLayer
          ref={connectionLayerRef}
          nodes={nodes}
          connections={liveConnections}
          containerRef={outerRef}
          onDeleteConnection={removeConnection}
          onChangeConnectionType={changeConnectionType}
        />
      </div>

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="font-mono text-base text-text/70">{d?.canvas.empty ?? 'No nodes yet.'}</span>
          <span className="font-mono text-sm text-muted">{d?.canvas.emptyHint ?? 'Use + to create your first container.'}</span>
        </div>
      )}

      {editingFieldId && (
        <FieldEditPanel isStorageConfigured={isStorageConfigured} />
      )}

      {canvasMenu && (
        <CanvasContextMenu
          menu={canvasMenu}
          onFitAll={handleFitAll}
          onClose={() => setCanvasMenu(null)}
          d={d?.board.canvasMenu as CanvasContextMenuDict | undefined}
        />
      )}

      {contextMenu && (
        <BoardContextMenu
          menu={contextMenu}
          onRename={(nodeId) => setRenameNodeId(nodeId)}
          onDuplicate={handleDuplicate}
          onDelete={handleDeleteNode}
          onClose={() => setContextMenu(null)}
          d={d?.board.contextMenu}
        />
      )}

      {renameNodeId && (() => {
        const node = nodes.find((n) => n.id === renameNodeId)
        if (!node) return null
        return (
          <RenameNodeDialog
            currentName={node.name}
            onConfirm={(newName) => handleRename(renameNodeId, newName)}
            onCancel={() => setRenameNodeId(null)}
            d={d?.board.renameDialog as RenameNodeDialogDict | undefined}
          />
        )
      })()}

      {deleteRisk && (
        <DeleteConfirmDialog
          risk={deleteRisk}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteRisk(null)}
          isPending={deleteIsPending}
          d={d?.board.deleteDialog as DeleteDialogDict | undefined}
        />
      )}

      {isCheckingDelete && <FullscreenLoader />}

      {deleteIsPending && <FullscreenLoader />}
    </div>
  )
}

