'use client'

import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { throttle } from '@/lib/utils/throttle'
import { NodeCard } from '@/components/ui/molecules/NodeCard'
import { ConnectionLayer } from '@/components/ui/organisms/ConnectionLayer'
import { FieldEditPanel } from '@/components/ui/organisms/FieldEditPanel'
import { BoardContextMenu } from '@/components/ui/molecules/BoardContextMenu'
import { CanvasContextMenu } from '@/components/ui/molecules/CanvasContextMenu'
import { MultiSelectionContextMenu } from '@/components/ui/molecules/MultiSelectionContextMenu'
import { MarqueeRect } from '@/components/ui/atoms/MarqueeRect'
import { Spinner } from '@/components/ui/atoms/Spinner'
import type { ConnectionLayerHandle } from '@/components/ui/organisms/ConnectionLayer'
import type { BoardContextMenuState } from '@/components/ui/molecules/BoardContextMenu'
import type { CanvasContextMenuState, CanvasContextMenuDict } from '@/components/ui/molecules/CanvasContextMenu'
import type { MultiSelectionContextMenuState } from '@/components/ui/molecules/MultiSelectionContextMenu'
import { useNodeBoardStore } from '@/lib/stores/nodeBoardStore'
import { useUIStore } from '@/lib/stores/uiStore'
import { useConnections } from '@/lib/hooks/useConnections'
import { useMobileNodeGestures } from '@/lib/hooks/useMobileNodeGestures'
import { updateNodePosition, deleteNode, deleteNodes, createContainerNode, createFieldNode, renameNode } from '@/lib/actions/nodes.actions'
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
  return {
    scale,
    offsetX: scale * (w / 2 - minX) - contentW / 2,
    offsetY: scale * (h / 2 - minY) - contentH / 2,
  }
}

