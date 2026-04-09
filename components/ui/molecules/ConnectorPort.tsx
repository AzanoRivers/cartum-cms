'use client'

import type { PortSide } from '@/types/nodes'

// Outer tap-zone position: centered on each edge of the card.
// Using h-8 w-8 (32px) invisible container for a comfortable touch target,
// while the visual dot remains 10px via the inner span.
const POSITION_CLASSES: Record<PortSide, string> = {
  top:    'top-[-16px] left-1/2 -translate-x-1/2',
  right:  'right-[-16px] top-1/2 -translate-y-1/2',
  bottom: 'bottom-[-16px] left-1/2 -translate-x-1/2',
  left:   'left-[-16px]  top-1/2 -translate-y-1/2',
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
    /**
     * Outer div: invisible 32×32px tap zone with data attributes.
     * - data-port / data-portside / data-portnodeid are read by the gesture hook
     *   (useMobileNodeGestures) via closest('[data-portside]') on touchstart.
     * - NO onTouchStart here: we intentionally let the event bubble up to
     *   InfiniteCanvas so the gesture hook can detect it and enter 'dragging-port' phase.
     * - onMouseDown is kept for desktop drag start.
     */
    <div
      data-port
      data-portside={side}
      data-portnodeid={nodeId}
      className={[
        'absolute z-10 flex h-8 w-8 items-center justify-center',
        'cursor-crosshair',
        POSITION_CLASSES[side],
      ].join(' ')}
      onMouseDown={(e) => {
        e.stopPropagation()  // prevent canvas pan (desktop only)
        e.preventDefault()   // prevent text selection
        onDragStart(nodeId, side)
      }}
      onClick={(e) => e.stopPropagation()}  // prevent card navigation
    >
      {/* Visual dot — small, centered inside the tap zone */}
      <span
        className={[
          'block h-2.5 w-2.5 rounded-full bg-accent border border-bg',
          'transition-all duration-150',
          alwaysVisible
            ? 'opacity-100 scale-110'
            : 'opacity-0 group-hover:opacity-100 group-hover:scale-125',
        ].join(' ')}
      />
    </div>
  )
}
