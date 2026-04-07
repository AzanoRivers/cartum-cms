'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useNodeBoardStore } from '@/lib/stores/nodeBoardStore'
import type { AnyNode, NodeConnection, PortSide, Position, RelationType } from '@/types/nodes'

// ── Card geometry constants ───────────────────────────────────────────────────
const CARD_W = 208   // min-w-52 = 13rem = 208px
const CARD_H = 80    // approximate container card height
const CTRL  = 80     // bezier control point distance

const SIDES: PortSide[] = ['top', 'right', 'bottom', 'left']

const CTRL_OFFSET: Record<PortSide, Position> = {
  top:    { x: 0,     y: -CTRL },
  right:  { x: CTRL,  y: 0 },
  bottom: { x: 0,     y: CTRL },
  left:   { x: -CTRL, y: 0 },
}

const OPPOSITE: Record<PortSide, PortSide> = {
  top: 'bottom', bottom: 'top', left: 'right', right: 'left',
}

function getPortPos(node: AnyNode, side: PortSide): Position {
  const { positionX: x, positionY: y } = node
  if (side === 'top')    return { x: x + CARD_W / 2, y }
  if (side === 'right')  return { x: x + CARD_W,     y: y + CARD_H / 2 }
  if (side === 'bottom') return { x: x + CARD_W / 2, y: y + CARD_H }
  return                        { x,                  y: y + CARD_H / 2 }
}

function calcBezierPath(from: Position, fromSide: PortSide, to: Position, toSide: PortSide): string {
  const fc = CTRL_OFFSET[fromSide]
  const tc = CTRL_OFFSET[toSide]
  return (
    `M ${from.x} ${from.y} ` +
    `C ${from.x + fc.x} ${from.y + fc.y}, ` +
    `${to.x + tc.x} ${to.y + tc.y}, ` +
    `${to.x} ${to.y}`
  )
}

function getBestPorts(src: AnyNode, tgt: AnyNode) {
  let best = Infinity
  let result = {
    from: getPortPos(src, 'right'),
    to: getPortPos(tgt, 'left'),
    fromSide: 'right' as PortSide,
    toSide: 'left' as PortSide,
  }
  for (const fs of SIDES) {
    for (const ts of SIDES) {
      const fp = getPortPos(src, fs)
      const tp = getPortPos(tgt, ts)
      const d = Math.hypot(fp.x - tp.x, fp.y - tp.y)
      if (d < best) {
        best = d
        result = { from: fp, to: tp, fromSide: fs, toSide: ts }
      }
    }
  }
  return result
}

