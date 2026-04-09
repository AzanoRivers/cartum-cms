'use client'

/**
 * useMobileNodeGestures
 *
 * Handles all touch interactions on the InfiniteCanvas for mobile devices:
 *
 * • Single tap on node   → select it (ports become visible)
 * • Double tap on node   → navigate / open node  (container → route, field → field edit)
 * • Long press on node   → start dragging the node  (haptic feedback if available)
 * • Drag on port dot     → draw a connection arrow   (same UX as desktop)
 * • Drag on canvas bg    → pan the canvas
 * • Two-finger pinch     → zoom
 * • Long press on canvas → canvas context menu
 *
 * The hook manages a phase state-machine entirely via refs so no React state
 * changes occur during active gestures (zero re-renders while panning/dragging).
 * The only React state it exposes is `mobileHoveredNodeId` – the node whose
 * ports should be shown.
 */

import { useRef, useState, useCallback } from 'react'
import type { RefObject } from 'react'
import { useNodeBoardStore } from '@/lib/stores/nodeBoardStore'
import type { PortSide } from '@/types/nodes'

// ── Constants ─────────────────────────────────────────────────────────────────

const LONG_PRESS_MS   = 480   // ms before long-press activates
const DOUBLE_TAP_MS   = 300   // ms window for double-tap detection
const MOVE_THRESHOLD  = 8     // px movement that cancels long-press / tap
const MIN_SCALE       = 0.3
const MAX_SCALE       = 2.0

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | 'idle'
  | 'pressing-node'   // finger down on node, waiting for resolution
  | 'dragging-node'   // long-press fired, finger is moving node
  | 'dragging-port'   // finger started on a port, dragging connection line
  | 'panning'         // finger on canvas background
  | 'pinching'        // two-finger pinch

