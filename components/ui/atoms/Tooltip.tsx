'use client'

import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { TooltipSide } from '@/types/ui'

const SIDE_CLASSES: Record<TooltipSide, string> = {
  top:        'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom:     'top-full left-1/2 -translate-x-1/2 mt-2',
  left:       'right-full top-1/2 -translate-y-1/2 mr-2',
  right:      'left-full top-1/2 -translate-y-1/2 ml-2',
  // Anchored to the trigger's right edge, growing leftward — for triggers
  // pinned to the screen's right edge, where a centered tooltip gets clamped
  // hard and can end up overflowing off the left instead.
  'bottom-end': 'top-full right-0 mt-2',
}

export type TooltipProps = {
  content: string
  side?: TooltipSide
  children: React.ReactNode
}

const HORIZONTAL_SIDES = new Set<TooltipSide>(['top', 'bottom'])

export function Tooltip({ content, side = 'top', children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [shiftX, setShiftX] = useState(0)
  const tooltipId  = useId()
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setVisible(true)
  }
  const hide = () => {
    hideTimer.current = setTimeout(() => setVisible(false), 80)
  }
  // Touch devices don't fire hover/focus on tap, so a click toggles the
  // tooltip instead — auto-hides after a bit so it never gets stuck open.
  const toggleForTouch = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setVisible((v) => {
      const next = !v
      if (next) hideTimer.current = setTimeout(() => setVisible(false), 2500)
      return next
    })
  }

  // Keep the tooltip inside the viewport horizontally — a badge near either
  // screen edge would otherwise overflow since it's centered on its trigger.
  // Measured from the (never-transformed) wrapper + tooltip's own natural
  // width, so it never feeds back off an already-shifted position.
  useLayoutEffect(() => {
    if (!visible || !HORIZONTAL_SIDES.has(side)) return
    const wrapper = wrapperRef.current
    const tooltip = tooltipRef.current
    if (!wrapper || !tooltip) return
    const margin       = 8
    const wrapperRect   = wrapper.getBoundingClientRect()
    const tooltipWidth  = tooltip.offsetWidth
    const center        = wrapperRect.left + wrapperRect.width / 2
    const idealLeft     = center - tooltipWidth / 2
    const idealRight    = center + tooltipWidth / 2

    if (idealRight > window.innerWidth - margin) {
      setShiftX((window.innerWidth - margin) - idealRight)
    } else if (idealLeft < margin) {
      setShiftX(margin - idealLeft)
    } else {
      setShiftX(0)
    }
  }, [visible, side, content])

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={toggleForTouch}
    >
      {children}
      <span
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        aria-hidden={!visible}
        className={[
          'absolute z-50 w-max max-w-[calc(100vw_-_16px)] sm:max-w-xs whitespace-normal text-center leading-snug rounded-md border border-border bg-surface px-2 py-1 text-xs text-text shadow-lg pointer-events-none',
          'transition-opacity duration-[--dur-fast]',
          SIDE_CLASSES[side],
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        style={shiftX !== 0 ? { transform: `translateX(calc(-50% + ${shiftX}px))` } : undefined}
      >
        {content}
      </span>
    </span>
  )
}