// ── Rect intersection (canvas-space) ─────────────────────────────────────────
function rectsIntersect(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
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
  const marqueeRef = useRef<HTMLDivElement>(null)
  const connectionLayerRef = useRef<ConnectionLayerHandle>(null)

  const isPanning     = useRef(false)
  const lastPos       = useRef({ x: 0, y: 0 })
  const dragOriginRef = useRef<{ side: PortSide } | null>(null)

  // Card drag state — zero React renders during drag
  const cardDragRef = useRef<{
    nodeId:      string
    isMulti:     boolean
    startMouseX: number
    startMouseY: number
    startNodeX:  number
    startNodeY:  number
    // Multi-drag: all selected nodes with their starting positions and DOM elements
    multiNodes?: Array<{ id: string; startX: number; startY: number; el: HTMLElement }>
    moved:       boolean
    wrapperEl:   HTMLElement | null
  } | null>(null)

  const suppressClickRef = useRef<string | null>(null)

  // Marquee selection state — all via refs/direct DOM for zero re-renders during drag
  const isMarqueeRef    = useRef(false)
  const marqueeStartRef = useRef({ x: 0, y: 0 })

  // Right-click drag tracking — suppresses context menu when right-drag activated marquee
  const rightDragMovedRef = useRef(false)

  const setNodes       = useNodeBoardStore((s) => s.setNodes)
  const nodes          = useNodeBoardStore((s) => s.nodes)
  const addNode        = useNodeBoardStore((s) => s.addNode)
  const removeNode     = useNodeBoardStore((s) => s.removeNode)
  const removeNodes    = useNodeBoardStore((s) => s.removeNodes)
  const selectedNodeIds     = useNodeBoardStore((s) => s.selectedNodeIds)
  const selectNode          = useNodeBoardStore((s) => s.selectNode)
  const setSelectedNodeIds  = useNodeBoardStore((s) => s.setSelectedNodeIds)
  const toggleNodeSelection = useNodeBoardStore((s) => s.toggleNodeSelection)
  const clearSelection      = useNodeBoardStore((s) => s.clearSelection)
  const setOffset      = useNodeBoardStore((s) => s.setOffset)
  const setScale       = useNodeBoardStore((s) => s.setScale)
  const setCanvasDimensions = useNodeBoardStore((s) => s.setCanvasDimensions)
  const updateNodePositionOptimistic = useNodeBoardStore((s) => s.updateNodePositionOptimistic)

  const [contextMenu,      setContextMenu]      = useState<BoardContextMenuState | null>(null)
  const [canvasMenu,       setCanvasMenu]       = useState<CanvasContextMenuState | null>(null)
  const [multiMenu,        setMultiMenu]        = useState<MultiSelectionContextMenuState | null>(null)
  const [renameNodeId,     setRenameNodeId]     = useState<string | null>(null)
  const [deleteRisk,       setDeleteRisk]       = useState<DeletionRisk | null>(null)
  const [deleteIsPending,  setDeleteIsPending]  = useState(false)
  const [isCheckingDelete, setIsCheckingDelete] = useState(false)
  const [boardReady,       setBoardReady]       = useState(false)

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

  // ── Bootstrap: seed store, fit view ───────────────────────────────────────
  useEffect(() => {
    setNodes(initialNodes)
    setBoardReady(true)

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

    let frame2: number
    const frame1 = requestAnimationFrame(() => { frame2 = requestAnimationFrame(doFit) })

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

  // Subscribe offset/scale → direct DOM (zero React re-renders on pan)
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

  // Track canvas container dimensions
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const update = () => setCanvasDimensions(el.clientWidth, el.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [setCanvasDimensions])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignore if focus is in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return

      if (e.key === 'Escape') {
        clearSelection()
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        const { selectedNodeIds: ids } = useNodeBoardStore.getState()
        if (ids.length === 0) return
        e.preventDefault()
        if (ids.length === 1) {
          handleDeleteNode(ids[0])
        } else {
          handleDeleteMultiple(ids)
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSelection])

  // ── Canvas-space coordinate conversion ─────────────────────────────────────
  function clientToCanvas(clientX: number, clientY: number) {
    const rect = outerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const { offsetX, offsetY, scale } = useNodeBoardStore.getState()
    const cx = rect.width  / 2
    const cy = rect.height / 2
    return {
      x: (clientX - rect.left - cx - offsetX) / scale + cx,
      y: (clientY - rect.top  - cy - offsetY) / scale + cy,
    }
  }

  // ── Marquee helpers ─────────────────────────────────────────────────────────
  function showMarquee(x: number, y: number, w: number, h: number) {
    const el = marqueeRef.current
    if (!el) return
    el.style.display = 'block'
    el.style.left    = `${x}px`
    el.style.top     = `${y}px`
    el.style.width   = `${w}px`
    el.style.height  = `${h}px`
  }

  function hideMarquee() {
    const el = marqueeRef.current
    if (!el) return
    el.style.display = 'none'
    outerRef.current?.removeAttribute('data-marquee')
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
    if ((e.target as HTMLElement).closest('[data-port]')) return

    const nodeEl = (e.target as HTMLElement).closest('[data-nodeid]') as HTMLElement | null

    if (nodeEl) {
      const nodeId = nodeEl.dataset.nodeid!
      const node   = useNodeBoardStore.getState().nodes.find((n) => n.id === nodeId)
      if (!node) return

      // Ctrl/Meta + click → toggle this node in/out of multi-selection
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault()
        toggleNodeSelection(nodeId)
        return
      }

      const { selectedNodeIds: currentSelected } = useNodeBoardStore.getState()
      const isInMultiSelection = currentSelected.length > 1 && currentSelected.includes(nodeId)

      if (isInMultiSelection) {
        // Start multi-drag: collect all selected nodes' starting positions and DOM elements
        const multiNodes = currentSelected.flatMap((id) => {
          const n = useNodeBoardStore.getState().nodes.find((x) => x.id === id)
          const el = outerRef.current?.querySelector(`[data-nodeid="${id}"]`) as HTMLElement | null
          if (!n || !el) return []
          return [{ id, startX: n.positionX, startY: n.positionY, el }]
        })
        cardDragRef.current = {
          nodeId,
          isMulti:    true,
          startMouseX: e.clientX,
          startMouseY: e.clientY,
          startNodeX: node.positionX,
          startNodeY: node.positionY,
          wrapperEl:  nodeEl,
          moved:      false,
          multiNodes,
        }
      } else {
        // Normal single drag — if clicking a non-selected node, select only it
        if (!currentSelected.includes(nodeId)) {
          selectNode(nodeId)
        }
        cardDragRef.current = {
          nodeId,
          isMulti:    false,
          startMouseX: e.clientX,
          startMouseY: e.clientY,
          startNodeX: node.positionX,
          startNodeY: node.positionY,
          wrapperEl:  nodeEl,
          moved:      false,
        }
      }
      return
    }

    // Block while panel/modal open
    const { settingsOpen, editingFieldId } = useUIStore.getState()
    if (settingsOpen || editingFieldId) return

    // Left-click drag on background → pan (original behavior)
    if (e.button === 0) {
      isPanning.current = true
      lastPos.current = { x: e.clientX, y: e.clientY }
      e.currentTarget.setAttribute('data-panning', '1')
      return
    }

    // Right-click drag on background → marquee selection
    // (quick right-click without drag shows context menu via onContextMenu)
    if (e.button === 2) {
      e.preventDefault() // prevents browser native drag behavior on images/links
      const outerRect = outerRef.current?.getBoundingClientRect()
      if (!outerRect) return
      marqueeStartRef.current = {
        x: e.clientX - outerRect.left,
        y: e.clientY - outerRect.top,
      }
      rightDragMovedRef.current = false
      isMarqueeRef.current = true
    }
  }, [selectNode, toggleNodeSelection])

  const onMouseMoveRaw = useCallback(
    (e: React.MouseEvent) => {
      // Multi-drag
      if (cardDragRef.current?.isMulti && cardDragRef.current.multiNodes) {
        const { startMouseX, startMouseY, multiNodes } = cardDragRef.current
        const dx = e.clientX - startMouseX
        const dy = e.clientY - startMouseY

        if (!cardDragRef.current.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          cardDragRef.current.moved = true
        }

        if (cardDragRef.current.moved) {
          const { scale } = useNodeBoardStore.getState()
          for (const { startX, startY, el } of multiNodes) {
            el.style.left = `${startX + dx / scale}px`
            el.style.top  = `${startY + dy / scale}px`
          }
        }
        return
      }

      // Single card drag
      if (cardDragRef.current && !cardDragRef.current.isMulti) {
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

      // Connection drag
      if (dragRef.current.isDragging) {
        const canvasPos = clientToCanvas(e.clientX, e.clientY)
        connectionLayerRef.current?.moveDragLine(canvasPos)
        return
      }

      // Pan (ctrl+drag)
      if (isPanning.current) {
        const dx = e.clientX - lastPos.current.x
        const dy = e.clientY - lastPos.current.y
        lastPos.current = { x: e.clientX, y: e.clientY }
        const { offsetX, offsetY } = useNodeBoardStore.getState()
        setOffset(offsetX + dx, offsetY + dy)
        return
      }

      // Marquee selection (right-click drag)
      if (!isMarqueeRef.current) return

      const outerRect = outerRef.current?.getBoundingClientRect()
      if (!outerRect) return

      const curX = e.clientX - outerRect.left
      const curY = e.clientY - outerRect.top
      const { x: sx, y: sy } = marqueeStartRef.current
      const dx = curX - sx
      const dy = curY - sy

      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return

      // Mark that right-click dragged → context menu will be suppressed on mouseup
      rightDragMovedRef.current = true
      outerRef.current?.setAttribute('data-marquee', '1')

      const rectX = Math.min(sx, curX)
      const rectY = Math.min(sy, curY)
      const rectW = Math.abs(dx)
      const rectH = Math.abs(dy)

      showMarquee(rectX, rectY, rectW, rectH)

      // Convert marquee corners to canvas-space and check node intersections
      const topLeft     = clientToCanvas(outerRect.left + rectX, outerRect.top + rectY)
      const bottomRight = clientToCanvas(outerRect.left + rectX + rectW, outerRect.top + rectY + rectH)
      const mw = bottomRight.x - topLeft.x
      const mh = bottomRight.y - topLeft.y

      const hit = useNodeBoardStore.getState().nodes
        .filter((n) => rectsIntersect(topLeft.x, topLeft.y, mw, mh, n.positionX, n.positionY, CARD_W, CARD_H))
        .map((n) => n.id)

      setSelectedNodeIds(hit)
    },
    [dragRef, setOffset, setSelectedNodeIds],
  )

  const onMouseMove = useMemo(() => throttle(onMouseMoveRaw, 16), [onMouseMoveRaw])

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // Multi-drag end
      if (cardDragRef.current?.isMulti && cardDragRef.current.multiNodes) {
        const { nodeId: multiNodeId, startMouseX, startMouseY, multiNodes, moved } = cardDragRef.current
        cardDragRef.current = null

        if (moved) {
          const { scale } = useNodeBoardStore.getState()
          const dx = e.clientX - startMouseX
          const dy = e.clientY - startMouseY

          for (const { id, startX, startY } of multiNodes) {
            const finalX = startX + dx / scale
            const finalY = startY + dy / scale
            updateNodePositionOptimistic(id, finalX, finalY)
            updateNodePosition({ id, x: finalX, y: finalY })
          }

          suppressClickRef.current = multiNodeId
        } else {
          // Dry click on a multi-selected node: deselect all, don't open
          suppressClickRef.current = multiNodeId
          clearSelection()
        }
        e.currentTarget.removeAttribute('data-panning')
        return
      }

      // Single card drag end
      if (cardDragRef.current) {
        const { nodeId, startMouseX, startMouseY, startNodeX, startNodeY, moved } = cardDragRef.current
        cardDragRef.current = null

        if (moved) {
          const { scale } = useNodeBoardStore.getState()
          const finalX = startNodeX + (e.clientX - startMouseX) / scale
          const finalY = startNodeY + (e.clientY - startMouseY) / scale
          updateNodePositionOptimistic(nodeId, finalX, finalY)
          updateNodePosition({ id: nodeId, x: finalX, y: finalY })
          suppressClickRef.current = nodeId
        }
        e.currentTarget.removeAttribute('data-panning')
        return
      }

      if (dragRef.current.isDragging) {
        connectionLayerRef.current?.hideDragLine()
        dragOriginRef.current = null
        const targetEl   = (e.target as HTMLElement).closest('[data-nodeid]') as HTMLElement | null
        const targetType = targetEl?.dataset.nodetype
        const targetId   = targetEl?.dataset.nodeid
        if (targetId && targetType === 'container') {
          completeDrag(targetId)
        } else {
          cancelDrag()
        }
        return
      }

      if (isPanning.current) {
        isPanning.current = false
        e.currentTarget.removeAttribute('data-panning')
        return
      }

      if (isMarqueeRef.current) {
        isMarqueeRef.current = false
        hideMarquee()
        // If no nodes selected from marquee, clear selection on click on background
        const { selectedNodeIds: ids } = useNodeBoardStore.getState()
        if (ids.length === 0) clearSelection()
        return
      }
    },
    [dragRef, cancelDrag, completeDrag, updateNodePositionOptimistic, clearSelection],
  )

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (!suppressClickRef.current) return
    const nodeEl = (e.target as HTMLElement).closest('[data-nodeid]') as HTMLElement | null
    if (nodeEl?.dataset.nodeid === suppressClickRef.current) {
      e.stopPropagation()
      suppressClickRef.current = null
    }
  }, [])

  // Click on background without drag → clear selection
  const onClickBackground = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-nodeid]')) return
    if ((e.target as HTMLElement).closest('[data-port]')) return
    clearSelection()
  }, [clearSelection])

  // ── Wheel + touchmove ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault()
      // Ctrl/Meta + wheel = pan horizontally/vertically; plain wheel = zoom
      if (e.ctrlKey || e.metaKey) {
        const { offsetX, offsetY } = useNodeBoardStore.getState()
        setOffset(offsetX - e.deltaX, offsetY - e.deltaY)
      } else {
        const delta = e.deltaY > 0 ? -0.08 : 0.08
        const { scale } = useNodeBoardStore.getState()
        setScale(scale + delta)
      }
    }
    const touchMoveHandler = (e: TouchEvent) => {
      if (shouldPreventScrollRef.current || e.touches.length === 2) e.preventDefault()
    }
    el.addEventListener('wheel', wheelHandler, { passive: false })
    el.addEventListener('touchmove', touchMoveHandler, { passive: false })
    return () => {
      el.removeEventListener('wheel', wheelHandler)
      el.removeEventListener('touchmove', touchMoveHandler)
    }
  }, [setScale, setOffset, shouldPreventScrollRef])

  // ── Context menu ──────────────────────────────────────────────────────────
  const handleFitAll = useCallback(() => {
    const { nodes: currentNodes } = useNodeBoardStore.getState()
    if (!currentNodes.length || !outerRef.current) return
    const { scale, offsetX, offsetY } = computeFitView(outerRef.current.clientWidth, outerRef.current.clientHeight, currentNodes)
    setOffset(offsetX, offsetY)
    setScale(scale)
  }, [setOffset, setScale])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()

    // Right-click was used for marquee drag → suppress context menu
    if (rightDragMovedRef.current) {
      rightDragMovedRef.current = false
      isMarqueeRef.current = false
      hideMarquee()
      return
    }

    // Quick right-click (no drag) → show context menu
    const nodeEl = (e.target as HTMLElement).closest('[data-nodeid]') as HTMLElement | null
    if (!nodeEl) {
      setCanvasMenu({ x: e.clientX, y: e.clientY })
      return
    }
    const nodeId   = nodeEl.dataset.nodeid!
    const nodeType = (nodeEl.dataset.nodetype ?? 'container') as 'container' | 'field'

    // Right-click on a multi-selected node → multi-selection context menu
    const { selectedNodeIds: ids } = useNodeBoardStore.getState()
    if (ids.length > 1 && ids.includes(nodeId)) {
      setMultiMenu({ x: e.clientX, y: e.clientY, count: ids.length })
      return
    }

    // Single node context menu
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId, nodeType })
  }, [])

  // ── Context menu actions ──────────────────────────────────────────────────
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
    setNodes(useNodeBoardStore.getState().nodes.map((n) =>
      n.id === nodeId ? { ...n, name: newName } : n
    ))
    const result = await renameNode({ id: nodeId, name: newName })
    if (result.success) {
      toast.success(t?.renameSuccess ?? 'Node renamed.')
    } else {
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
      setDeleteRisk(result.data)
    } finally {
      setIsCheckingDelete(false)
    }
  }, [toast, d])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteRisk) return
    const t = d?.board.toast
    const isField = useNodeBoardStore.getState().nodes.find((n) => n.id === deleteRisk.entityId)?.type === 'field'
    setDeleteIsPending(true)
    try {
      removeNode(deleteRisk.entityId)
      const del = await deleteNode({ id: deleteRisk.entityId, confirmed: true })
      if (del.success) toast.success(isField ? (t?.deleteFieldSuccess ?? 'Card deleted.') : (t?.deleteSuccess ?? 'Deck deleted.'))
      else toast.error(isField ? (t?.deleteFieldError ?? 'Could not delete card.') : (t?.deleteError ?? 'Could not delete deck.'))
    } catch {
      toast.error(isField ? (t?.deleteFieldError ?? 'Could not delete card.') : (t?.deleteError ?? 'Could not delete deck.'))
    } finally {
      setDeleteIsPending(false)
      setDeleteRisk(null)
    }
  }, [deleteRisk, removeNode, toast, d])

  const handleDeleteMultiple = useCallback(async (ids: string[]) => {
    const t = d?.board.toast
    setDeleteIsPending(true)
    try {
      removeNodes(ids)
      clearSelection()
      const result = await deleteNodes({ ids })
      if (result.success) toast.success(`${ids.length} items deleted.`)
      else toast.error(result.error ?? 'Could not delete selected items.')
    } catch {
      toast.error('Could not delete selected items.')
    } finally {
      setDeleteIsPending(false)
    }
  }, [removeNodes, clearSelection, toast, d])

  // Connection count per container node
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
      className="relative flex-1 overflow-hidden bg-bg cursor-grab data-panning:cursor-grabbing data-marquee:cursor-crosshair"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onContextMenu={onContextMenu}
      onClick={onClickBackground}
      onDragStart={(e) => e.preventDefault()}
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
        {nodes.map((node) => {
          const isSingleSelected = selectedNodeIds.length === 1 && selectedNodeIds[0] === node.id
          const isMultiSelected  = selectedNodeIds.length > 1  && selectedNodeIds.includes(node.id)
          return (
            <div
              key={node.id}
              data-nodeid={node.id}
              data-nodetype={node.type}
              className="absolute cursor-move"
              style={{ left: node.positionX, top: node.positionY }}
            >
              <NodeCard
                node={node}
                selected={isSingleSelected}
                multiSelected={isMultiSelected}
                isValidTarget={drag.isDragging && node.type === 'container' && node.id !== drag.originNodeId}
                connectionCount={connCountMap[node.id] ?? 0}
                onSelect={selectNode}
                onPortDragStart={node.type === 'container' ? handlePortDragStart : undefined}
                onEditField={node.type === 'field' ? openFieldEdit : undefined}
                showPorts={mobileHoveredNodeId === node.id}
              />
            </div>
          )
        })}

        {/* SVG connection overlay */}
        <ConnectionLayer
          ref={connectionLayerRef}
          nodes={nodes}
          connections={liveConnections}
          containerRef={outerRef}
          onDeleteConnection={removeConnection}
          onChangeConnectionType={changeConnectionType}
        />
      </div>

      {/* Marquee selection box — screen-space, outside canvas */}
      <MarqueeRect ref={marqueeRef} />

      {/* Multi-selection badge (shows count when > 1 selected) */}
      {selectedNodeIds.length > 1 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-accent/40 bg-surface px-3 py-1.5 shadow-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-xs text-accent">
            {selectedNodeIds.length} {d?.canvas.multiSelected} · {d?.canvas.multiSelectedHint}
          </span>
        </div>
      )}

      {!boardReady && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Spinner color="muted" className="h-9 w-9" />
        </div>
      )}

      {boardReady && isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="font-mono text-base text-text/70">{d?.canvas.empty ?? 'No nodes yet.'}</span>
          <span className="font-mono text-sm text-muted">{d?.canvas.emptyHint ?? 'Use + to create your first container.'}</span>
        </div>
      )}

      {editingFieldId && (
        <FieldEditPanel key={editingFieldId} isStorageConfigured={isStorageConfigured} />
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

      {multiMenu && (
        <MultiSelectionContextMenu
          menu={multiMenu}
          onDeleteAll={() => {
            const { selectedNodeIds: ids } = useNodeBoardStore.getState()
            handleDeleteMultiple(ids)
          }}
          onDeselectAll={clearSelection}
          onClose={() => setMultiMenu(null)}
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
      {deleteIsPending  && <FullscreenLoader />}
    </div>
  )
}
