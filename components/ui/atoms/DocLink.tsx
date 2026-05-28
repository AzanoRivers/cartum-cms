'use client'

import Link from 'next/link'
import { useUIStore } from '@/lib/stores/uiStore'

export type DocLinkProps = {
  href:  string
  label: string
  desc:  string
}

export function DocLink({ href, label, desc }: DocLinkProps) {
  const closeSettings = useUIStore((s) => s.closeSettings)

  return (
    <Link
      href={href}
      onClick={closeSettings}
      className="group flex items-start gap-3 rounded-md border border-border/50 bg-surface-2/30 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="mt-0.5 shrink-0 font-mono text-primary/60 text-xs group-hover:text-primary transition-colors">//</span>
      <div className="min-w-0">
        <p className="font-mono text-xs text-text group-hover:text-primary transition-colors">{label}</p>
        <p className="font-mono text-[11px] text-muted leading-4 mt-0.5">{desc}</p>
      </div>
      <span className="shrink-0 self-center font-mono text-muted/40 text-xs group-hover:text-primary/60 transition-colors">→</span>
    </Link>
  )
}
