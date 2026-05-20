'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  XCircle,
} from 'lucide-react'
import {
  getWebMigrationSettings,
  updateWebMigrationSettings,
} from '@/lib/actions/settings.actions'
import { getScraperServerStatus } from '@/lib/actions/scraper.actions'
import { useWebMigration } from '@/lib/hooks/useWebMigration'
import { useUIStore } from '@/lib/stores/uiStore'
import { useToast } from '@/lib/hooks/useToast'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { Badge } from '@/components/ui/atoms/Badge'
import { t } from '@/lib/i18n/t'
import type { Dictionary } from '@/locales/en'
import type { ImportStrategy, ScraperServerStatus, ScrapeJobStatus } from '@/types/scraper'

export type WebMigrationSectionProps = {
  d: Dictionary['settings']['webMigration']
}

// ── Accordion helper (same pattern as StorageSection) ─────────────────────────

type AccordionProps = {
  open:       boolean
  onToggle:   () => void
  title:      string
  badge?:     React.ReactNode
  children:   React.ReactNode
}

function Accordion({ open, onToggle, title, badge, children }: AccordionProps) {
  return (
    <div className={`rounded-lg border overflow-hidden transition-colors duration-200 ${open ? 'border-primary/40' : 'border-border'}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors cursor-pointer ${open ? 'bg-primary/10' : 'bg-primary/5 hover:bg-primary/10'}`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`font-mono text-xs font-semibold transition-colors ${open ? 'text-primary' : 'text-text'}`}>
            {title}
          </span>
          {badge}
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-primary' : 'text-muted'}`}
        />
      </button>

      {/* grid-rows accordion — patrón estándar del proyecto */}
      <div
        className={`grid ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        style={{ transition: 'grid-template-rows 280ms cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div className={`min-h-0 overflow-hidden transition-opacity duration-200 ${open ? 'opacity-100 delay-75' : 'opacity-0'}`}>
          <div className="border-t border-border px-4 pb-4 pt-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-xs text-muted">{label}</label>
      {children}
    </div>
  )
}

// ── Shared input class ─────────────────────────────────────────────────────────

const inputCls =
  'text-base w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors'

// ── FunMessage ────────────────────────────────────────────────────────────────

function FunMessage({ messages }: { messages: string[] }) {
  const [idx,     setIdx]     = useState(() => Math.floor(Math.random() * messages.length))
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx((prev) => {
          let next = Math.floor(Math.random() * messages.length)
          while (messages.length > 1 && next === prev) {
            next = Math.floor(Math.random() * messages.length)
          }
          return next
        })
        setVisible(true)
      }, 350)
    }, 10000)
    return () => clearInterval(cycle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <p
      className={`min-h-[2.5rem] font-mono text-[11px] leading-relaxed text-center italic text-text/65 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ textShadow: '0 0 10px color-mix(in oklch, var(--color-primary) 45%, transparent)' }}
    >
      {messages[idx]}
    </p>
  )
}

// ── Phase ranges (mirrors backend PHASE_RANGES in app/core/progress.py) ──────

const PHASE_MILESTONES = [5, 15, 45, 65, 75, 90] as const

const STATUS_MIN_PCT: Partial<Record<ScrapeJobStatus, number>> = {
  queued:     1,
  exploring:  5,
  fetching:   15,
  extracting: 45,
  auditing:   65,
  analyzing:  75,
  packaging:  90,
  done:       100,
}

// ── ChalkProgressBar ──────────────────────────────────────────────────────────

const CHALK_FILTER_ID = 'chalk-bar-filter'

// 6 disordered strokes: varying vertical position, thickness, opacity, animation timing.
// wOff = % subtracted from pct so some strokes appear slightly shorter (imperfect chalk coverage).
const CHALK_STROKES = [
  { top: 1,  h: 1, op: 0.40, dur: 2.1, delay: 0.0, wOff: -1.5 },
  { top: 3,  h: 2, op: 0.85, dur: 2.7, delay: 0.5, wOff:  0.0 },
  { top: 5,  h: 1, op: 0.55, dur: 1.9, delay: 1.1, wOff: -0.5 },
  { top: 8,  h: 3, op: 0.95, dur: 3.2, delay: 0.3, wOff:  0.0 },
  { top: 11, h: 2, op: 0.60, dur: 2.4, delay: 1.6, wOff: -1.0 },
  { top: 14, h: 1, op: 0.30, dur: 2.9, delay: 0.8, wOff: -2.0 },
] as const