function isNodeInViewport(
  node: AnyNode,
  offsetX: number,
  offsetY: number,
  scale: number,
  vpW: number,
  vpH: number,
): boolean {
  const sx = node.positionX * scale + offsetX
  const sy = node.positionY * scale + offsetY
  return (
    sx + CARD_W * scale >= 0 &&
    sx <= vpW &&
    sy + CARD_H * scale >= 0 &&
    sy <= vpH
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConnectionLayerHandle {
  showDragLine: (from: Position, fromSide: PortSide) => void
  moveDragLine: (to: Position) => void
  hideDragLine: () => void
}

export type ConnectionLayerProps = {
  nodes: AnyNode[]
  connections: NodeConnection[]
  containerRef: React.RefObject<HTMLDivElement | null>
  onDeleteConnection: (id: string) => void
  onChangeConnectionType: (id: string, relationType: RelationType) => void
}

// ── PermanentLine ─────────────────────────────────────────────────────────────

interface PermanentLineProps {
  connection: NodeConnection
  nodes: Map<string, AnyNode>
  onDelete: (id: string) => void
  onChangeType: (id: string, relationType: RelationType) => void
}

function PermanentLine({ connection, nodes, onDelete, onChangeType }: PermanentLineProps) {
  const [hovered,      setHovered]      = useState(false)
  const [open,         setOpen]         = useState(false)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const pillRef = useRef<HTMLDivElement>(null)

  // Close pill on outside click
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSelectorOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true })
  }, [open])

  const src = nodes.get(connection.sourceNodeId)
  const tgt = nodes.get(connection.targetNodeId)
  if (!src || !tgt) return null

  const { from, to, fromSide, toSide } = getBestPorts(src, tgt)
  const path = calcBezierPath(from, fromSide, to, toSide)
  const mid: Position = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }

  return (
    <g>
      {/* Invisible thick hit area */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); setSelectorOpen(false) }}
      />
      {/* Visible bezier */}
      <path
        d={path}
        fill="none"
        stroke="var(--color-primary)"
        strokeOpacity={(hovered || open) ? 1 : 0.25}
        strokeWidth={(hovered || open) ? 3 : 2.5}
        markerEnd="url(#arrowhead)"
        strokeLinecap="round"
        style={{ pointerEvents: 'none', transition: 'stroke-opacity 150ms, stroke-width 150ms' }}
      />

      {/* Midpoint controls — show when open */}
      {open && (
        <foreignObject
          x={mid.x - 56}
          y={mid.y - 16}
          width={112}
          height={selectorOpen ? 100 : 32}
          style={{ pointerEvents: 'all', overflow: 'visible' }}
        >
          <div ref={pillRef} className="flex flex-col items-center">
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 font-mono shadow-xl pointer-events-auto">
              <button
                onClick={() => setSelectorOpen((v) => !v)}
                className="text-xs text-text hover:text-primary transition-colors cursor-pointer leading-none"
              >
                {connection.relationType}
              </button>
              <span className="text-border/60 select-none text-xs">·</span>
              <button
                onClick={() => onDelete(connection.id)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-danger/15 text-danger hover:bg-danger hover:text-white transition-all cursor-pointer"
                aria-label="Remove connection"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>

            {selectorOpen && (
              <div className="mt-1 flex flex-col rounded-lg border border-border bg-surface shadow-lg overflow-hidden pointer-events-auto">
                {(['1:1', '1:n', 'n:m'] as RelationType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => { onChangeType(connection.id, type); setSelectorOpen(false) }}
                    className={[
                      'px-3 py-1.5 text-left text-xs font-mono hover:bg-surface-2 transition-colors cursor-pointer',
                      connection.relationType === type ? 'text-primary' : 'text-text',
                    ].join(' ')}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  )
}

// ── ConnectionLayer ───────────────────────────────────────────────────────────

export const ConnectionLayer = forwardRef<ConnectionLayerHandle, ConnectionLayerProps>(
  function ConnectionLayer(
    { nodes, connections, containerRef, onDeleteConnection, onChangeConnectionType },
    ref,
  ) {
    // Subscribe to offset/scale for viewport culling
    const offsetX = useNodeBoardStore((s) => s.offsetX)
    const offsetY = useNodeBoardStore((s) => s.offsetY)
    const scale   = useNodeBoardStore((s) => s.scale)

    // Direct-ref drag line — no React state during mousemove
    const dragPathRef  = useRef<SVGPathElement>(null)
    const dragFromRef  = useRef<Position | null>(null)
    const dragSideRef  = useRef<PortSide>('right')

    useImperativeHandle(ref, () => ({
      showDragLine(from, fromSide) {
        dragFromRef.current = from
        dragSideRef.current = fromSide
        if (dragPathRef.current) {
          dragPathRef.current.setAttribute(
            'd',
            `M ${from.x} ${from.y} L ${from.x} ${from.y}`,
          )
          dragPathRef.current.style.display = 'block'
        }
      },
      moveDragLine(to) {
        if (!dragPathRef.current || !dragFromRef.current) return
        dragPathRef.current.setAttribute(
          'd',
          calcBezierPath(dragFromRef.current, dragSideRef.current, to, OPPOSITE[dragSideRef.current]),
        )
      },
      hideDragLine() {
        dragFromRef.current = null
        if (dragPathRef.current) {
          dragPathRef.current.style.display = 'none'
          dragPathRef.current.setAttribute('d', '')
        }
      },
    }))

    // Viewport culling
    const vpW = containerRef.current?.clientWidth  ?? 1920
    const vpH = containerRef.current?.clientHeight ?? 1080
    const nodeMap = new Map<string, AnyNode>(nodes.map((n) => [n.id, n]))

    const visibleConnections = connections.filter((c) => {
      const src = nodeMap.get(c.sourceNodeId)
      const tgt = nodeMap.get(c.targetNodeId)
      if (!src || !tgt) return false
      return (
        isNodeInViewport(src, offsetX, offsetY, scale, vpW, vpH) ||
        isNodeInViewport(tgt, offsetX, offsetY, scale, vpW, vpH)
      )
    })

    return (
      <svg
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 Z" fill="var(--color-primary)" opacity="0.6" />
          </marker>
        </defs>

        {visibleConnections.map((conn) => (
          <PermanentLine
            key={conn.id}
            connection={conn}
            nodes={nodeMap}
            onDelete={onDeleteConnection}
            onChangeType={onChangeConnectionType}
          />
        ))}

        {/* Drag rope line — driven by ref, hidden by default */}
        <path
          ref={dragPathRef}
          style={{ display: 'none', pointerEvents: 'none' }}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeLinecap="round"
        />
      </svg>
    )
  },
)
