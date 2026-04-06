'use client'

import { useRouter } from 'next/navigation'
import type { Dictionary } from '@/locales/en'

type Check = { label: string; ok: boolean; warning?: string }

type SystemCheckClientProps = {
  checks: Check[]
  allOk:  boolean
  dict:   Dictionary['setup']['systemCheck']
}

export function SystemCheckClient({ checks, allOk, dict }: SystemCheckClientProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-text text-xl font-semibold tracking-tight">{dict.title}</h1>
        <p className="text-muted text-sm mt-1">{dict.subtitle}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {checks.map((check) => (
          <li key={check.label} className="flex items-start gap-3">
            <span className={check.ok ? 'text-success' : 'text-danger'}>
              {check.ok ? '✓' : '✖'}
            </span>
            <div>
              <span className="text-text text-sm font-mono">{check.label}</span>
              {check.warning && (
                <p className="text-warning text-xs mt-0.5">{check.warning}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {allOk ? (
        <div className="flex flex-col gap-3">
          <p className="text-success text-sm font-mono">{dict.allOk}</p>
          <button
            onClick={() => router.push('/setup/locale')}
            className="w-full bg-primary hover:bg-primary/90 text-white font-mono text-sm py-2.5 rounded-md transition-colors"
          >
            {dict.continue} →
          </button>
        </div>
      ) : (
        <p className="text-danger text-sm font-mono mt-2">{dict.fixFirst}</p>
      )}
    </div>
  )
}
