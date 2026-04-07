'use client'

export type PanelDragHandleProps = {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void
  onPointerUp:   (e: React.PointerEvent<HTMLElement>) => void
  label?: string
}

export function PanelDragHandle({
  onPointerDown,
  onPointerMove,
  onPointerUp,
  label = 'Drag to dismiss',
}: PanelDragHandleProps) {
  return (
    <div
      role="button"
      aria-label={label}
      tabIndex={0}
      className="flex h-10 w-full shrink-0 touch-none select-none items-center justify-center cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="h-1 w-10 rounded-full bg-border" />
    </div>
  )
}
