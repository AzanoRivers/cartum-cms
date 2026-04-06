'use client'

import { useRouter } from 'next/navigation'
import type { Dictionary } from '@/locales/en'

type ReadyClientProps = {
  projectName: string
  adminEmail:  string
  dict:        Dictionary['setup']['ready']
}

export function ReadyClient({ projectName, adminEmail, dict }: ReadyClientProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-primary font-mono text-xs tracking-widest uppercase mb-2">◈ CARTUM</p>
        <h1 className="text-text text-2xl font-semibold tracking-tight">{dict.title}</h1>
      </div>

      <div className="flex flex-col gap-2 border border-border rounded-md p-4 bg-surface-2 font-mono text-sm">
        <div className="flex gap-4">
          <span className="text-muted w-16">{dict.project}</span>
          <span className="text-text">{projectName}</span>
        </div>
        <div className="flex gap-4">
          <span className="text-muted w-16">{dict.admin}</span>
          <span className="text-text">{adminEmail}</span>
        </div>
        <div className="flex gap-4">
          <span className="text-muted w-16">{dict.status}</span>
          <span className="text-success">{dict.statusVal}</span>
        </div>
      </div>

      <button
        onClick={() => router.push('/cms/board')}
        className="w-full bg-primary hover:bg-primary/90 text-white font-mono text-sm py-2.5 rounded-md transition-colors"
      >
        {dict.cta} →
      </button>
    </div>
  )
}
