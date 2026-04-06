'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type VHSTransitionProps = {
  children: React.ReactNode
  /** 'fast'=300ms for panels/modals, 'normal'=500ms for in-page, 'full'=800ms for pages */
  duration?: 'fast' | 'normal' | 'full'
  /** Re-trigger the animation when this value changes */
  trigger?: unknown
  className?: string
}

const DURATION_MS: Record<NonNullable<VHSTransitionProps['duration']>, number> = {
  fast:   300,
  normal: 500,
  full:   800,
}

export function VHSTransition({
  children,
  duration = 'full',
  trigger,
  className,
}: VHSTransitionProps) {
  const [active, setActive] = useState(true)
  const prevTrigger = useRef(trigger)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const startAnimation = useCallback(() => {
    setActive(true)
  }, [])

  // Re-fire when trigger changes
  useEffect(() => {
    if (trigger !== undefined && trigger !== prevTrigger.current) {
      prevTrigger.current = trigger
      startAnimation()
    }
  }, [trigger, startAnimation])

  // Clean up via animationend; fallback timer guards against missed events
  useEffect(() => {
    if (!active) return
    const el = wrapperRef.current
    const ms = DURATION_MS[duration]

    const onEnd = () => setActive(false)
    el?.addEventListener('animationend', onEnd, { once: true })
    // Fallback: remove class slightly after expected duration
    const fallback = setTimeout(() => setActive(false), ms + 100)

    return () => {
      el?.removeEventListener('animationend', onEnd)
      clearTimeout(fallback)
    }
  }, [active, duration])

  return (
    <div
      ref={wrapperRef}
      className={[active ? 'vhs-transition' : undefined, className].filter(Boolean).join(' ') || undefined}
      // VHSTransition is the sole exception to the no-inline-style rule —
      // runtime animation duration cannot be expressed as a static Tailwind class.
      style={active ? {
        animation: `vhs-entry ${DURATION_MS[duration]}ms var(--ease-out-expo, cubic-bezier(0.16,1,0.3,1)) both`,
      } : undefined}
    >
      {children}
    </div>
  )
}
