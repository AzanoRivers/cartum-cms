'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import type {
  ScrapeJobState,
  ScrapeOptions,
  ScrapeResult,
  ImportedSummary,
  ImportStrategy,
} from '@/types/scraper'
import {
  startScrapeJob,
  getScrapeJobStatus,
  getScrapeJobResult,
  cancelScrapeJob,
  importScrapedData,
} from '@/lib/actions/scraper.actions'

type MigrationStep =
  | 'idle'       // formulario vacío
  | 'running'    // job activo — polling
  | 'done'       // result disponible — esperando decisión de import
  | 'error'      // job fallido
  | 'importing'  // importScrapedData en curso
  | 'imported'   // importación completada

const TERMINAL_STATUSES = new Set(['done', 'failed', 'expired'])

/** Abort polling if the job hasn't finished after this duration. */
const MAX_POLL_MS = 15 * 60 * 1000  // 15 minutes

export function useWebMigration() {
  const [step,          setStep]          = useState<MigrationStep>('idle')
  const [jobId,         setJobId]         = useState<string | null>(null)
  const [jobState,      setJobState]      = useState<ScrapeJobState | null>(null)
  const [result,        setResult]        = useState<ScrapeResult | null>(null)
  const [importSummary, setImportSummary] = useState<ImportedSummary | null>(null)
  const [error,         setError]         = useState<string | null>(null)
  const [isPending,     startTransition]  = useTransition()

  // Guard: prevents overlapping polls when a request is still in-flight
  const pollActiveRef    = useRef(false)
  // Records when polling started — used to enforce MAX_POLL_MS timeout
  const pollStartedAtRef = useRef<number | null>(null)

  // ── Polling loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'running' || !jobId) return

    let cancelled = false

    const poll = async () => {
      // Abort polling if the job hasn't finished within MAX_POLL_MS
      if (pollStartedAtRef.current !== null && Date.now() - pollStartedAtRef.current > MAX_POLL_MS) {
        setError('SCRAPER_TIMEOUT')
        setStep('error')
        return
      }

      if (cancelled || pollActiveRef.current) return
      pollActiveRef.current = true

      try {
        const res = await getScrapeJobStatus(jobId)
        if (cancelled) return

        if (!res.success) {
          setError(res.error)
          setStep('error')
          return
        }

        setJobState(res.data)
        const status = res.data.status

        if (!TERMINAL_STATUSES.has(status)) return

        if (status === 'failed' || status === 'expired') {
          setError(res.data.error?.message ?? `Job ${status}`)
          setStep('error')
          return
        }

        // status === 'done' — fetch the actual result once
        const resultRes = await getScrapeJobResult(jobId)
        if (cancelled) return

        if (!resultRes.success) {
          setError(resultRes.error)
          setStep('error')
        } else {
          setResult(resultRes.data)
          setStep('done')
        }
      } finally {
        if (!cancelled) pollActiveRef.current = false
      }
    }

    const intervalId = setInterval(poll, 5000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
      pollActiveRef.current = false
    }
  }, [step, jobId])

  // ── Actions ──────────────────────────────────────────────────────────────────

  const startMigration = useCallback(
    (url: string, options?: ScrapeOptions) => {
      setError(null)
      setJobId(null)
      setJobState(null)
      setResult(null)
      setImportSummary(null)

      startTransition(async () => {
        const res = await startScrapeJob(url, options)
        if (!res.success) {
          setError(res.error)
          setStep('error')
          return
        }
        setJobId(res.data.job_id)
        pollStartedAtRef.current = Date.now()
        setStep('running')
      })
    },
    // startTransition is identity-stable — no need to list as dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const cancelMigration = useCallback(() => {
    if (!jobId) return
    startTransition(async () => {
      await cancelScrapeJob(jobId)
      pollStartedAtRef.current = null
      setStep('idle')
      setJobId(null)
      setJobState(null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const importResult = useCallback(
    (strategy: ImportStrategy, downloadImages = false) => {
      if (!result) return
      setStep('importing')
      startTransition(async () => {
        const res = await importScrapedData(result, strategy, downloadImages)
        if (!res.success) {
          setError(res.error)
          setStep('error')
          return
        }
        setImportSummary(res.data)
        setStep('imported')
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result],
  )

  const reset = useCallback(() => {
    pollStartedAtRef.current = null
    setStep('idle')
    setJobId(null)
    setJobState(null)
    setResult(null)
    setImportSummary(null)
    setError(null)
  }, [])

  return {
    step,
    jobId,
    jobState,
    result,
    importSummary,
    error,
    isPending,
    startMigration,
    cancelMigration,
    importResult,
    reset,
  }
}
