'use client'

import { useId, useRef, useState } from 'react'
import type { TooltipSide } from '@/types/ui'

const SIDE_CLASSES: Record<TooltipSide, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
}

export type TooltipProps = {
  content: string
  side?: TooltipSide
  children: React.ReactNode
}

export function Tooltip({ content, side = 'top', children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const tooltipId = useId()
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setVisible(true)
  }
  const hide = () => {
    hideTimer.current = setTimeout(() => setVisible(false), 80)
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <span
        id={tooltipId}
        role="tooltip"
        aria-hidden={!visible}
        className={[
          'absolute z-50 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs text-text shadow-lg pointer-events-none',
          'transition-opacity duration-[--dur-fast]',
          SIDE_CLASSES[side],
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        {content}
      </span>
    </span>
  )
}