export type MobileGestureCallbacks = {
  /** Bounding-rect source for canvas-space coordinate conversion. */
  outerRef: RefObject<HTMLDivElement | null>
  /** Called when persistent position should be saved to DB. */
  onNodeDragEnd: (nodeId: string, finalX: number, finalY: number) => void
  /** Called on single tap – select the node in the store. */
  onNodeTap: (nodeId: string) => void
  /** Called on double tap – navigate into container or open field edit. */
  onNodeDoubleTap: (nodeId: string) => void
  /** Start drawing a connection line from the given port. */
  onPortDragStart: (nodeId: string, side: PortSide) => void
  /** Update the in-progress drag-line position. */
  onPortDragMove: (clientX: number, clientY: number) => void
  /** Finish or cancel the connection drag (uses document.elementFromPoint). */
  onPortDragEnd: (clientX: number, clientY: number) => void
  /** Open the canvas context menu (long-press on empty canvas area). */
  onCanvasLongPress: (x: number, y: number) => void
  /** Write nodeId into the suppress-click ref so the synthetic click is eaten. */
  suppressClick: (nodeId: string) => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMobileNodeGestures(cb: MobileGestureCallbacks) {
  // The only React state: which node shows its connection ports on mobile.
  const [mobileHoveredNodeId, setMobileHoveredNodeId] = useState<string | null>(null)

  // ── Phase ref (synchronous, no renders) ───────────────────────────────────
  const phaseRef = useRef<Phase>('idle')

  // ── Long-press timer ────────────────────────────────────────────────────────
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Double-tap detection ────────────────────────────────────────────────────
  const lastTapRef = useRef<{ nodeId: string; time: number } | null>(null)

  // ── Node drag state ─────────────────────────────────────────────────────────
  const nodeDragRef = useRef<{
    nodeId:     string
    startX:     number       // touch.clientX at drag start
    startY:     number       // touch.clientY at drag start
    startNodeX: number       // node.positionX at drag start
    startNodeY: number       // node.positionY at drag start
    wrapperEl:  HTMLElement  // the data-nodeid wrapper element
  } | null>(null)

  // ── Pressing-node state (needed when tap resolves in touchend) ──────────────
  const pressingRef = useRef<{
    nodeId:    string
    wrapperEl: HTMLElement
    startX:    number
    startY:    number
  } | null>(null)

  // ── Pan & pinch state ───────────────────────────────────────────────────────
  const panLastRef   = useRef<{ x: number; y: number } | null>(null)
  const pinchDistRef = useRef<number | null>(null)

  /**
   * Exposed to InfiniteCanvas – the imperative non-passive touchmove listener
   * reads this to decide whether to call e.preventDefault() and block native scroll.
   */
  const shouldPreventScrollRef = useRef(false)

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const cancelTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const clientToCanvasPos = useCallback((clientX: number, clientY: number) => {
    const rect = cb.outerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const { offsetX, offsetY, scale } = useNodeBoardStore.getState()
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top  - offsetY) / scale,
    }
  }, [cb.outerRef])

  // ── onTouchStart ──────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Two fingers → enter pinch-to-zoom, cancel any active single-touch action
    if (e.touches.length === 2) {
      cancelTimer()
      phaseRef.current = 'pinching'
      shouldPreventScrollRef.current = true
      const t1 = e.touches[0], t2 = e.touches[1]
      pinchDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      return
    }

    if (e.touches.length !== 1) return
    const touch = e.touches[0]

    // ── Port detection (must be checked before node) ───────────────────────
    // ConnectorPort stops propagation; but we also check here for robustness.
    const portEl = (touch.target as HTMLElement).closest('[data-portside]') as HTMLElement | null
    if (portEl) {
      const nodeId = (portEl.dataset.portnodeid ?? portEl.closest('[data-nodeid]')?.getAttribute('data-nodeid')) ?? null
      const side   = portEl.dataset.portside as PortSide | undefined
      if (nodeId && side) {
        phaseRef.current = 'dragging-port'
        shouldPreventScrollRef.current = true
        cb.onPortDragStart(nodeId, side)
      }
      return
    }

    // ── Node detection ────────────────────────────────────────────────────
    const nodeEl = (touch.target as HTMLElement).closest('[data-nodeid]') as HTMLElement | null
    if (nodeEl) {
      const nodeId = nodeEl.dataset.nodeid!
      const node   = useNodeBoardStore.getState().nodes.find((n) => n.id === nodeId)
      if (!node) return

      phaseRef.current = 'pressing-node'
      shouldPreventScrollRef.current = false  // not yet confirmed as drag
      panLastRef.current = { x: touch.clientX, y: touch.clientY }
      pressingRef.current = {
        nodeId,
        wrapperEl: nodeEl,
        startX:    touch.clientX,
        startY:    touch.clientY,
      }

      // Long-press timer → start node drag
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null
        if (phaseRef.current !== 'pressing-node') return

        phaseRef.current = 'dragging-node'
        shouldPreventScrollRef.current = true

        nodeDragRef.current = {
          nodeId,
          startX:     pressingRef.current!.startX,
          startY:     pressingRef.current!.startY,
          startNodeX: node.positionX,
          startNodeY: node.positionY,
          wrapperEl:  nodeEl,
        }

        // Haptic feedback (supported on some mobile browsers)
        navigator.vibrate?.(40)

        // Select the node so its style reflects the active drag
        cb.onNodeTap(nodeId)
      }, LONG_PRESS_MS)

      return
    }

    // ── Canvas background → pan ────────────────────────────────────────────
    phaseRef.current = 'panning'
    shouldPreventScrollRef.current = true
    panLastRef.current = { x: touch.clientX, y: touch.clientY }

    // Long-press on empty canvas → context menu
    const capturedX = touch.clientX
    const capturedY = touch.clientY
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null
      if (phaseRef.current !== 'panning') return
      cb.onCanvasLongPress(capturedX, capturedY)
    }, LONG_PRESS_MS)
  }, [cancelTimer, cb, clientToCanvasPos])

  // ── onTouchMove ──────────────────────────────────────────────────────────
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const phase = phaseRef.current

    // Pinch-to-zoom
    if (phase === 'pinching' && e.touches.length === 2 && pinchDistRef.current !== null) {
      const t1 = e.touches[0], t2 = e.touches[1]
      const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const {
        scale: currentScale,
        offsetX: currentOffX,
        offsetY: currentOffY,
        setOffset,
        setScale,
      } = useNodeBoardStore.getState()

      const newScale = Math.min(Math.max(currentScale * (newDist / pinchDistRef.current), MIN_SCALE), MAX_SCALE)

      const rect = cb.outerRef.current?.getBoundingClientRect()
      if (rect) {
        const mx = (t1.clientX + t2.clientX) / 2 - rect.left
        const my = (t1.clientY + t2.clientY) / 2 - rect.top
        const canvasMidX = (mx - currentOffX) / currentScale
        const canvasMidY = (my - currentOffY) / currentScale
        setOffset(mx - canvasMidX * newScale, my - canvasMidY * newScale)
      }

      setScale(newScale)
      pinchDistRef.current = newDist
      return
    }

    if (e.touches.length !== 1) return
    const touch = e.touches[0]

    // Node drag – update wrapper element position directly (zero React re-renders)
    if (phase === 'dragging-node' && nodeDragRef.current) {
      const { startX, startY, startNodeX, startNodeY, wrapperEl } = nodeDragRef.current
      const { scale } = useNodeBoardStore.getState()
      wrapperEl.style.left = `${startNodeX + (touch.clientX - startX) / scale}px`
      wrapperEl.style.top  = `${startNodeY + (touch.clientY - startY) / scale}px`
      return
    }

    // Port connection drag – move the SVG line
    if (phase === 'dragging-port') {
      cb.onPortDragMove(touch.clientX, touch.clientY)
      return
    }

    // Pressing node – check if finger moved far enough to switch to canvas pan
    if (phase === 'pressing-node' && panLastRef.current) {
      const dx = touch.clientX - panLastRef.current.x
      const dy = touch.clientY - panLastRef.current.y
      if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
        // Finger moved before long-press → cancel timer, switch to panning
        cancelTimer()
        phaseRef.current = 'panning'
        shouldPreventScrollRef.current = true
        panLastRef.current = { x: touch.clientX, y: touch.clientY }
        // Fall through to panning branch on next move
      }
      return
    }

    // Canvas pan
    if (phase === 'panning' && panLastRef.current) {
      cancelTimer()   // cancel canvas long-press if still pending
      const dx = touch.clientX - panLastRef.current.x
      const dy = touch.clientY - panLastRef.current.y
      const { offsetX, offsetY, setOffset } = useNodeBoardStore.getState()
      setOffset(offsetX + dx, offsetY + dy)
      panLastRef.current = { x: touch.clientX, y: touch.clientY }
    }
  }, [cancelTimer, cb])

  // ── onTouchEnd ────────────────────────────────────────────────────────────
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const phase = phaseRef.current
    cancelTimer()
    shouldPreventScrollRef.current = false

    // ── Node drag end ──────────────────────────────────────────────────────
    if (phase === 'dragging-node' && nodeDragRef.current) {
      const { nodeId, startX, startY, startNodeX, startNodeY } = nodeDragRef.current
      const touch   = e.changedTouches[0]
      const { scale, updateNodePositionOptimistic } = useNodeBoardStore.getState()
      const finalX  = startNodeX + (touch.clientX - startX) / scale
      const finalY  = startNodeY + (touch.clientY - startY) / scale

      // Optimistic store update (re-syncs React state with the DOM position we've been setting)
      updateNodePositionOptimistic(nodeId, finalX, finalY)
      // Persist to DB (fire-and-forget)
      cb.onNodeDragEnd(nodeId, finalX, finalY)

      nodeDragRef.current = null
      pressingRef.current = null
      phaseRef.current    = 'idle'
      return
    }

    // ── Port connection drag end ───────────────────────────────────────────
    if (phase === 'dragging-port') {
      const touch = e.changedTouches[0]
      cb.onPortDragEnd(touch.clientX, touch.clientY)
      phaseRef.current = 'idle'
      return
    }

    // ── Tap on node (no long-press, no significant movement) ───────────────
    if (phase === 'pressing-node' && pressingRef.current) {
      const { nodeId } = pressingRef.current
      const now        = Date.now()
      const lastTap    = lastTapRef.current

      if (lastTap && lastTap.nodeId === nodeId && now - lastTap.time < DOUBLE_TAP_MS) {
        // ── Double tap → navigate / open ────────────────────────────────
        lastTapRef.current = null
        cb.suppressClick(nodeId)
        cb.onNodeDoubleTap(nodeId)
        setMobileHoveredNodeId(null)
      } else {
        // ── Single tap → select and show ports ──────────────────────────
        lastTapRef.current = { nodeId, time: now }
        cb.suppressClick(nodeId)
        cb.onNodeTap(nodeId)
        setMobileHoveredNodeId(nodeId)
      }

      pressingRef.current = null
      phaseRef.current    = 'idle'
      panLastRef.current  = null
      return
    }

    // ── Canvas background tap / pan end ────────────────────────────────────
    if (phase === 'panning') {
      // Tapping the canvas bg deselects the mobile-hovered node
      setMobileHoveredNodeId(null)
    }

    phaseRef.current   = 'idle'
    panLastRef.current = null
    pinchDistRef.current = null
  }, [cancelTimer, cb])

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    mobileHoveredNodeId,
    setMobileHoveredNodeId,
    /** Read by InfiniteCanvas's non-passive touchmove listener to call e.preventDefault(). */
    shouldPreventScrollRef,
  }
}
