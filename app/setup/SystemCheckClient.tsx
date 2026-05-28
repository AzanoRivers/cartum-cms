'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Dictionary } from '@/locales/en'

type Check = { label: string; ok: boolean; warning?: string }

type SystemCheckClientProps = {
  checks: Check[]
  allOk:  boolean
  dict:   Dictionary['setup']['systemCheck']
}

const STAGGER_MS   = 110
const ITEM_DURATION = 220
const SUCCESS_DELAY = 160

export function SystemCheckClient({ checks, allOk, dict }: SystemCheckClientProps) {
  const router = useRouter()

  const [visibleCount, setVisibleCount] = useState(0)
  const [showSuccess,  setShowSuccess]  = useState(false)
  const [showButton,   setShowButton]   = useState(false)

  useEffect(() => {
    checks.forEach((_, i) => {
      setTimeout(() => setVisibleCount((n) => Math.max(n, i + 1)), i * STAGGER_MS)
    })
  }, [checks.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!allOk) return
    const base = checks.length * STAGGER_MS + ITEM_DURATION + SUCCESS_DELAY
    const t1 = setTimeout(() => setShowSuccess(true), base)
    const t2 = setTimeout(() => setShowButton(true),  base + 420)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [allOk, checks.length])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-text text-xl font-semibold tracking-tight">{dict.title}</h1>
        <p className="text-muted text-sm mt-1">{dict.subtitle}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {checks.map((check, i) => {
          const shown = i < visibleCount
          return (
            <li
              key={check.label}
              className="flex items-start gap-3"
              style={{
                opacity:    shown ? 1 : 0,
                transform:  shown ? 'translateY(0)' : 'translateY(5px)',
                transition: `opacity ${ITEM_DURATION}ms ease-out, transform ${ITEM_DURATION}ms ease-out`,
              }}
            >
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
          )
        })}
      </ul>

      {allOk ? (
        <div className="flex flex-col gap-3">
          <p
            className="text-success text-sm font-mono"
            style={{
              opacity:    showSuccess ? 1 : 0,
              transform:  showSuccess ? 'translateX(0)' : 'translateX(18px)',
              transition: 'opacity 300ms ease-out, transform 300ms ease-out',
            }}
          >
            {dict.allOk}
          </p>
          <button
            onClick={() => router.push('/setup/credentials')}
            className="w-full bg-primary hover:bg-primary/90 text-white font-mono text-sm py-2.5 rounded-md transition-colors cursor-pointer"
            style={{
              opacity:    showButton ? 1 : 0,
              transition: 'opacity 280ms ease-out',
            }}
          >
            {dict.continue} →
          </button>
        </div>
      ) : (
        <p
          className="text-danger text-sm font-mono mt-2"
          style={{
            opacity:    visibleCount >= checks.length ? 1 : 0,
            transform:  visibleCount >= checks.length ? 'translateX(0)' : 'translateX(18px)',
            transition: 'opacity 300ms ease-out, transform 300ms ease-out',
          }}
        >
          {dict.fixFirst}
        </p>
      )}
    </div>
  )
}
