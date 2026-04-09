'use client'

import type { PortSide } from '@/types/nodes'

const POSITION_CLASSES: Record<PortSide, string> = {
  top:    'top-[-5px] left-1/2 -translate-x-1/2',
  right:  'right-[-5px] top-1/2 -translate-y-1/2',
  bottom: 'bottom-[-5px] left-1/2 -translate-x-1/2',
  left:   'left-[-5px]  top-1/2 -translate-y-1/2',
}

export type ConnectorPortProps = {
  nodeId: string
  side: PortSide
  onDragStart: (nodeId: string, side: PortSide) => void
  /** Forces the port to be visible regardless of hover state (used for mobile selected node). */
  alwaysVisible?: boolean
}

export function ConnectorPort({ nodeId, side, onDragStart, alwaysVisible = false }: ConnectorPortProps) {
  return (
    <div
      data-port
      data-portside={side}
      data-portnodeid={nodeId}
      className={[
        'absolute z-10 h-2.5 w-2.5 rounded-full bg-accent border border-bg',
        alwaysVisible
          ? 'opacity-100 scale-110'
          : 'opacity-0 group-hover:opacity-100 hover:opacity-100 hover:scale-125',
        'cursor-crosshair transition-all duration-150',
        POSITION_CLASSES[side],
      ].join(' ')}
      onMouseDown={(e) => {
        e.stopPropagation()  // prevent canvas pan
        e.preventDefault()   // prevent text selection
        onDragStart(nodeId, side)
      }}
      onTouchStart={(e) => {
        // Touch drag on port is handled by InfiniteCanvas's touch handler
        // which reads data-portside / data-portnodeid. We only stop propagation
        // to prevent the parent NodeCard/canvas from starting a pan.
        e.stopPropagation()
      }}
      onClick={(e) => e.stopPropagation()}  // prevent card navigation
    />
  )
}
