'use client'

import { forwardRef } from 'react'

export const MarqueeRect = forwardRef<HTMLDivElement>((_, ref) => (
  <div
    ref={ref}
    aria-hidden="true"
    className="pointer-events-none absolute z-30 hidden"
    style={{
      border: '1px solid var(--color-primary)',
      background: 'color-mix(in oklch, var(--color-primary) 6%, transparent)',
      boxShadow: '0 0 0 0.5px color-mix(in oklch, var(--color-primary) 30%, transparent) inset',
    }}
  />
))
MarqueeRect.displayName = 'MarqueeRect'