function ChalkProgressBar({ pct }: { pct: number }) {
  return (
    <div className="relative w-full" style={{ height: '18px' }}>
      {/* Displacement filter — rough chalk stroke edges */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <filter id={CHALK_FILTER_ID} x="-2%" y="-80%" width="104%" height="260%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85 0.55"
              numOctaves="4"
              seed="11"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.6"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Blackboard track — dark bg + milestone ticks */}
      <div className="absolute inset-0 overflow-hidden rounded-[3px] border border-border bg-[#0c111a]">
        {PHASE_MILESTONES.map((m) => (
          <div
            key={m}
            className={`absolute top-0 h-full w-px transition-colors duration-500 ${pct >= m ? 'bg-white/20' : 'bg-white/7'}`}
            style={{ left: `${m}%` }}
          />
        ))}
      </div>

      {/* Chalk strokes — 6 disordered lines with staggered chalk-flicker animation.
          Wrapper sets base opacity + width; inner div carries bg + filter + animation.
          Effective opacity = s.op × animation value (multiplicative) — safe on iOS 9+. */}
      {CHALK_STROKES.map((s, i) => (
        <div
          key={i}
          className="absolute left-0"
          style={{
            top:        s.top,
            height:     s.h,
            width:      `${Math.max(0, pct + s.wOff)}%`,
            opacity:    s.op,
            transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div
            className="absolute inset-0 bg-primary"
            style={{
              filter:    `url(#${CHALK_FILTER_ID})`,
              animation: `chalk-flicker ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        </div>
      ))}

      {/* Chalk tip — white end mark */}
      {pct > 1 && pct < 99 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[11px] w-[3px] rounded-full bg-white/55"
          style={{
            left:       `calc(${pct}% - 1.5px)`,
            transition: 'left 600ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function WebMigrationSection({ d }: WebMigrationSectionProps) {
  // ── Accordion state ────────────────────────────────────────────────────────
  const [scraperOpen, setScraperOpen] = useState(true)
  const [configOpen,  setConfigOpen]  = useState(false)

  // ── API config state ───────────────────────────────────────────────────────
  const [apiUrl,       setApiUrl]       = useState('')
  const [apiKey,       setApiKey]       = useState('')
  const [showApiKey,   setShowApiKey]   = useState(false)
  const [loaded,       setLoaded]       = useState(false)
  const [serverStatus, setServerStatus] = useState<ScraperServerStatus | null>(null)
  const [statusError,  setStatusError]  = useState(false)
  const [isSaving,     startSave]       = useTransition()
  const [isTesting,    startTest]       = useTransition()

  // ── Migration hook ─────────────────────────────────────────────────────────
  const {
    step, jobState, result, importSummary, error,
    isPending, startMigration, cancelMigration, importResult, reset,
  } = useWebMigration()

  // ── Migration form state ───────────────────────────────────────────────────
  const [targetUrl,      setTargetUrl]      = useState('')
  const [maxPages,       setMaxPages]       = useState(50)
  const [downloadImages, setDownloadImages] = useState(false)
  const [strategy,       setStrategy]       = useState<ImportStrategy>('business_only')

  // ── Global store ───────────────────────────────────────────────────────────
  const closeSettings = useUIStore((s) => s.closeSettings)
  const toast  = useToast()
  const router = useRouter()

  // ── Load settings on mount ────────────────────────────────────────────────
  useEffect(() => {
    getWebMigrationSettings().then((res) => {
      if (res.success) {
        setApiUrl(res.data.scraperApiUrl ?? '')
        setApiKey(res.data.scraperApiKey ?? '')
      }
      setLoaded(true)
    })
  }, [])

  // ── Toast for invalid scraper result ──────────────────────────────────────
  useEffect(() => {
    if (step === 'error' && error === 'SCRAPER_INVALID_RESULT') {
      toast.error(d.errorInvalidResult)
    }
  }, [step, error]) // eslint-disable-line react-hooks/exhaustive-deps

  const isConfigured = Boolean(apiKey)

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSave() {
    startSave(async () => {
      const res = await updateWebMigrationSettings({
        scraperApiUrl: apiUrl || undefined,
        scraperApiKey: apiKey || undefined,
      })
      if (res.success) toast.success(d.save)
      else toast.error(d.connectionFail)
    })
  }

  function handleTest() {
    setServerStatus(null)
    setStatusError(false)
    startTest(async () => {
      const res = await getScraperServerStatus()
      if (res.success) {
        setServerStatus(res.data)
      } else {
        setStatusError(true)
      }
    })
  }

  function handleStart() {
    if (!targetUrl) return
    const normalizedUrl = /^https?:\/\//i.test(targetUrl) ? targetUrl : `https://${targetUrl}`
    startMigration(normalizedUrl, { max_pages: maxPages, download_images: downloadImages })
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="font-mono text-xs text-muted animate-pulse">Loading…</span>
      </div>
    )
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const progress = jobState?.progress
  const pct      = progress?.percent
    ?? (jobState?.status ? (STATUS_MIN_PCT[jobState.status] ?? 0) : 0)
  const ttlMin   = jobState?.ttl_remaining_seconds != null
    ? Math.ceil(jobState.ttl_remaining_seconds / 60)
    : null

  // Config accordion badge
  const configBadgeVariant = isConfigured ? 'success' : 'muted'
  const configBadgeLabel   = isConfigured ? d.statusConfigured : d.statusNotConfigured

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>

      {/* ══════════════════════════════════════════════════════════════════════
          Accordion 1 — Dealer Scrapper (open by default)
      ══════════════════════════════════════════════════════════════════════ */}
      <Accordion
        open={scraperOpen}
        onToggle={() => setScraperOpen((v) => !v)}
        title={d.dealerSection}
      >
        {/* Description */}
        <p className="mb-4 font-mono text-xs leading-relaxed text-muted">
          {d.dealerDescription}
        </p>

        {/* ── B: Migration form (idle + configured) ───────────────────────── */}
        {isConfigured && step === 'idle' && (
          <div className="space-y-4">
            <Field label={d.urlLabel}>
              <input
                type="url"
                value={targetUrl}
                placeholder={d.urlPlaceholder}
                onChange={(e) => setTargetUrl(e.target.value)}
                className={inputCls}
              />
            </Field>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="font-mono text-xs text-muted shrink-0">{d.maxPages}</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={maxPages}
                  onChange={(e) => setMaxPages(Number(e.target.value))}
                  className="text-base w-20 rounded-md border border-border bg-bg px-2 py-1.5 font-mono text-sm text-text outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={downloadImages}
                  onChange={(e) => setDownloadImages(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="font-mono text-xs text-muted">{d.downloadImages}</span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleStart}
                disabled={isPending || !targetUrl}
                className="rounded-md bg-primary px-5 py-2 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isPending ? d.starting : d.startMigration}
              </button>
            </div>
          </div>
        )}

        {/* Not configured notice */}
        {!isConfigured && step === 'idle' && (
          <p className="font-mono text-xs text-muted/60 italic">
            {d.errorNotConfigured}
          </p>
        )}

        {/* ── C: Progress (running) ─────────────────────────────────────── */}
        {step === 'running' && (
          <VHSTransition duration="fast" trigger={step}>
            <div className="space-y-3">
              <p className="font-mono text-xs text-muted uppercase tracking-widest">
                {d.progressTitle}
              </p>
              <ChalkProgressBar pct={pct} />
              <FunMessage messages={d.funMessages} />
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-0.5 font-mono text-xs text-muted">
                  {progress && (
                    <>
                      <p>{t(d, 'phaseLabel', { phase: progress.phase })}</p>
                      <p>{progress.phase === 'analyzing'
                        ? t(d, 'stepsProgress', { done: progress.pages_done, total: progress.pages_total })
                        : t(d, 'pagesProgress',  { done: progress.pages_done, total: progress.pages_total })
                      }</p>
                    </>
                  )}
                  {jobState?.estimated_remaining_seconds ? (
                    <p>{t(d, 'estimatedTime', { seconds: Math.ceil(jobState.estimated_remaining_seconds) })}</p>
                  ) : null}
                </div>
                <button
                  onClick={cancelMigration}
                  disabled={isPending}
                  className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {d.cancel}
                </button>
              </div>
            </div>
          </VHSTransition>
        )}

        {/* ── Importing spinner ────────────────────────────────────────── */}
        {step === 'importing' && (
          <VHSTransition duration="fast" trigger={step}>
            <div className="flex items-center gap-3">
              <Loader2 size={14} className="animate-spin text-muted shrink-0" />
              <p className="font-mono text-xs text-muted">{d.importing}</p>
            </div>
          </VHSTransition>
        )}

        {/* ── D: Result + import strategy (done) ──────────────────────── */}
        {step === 'done' && result && (
          <VHSTransition duration="fast" trigger={step}>
            <div className="space-y-4">
              <p className="font-mono text-xs text-muted uppercase tracking-widest">{d.resultTitle}</p>

              <div className="space-y-1">
                <p className="font-mono text-sm font-medium text-text">
                  {result.data.business_name ?? '—'}
                  {result.data.business_type && (
                    <span className="ml-2 font-normal text-muted text-xs">— {result.data.business_type}</span>
                  )}
                  {result.data.language && (
                    <span className="ml-1 font-normal text-muted text-xs">— {result.data.language}</span>
                  )}
                </p>
                <p className="font-mono text-xs text-muted">
                  {t(d, 'coverage', {
                    pct:   Math.round(result.metadata.coverage_percent),
                    pages: result.metadata.pages_analyzed,
                  })}
                </p>
                {ttlMin !== null && ttlMin <= 10 && (
                  <p className="flex items-center gap-1 font-mono text-xs text-warning">
                    <AlertTriangle size={12} className="shrink-0" />
                    {t(d, 'ttlWarning', { minutes: ttlMin })}
                  </p>
                )}
              </div>

              <fieldset className="space-y-2">
                <legend className="font-mono text-xs text-muted">{d.importTitle}</legend>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="business_only"
                    checked={strategy === 'business_only'}
                    onChange={() => setStrategy('business_only')}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="font-mono text-xs text-text">{d.strategyBusinessOnly}</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="business_and_pages"
                    checked={strategy === 'business_and_pages'}
                    onChange={() => setStrategy('business_and_pages')}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="font-mono text-xs text-text">
                    {t(d, 'strategyWithPages', {
                      n: result.data.nav_sections.length,
                    })}
                  </span>
                </label>
              </fieldset>

              <div className="flex justify-end">
                <button
                  onClick={() => importResult(strategy)}
                  disabled={isPending}
                  className="rounded-md bg-primary px-5 py-2 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isPending ? d.importing : d.importButton}
                </button>
              </div>
            </div>
          </VHSTransition>
        )}

        {/* ── E: Imported confirmation ─────────────────────────────────── */}
        {step === 'imported' && importSummary && (
          <VHSTransition duration="fast" trigger={step}>
            <div className="space-y-4 rounded-md border border-success/30 bg-success/5 p-3">
              <p className="font-mono text-xs text-success uppercase tracking-widest">
                {d.importedTitle}
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 font-mono text-xs text-text">
                  <CheckCircle2 size={12} className="text-success shrink-0" />
                  {t(d, 'mazoCreated', {
                    name: importSummary.sectionsCount != null
                      ? `Site: ${result?.data.business_name ?? 'Unnamed'}`
                      : `Info: ${result?.data.business_name ?? 'Unnamed'}`,
                  })}
                </li>
                <li className="flex items-center gap-2 font-mono text-xs text-text">
                  <CheckCircle2 size={12} className="text-success shrink-0" />
                  {t(d, 'recordsImported', { n: importSummary.attrCount })}
                </li>
                {importSummary.sectionsCount != null && (
                  <li className="flex items-center gap-2 font-mono text-xs text-text">
                    <CheckCircle2 size={12} className="text-success shrink-0" />
                    {t(d, 'sectionsImported', { n: importSummary.sectionsCount })}
                  </li>
                )}
              </ul>
              <div className="flex justify-end gap-2">
                <button
                  onClick={reset}
                  className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text transition-colors cursor-pointer"
                >
                  {d.newMigration}
                </button>
                <button
                  onClick={() => { router.refresh(); closeSettings() }}
                  className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 cursor-pointer"
                >
                  {d.viewOnBoard}
                </button>
              </div>
            </div>
          </VHSTransition>
        )}

        {/* ── F: Error ─────────────────────────────────────────────────── */}
        {step === 'error' && (
          <VHSTransition duration="fast" trigger={step}>
            <div className="space-y-3 rounded-md border border-danger/30 bg-danger/5 p-3">
              <div className="flex items-start gap-2">
                <XCircle size={14} className="text-danger mt-0.5 shrink-0" />
                <div className="space-y-1">
                  {error === 'SCRAPER_TIMEOUT' ? (
                    <p className="font-mono text-xs text-danger">{d.errorTimeout}</p>
                  ) : error === 'SCRAPER_INVALID_RESULT' ? (
                    <p className="font-mono text-xs text-danger">{d.errorInvalidResult}</p>
                  ) : jobState?.error ? (
                    <>
                      <p className="font-mono text-xs font-medium text-danger">{jobState.error.code}</p>
                      <p className="font-mono text-xs text-muted">{jobState.error.message}</p>
                      {jobState.error.retry_after && (
                        <p className="font-mono text-xs text-muted">
                          {t(d, 'errorRetryAfter', { seconds: jobState.error.retry_after })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="font-mono text-xs text-danger">{error ?? d.errorImport}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={reset}
                  className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text transition-colors cursor-pointer"
                >
                  {d.newMigration}
                </button>
              </div>
            </div>
          </VHSTransition>
        )}
      </Accordion>

      {/* ══════════════════════════════════════════════════════════════════════
          Accordion 2 — API Config (collapsed by default)
      ══════════════════════════════════════════════════════════════════════ */}
      <Accordion
        open={configOpen}
        onToggle={() => setConfigOpen((v) => !v)}
        title={d.configSection}
        badge={
          <Badge variant={configBadgeVariant} size="sm" className="font-mono uppercase tracking-widest text-[10px]">
            {configBadgeLabel}
          </Badge>
        }
      >
        <div className="space-y-4">
          {/* API URL */}
          <Field label={d.apiUrl}>
            <input
              type="text"
              value={apiUrl}
              placeholder="https://scraper.azanolabs.com"
              onChange={(e) => setApiUrl(e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* API Key */}
          <Field label={d.apiKey}>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                placeholder="••••••••••••••••"
                onChange={(e) => setApiKey(e.target.value)}
                className={`${inputCls} pr-9`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                tabIndex={-1}
                aria-label={showApiKey ? d.hide : d.show}
              >
                {showApiKey
                  ? <EyeOff size={14} strokeWidth={1.8} />
                  : <Eye    size={14} strokeWidth={1.8} />
                }
              </button>
            </div>
          </Field>

          {/* Server status + action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Status indicator */}
            <div className="flex items-center gap-2 font-mono text-xs">
              {isTesting ? (
                <Loader2 size={12} className="animate-spin text-muted" />
              ) : serverStatus ? (
                serverStatus.status === 'ok' ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-muted">
                      {t(d, 'serverAvailable', {
                        active: serverStatus.active_jobs,
                        max:    serverStatus.max_concurrent_jobs,
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    <span className="text-warning">{d.serverBusy}</span>
                  </>
                )
              ) : statusError ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-danger" />
                  <span className="text-danger">{d.connectionFail}</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-border" />
                  <span className="text-muted/60">{d.serverNotConfigured}</span>
                </>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleTest}
                disabled={isTesting || !isConfigured}
                className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? '…' : d.testConnection}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSaving ? d.saving : d.save}
              </button>
            </div>
          </div>
        </div>
      </Accordion>
    </div>
  )
}
