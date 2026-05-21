'use client'

import { Sparkles } from 'lucide-react'
import type { Dictionary } from '@/locales/en'

export type SubscriptionSectionProps = {
  d: Dictionary['settings']['subscription']
}

export function SubscriptionSection({ d }: SubscriptionSectionProps) {
  return (
    <div className="space-y-5">
      <h2 className="font-mono text-sm font-semibold text-text">{d.title}</h2>

      <div className="rounded-xl border border-border bg-surface-2/40 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles size={18} strokeWidth={1.8} />
          </span>
          <p className="font-mono text-xs leading-relaxed text-muted pt-1.5">
            {d.description}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-3 py-1 font-mono text-[11px] text-primary/70">
            {d.comingSoon}
          </span>
        </div>
      </div>
    </div>
  )
}
