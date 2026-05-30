'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function CMSError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-1.5">
        <p className="font-mono text-[10px] text-danger/70 uppercase tracking-widest">500 — Server error</p>
        <h2 className="font-mono text-sm font-semibold text-text">Something went wrong</h2>
        <p className="font-mono text-xs text-muted leading-relaxed max-w-xs">
          An unexpected error occurred. You can try again or navigate back to the board.
        </p>
        {error.digest && (
          <p className="font-mono text-[10px] text-muted/40 pt-1">ref: {error.digest}</p>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={reset}
          className="rounded-md border border-border bg-surface-2 px-4 py-1.5 font-mono text-xs text-muted transition-colors hover:text-text hover:border-border/80 cursor-pointer"
        >
          Try again
        </button>
        <Link
          href="/cms/board"
          className="rounded-md border border-primary/40 bg-primary/10 px-4 py-1.5 font-mono text-xs text-primary transition-all hover:bg-primary/20 hover:border-primary"
        >
          ← Board
        </Link>
      </div>
    </div>
  )
}
