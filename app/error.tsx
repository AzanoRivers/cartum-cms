'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function GlobalError({
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
    <div className="min-h-dvh bg-bg text-text flex items-center justify-center p-6">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-md w-full">
        <div className="flex flex-col items-center gap-2">
          <Image
            src="/images/brand/icon.svg"
            alt="Cartum icon"
            width={44}
            height={44}
            priority
            className="opacity-90"
          />
          <span className="font-mono text-xs text-muted tracking-widest uppercase">Cartum CMS</span>
        </div>

        <span
          className="font-mono text-[7rem] font-bold leading-none tracking-tighter text-danger select-none"
          style={{ textShadow: '3px 0 0 rgba(99,102,241,0.5), -3px 0 0 rgba(34,211,238,0.5)' }}
          aria-hidden="true"
        >
          500
        </span>

        <div className="space-y-3">
          <h1 className="font-mono text-lg font-semibold text-text">Server error</h1>
          <p className="font-mono text-sm text-muted leading-relaxed">
            Something went wrong on the server. You can try again or return to the board.
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] text-muted/40">ref: {error.digest}</p>
          )}
        </div>

        <div className="w-full h-px bg-border" />

        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-5 py-2.5 font-mono text-sm text-muted transition-all hover:text-text hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Try again
          </button>
          <Link
            href="/cms/board"
            className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-5 py-2.5 font-mono text-sm text-primary transition-all hover:bg-primary/20 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ← Board
          </Link>
        </div>
      </div>
    </div>
  )
}
