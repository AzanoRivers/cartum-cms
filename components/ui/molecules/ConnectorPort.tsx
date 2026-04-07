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
}

export function ConnectorPort({ nodeId, side, onDragStart }: ConnectorPortProps) {
  return (
    <div
      data-port
      className={[
        'absolute z-10 h-2.5 w-2.5 rounded-full bg-accent border border-bg',
        'opacity-0 group-hover:opacity-100 hover:opacity-100 hover:scale-125',
        'cursor-crosshair transition-all duration-150',
        POSITION_CLASSES[side],
      ].join(' ')}
      onMouseDown={(e) => {
        e.stopPropagation()  // prevent canvas pan
        e.preventDefault()   // prevent text selection
        onDragStart(nodeId, side)
      }}
      onClick={(e) => e.stopPropagation()}  // prevent card navigation
    />
  )
}
