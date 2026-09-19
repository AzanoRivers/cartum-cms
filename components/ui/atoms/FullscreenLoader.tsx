'use client'

import { Spinner } from '@/components/ui/atoms/Spinner'

export type FullscreenLoaderProps = {
  label?: string
}

const SPARKS = [
  { angle: 0,   delay: 0,   color: 'var(--color-accent)' },
  { angle: 45,  delay: 140, color: 'var(--color-primary)' },
  { angle: 90,  delay: 60,  color: 'var(--color-accent)' },
  { angle: 135, delay: 210, color: 'var(--color-primary)' },
  { angle: 180, delay: 30,  color: 'var(--color-accent)' },
  { angle: 225, delay: 170, color: 'var(--color-primary)' },
  { angle: 270, delay: 90,  color: 'var(--color-accent)' },
  { angle: 315, delay: 240, color: 'var(--color-primary)' },
]

export function FullscreenLoader({ label }: FullscreenLoaderProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 bg-bg/70 backdrop-blur-sm pointer-events-auto"
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="loader-sparks">
          {SPARKS.map((s) => (
            <span
              key={s.angle}
              className="loader-spark"
              style={{ '--angle': `${s.angle}deg`, '--delay': `${s.delay}ms`, '--spark-color': s.color } as React.CSSProperties}
            />
          ))}
        </div>
        <Spinner size="lg" color="primary" />
      </div>
      {label && (
        <span className="font-mono text-xs text-muted animate-pulse select-none">
          {label}
        </span>
      )}
    </div>
  )
}
