'use client'

import { Spinner } from '@/components/ui/atoms/Spinner'

export type FullscreenLoaderProps = {
  label?: string
}

export function FullscreenLoader({ label }: FullscreenLoaderProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 bg-bg/70 backdrop-blur-sm pointer-events-auto"
    >
      <Spinner size="lg" color="primary" />
      {label && (
        <span className="font-mono text-xs text-muted animate-pulse select-none">
          {label}
        </span>
      )}
    </div>
  )
}
