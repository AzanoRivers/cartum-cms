'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { retrySchemaCheckAction } from './actions'
import type { Dictionary } from '@/locales/en'

type Check = { label: string; ok: boolean; warning?: string }

type SystemCheckClientProps = {
  checks: Check[]
  dict:   Dictionary['setup']['systemCheck']
}

const STAGGER_MS    = 110
const ITEM_DURATION = 220
const SUCCESS_DELAY = 160
const MAX_RETRIES    = 3
const RETRY_INTERVAL_MS = 40_000 // 3 retries * 40s ≈ 2 minutes total

export function SystemCheckClient({ checks, dict }: SystemCheckClientProps) {
  const router = useRouter()
  const [isNavigating, startNavigating] = useTransition()

  const [visibleCount, setVisibleCount] = useState(0)
  const [showSuccess,  setShowSuccess]  = useState(false)
  const [showButton,   setShowButton]   = useState(false)

  // Schema integrity can hit a transient blip (e.g. right after a full reset,
  // Neon settling post-bulk-delete) that clears up on its own. Retry it a
  // few times in the background instead of hard-blocking the wizard.
  const schemaIndex = checks.findIndex((c) => c.label === dict.schema)
  const [liveChecks,   setLiveChecks]   = useState(checks)
  const [retryAttempt, setRetryAttempt] = useState(0)

  const schemaFailed  = schemaIndex !== -1 && !liveChecks[schemaIndex].ok
  const retriesLeft   = retryAttempt < MAX_RETRIES
  const schemaPending = schemaFailed && retriesLeft

  useEffect(() => {
    if (!schemaFailed || !retriesLeft) return
    const delay = retryAttempt === 0
      ? checks.length * STAGGER_MS + ITEM_DURATION + 300
      : RETRY_INTERVAL_MS

    const t = setTimeout(async () => {
      const ok = await retrySchemaCheckAction()
      setRetryAttempt((n) => n + 1)
      if (ok) {
        setLiveChecks((prev) => {
          const next = [...prev]
          next[schemaIndex] = { ...next[schemaIndex], ok: true }
          return next
        })
      }
    }, delay)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryAttempt, schemaFailed, retriesLeft])

  const allOk = liveChecks.filter((c) => !c.warning).every((c) => c.ok)

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
        {liveChecks.map((check, i) => {
          const shown          = i < visibleCount
          const isSchemaRow    = i === schemaIndex
          const showRetrying   = isSchemaRow && schemaPending

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
              {showRetrying ? (
                <Spinner size="sm" color="primary" />
              ) : (
                <span className={check.ok ? 'text-success' : 'text-danger'}>
                  {check.ok ? '✓' : '✖'}
                </span>
              )}
              <div>
                <span className="text-text text-sm font-mono">{check.label}</span>
                {showRetrying && (
                  <p className="text-muted text-xs mt-0.5 animate-pulse">
                    {dict.retrying
                      .replace('{attempt}', String(Math.min(retryAttempt + 1, MAX_RETRIES)))
                      .replace('{max}', String(MAX_RETRIES))}
                  </p>
                )}
                {!showRetrying && check.warning && (
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
            onClick={() => startNavigating(() => router.push('/setup/credentials'))}
            disabled={isNavigating}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-mono text-sm py-2.5 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
            style={{
              opacity:    showButton ? (isNavigating ? 0.6 : 1) : 0,
              transition: 'opacity 280ms ease-out',
            }}
          >
            {isNavigating ? <Spinner size="sm" color="white" /> : <>{dict.continue} →</>}
          </button>
        </div>
      ) : schemaPending && !liveChecks.some((c, i) => i !== schemaIndex && !c.warning && !c.ok) ? null : (
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
