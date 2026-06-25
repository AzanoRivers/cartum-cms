'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { createProject } from '@/lib/actions/project.actions'
import type { Dictionary } from '@/locales/en'

type Props = {
  d: Dictionary['cms']['noProject']
}

export function NoProjectModal({ d }: Props) {
  const [name, setName]        = useState('')
  const [isPending, start]     = useTransition()
  const router                 = useRouter()

  function handleCreate() {
    if (!name.trim()) return
    const fd = new FormData()
    fd.append('name', name.trim())
    fd.append('locale', 'en')
    start(async () => {
      await createProject(fd)
      router.refresh()
    })
  }

  return (
    <>
      {/* No dark overlay — project convention */}
      <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none p-4">
        <VHSTransition duration="full" className="w-full max-w-sm pointer-events-auto">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
          >
            <div className="h-0.5 w-full bg-warning/70" />
            <div className="px-6 py-6 space-y-5">
              <div className="space-y-2">
                <h2 className="font-mono text-sm font-semibold text-text">{d.title}</h2>
                <div className="rounded-md border border-warning/30 bg-warning/8 px-3 py-2">
                  <p className="font-mono text-xs text-warning/90 leading-relaxed">⚠ {d.warn}</p>
                </div>
                <p className="font-mono text-xs text-muted leading-relaxed">{d.desc}</p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                  placeholder="My project"
                  autoFocus
                  disabled={isPending}
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted/50 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 disabled:opacity-50 transition-colors"
                />
                <button
                  onClick={handleCreate}
                  disabled={isPending || !name.trim()}
                  className="w-full rounded-md bg-primary px-4 py-2 font-mono text-sm text-white hover:bg-primary/80 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {isPending ? '…' : d.button}
                </button>
              </div>
            </div>
          </div>
        </VHSTransition>
      </div>
    </>
  )
}
