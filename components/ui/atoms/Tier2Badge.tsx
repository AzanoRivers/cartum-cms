'use client'

import { Zap } from 'lucide-react'
import { useUIStore } from '@/lib/stores/uiStore'

export type Tier2BadgeProps = {
  label:  string
  cta:    string
}

export function Tier2Badge({ label, cta }: Tier2BadgeProps) {
  const openSettings = useUIStore((s) => s.openSettings)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-warning/30 bg-warning/8 px-3 py-2">
      <Zap size={13} className="shrink-0 text-warning" aria-hidden="true" />
      <span className="font-mono text-[11px] text-warning/90">{label}</span>
      <button
        type="button"
        onClick={() => openSettings('subscription')}
        className="ml-auto font-mono text-[11px] font-semibold text-warning underline underline-offset-2 transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-1 focus-visible:ring-warning/60"
      >
        {cta}
      </button>
    </div>
  )
}
