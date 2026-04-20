'use client'

import { useEffect, useState, useTransition } from 'react'
import { cva } from 'class-variance-authority'
import { ChevronDown, Check } from 'lucide-react'
import {
  getStorageSettings,
  updateStorageSettings,
  updateStorageProvider,
  testStorageConnection,
  testBlobConnection,
  getStorageStatus,
} from '@/lib/actions/settings.actions'
import { Badge } from '@/components/ui/atoms/Badge'
import { useToast } from '@/lib/hooks/useToast'
import { t } from '@/lib/i18n/t'
import type { Dictionary } from '@/locales/en'
import type { StorageSettings, StorageProvider } from '@/types/settings'

export type StorageSectionProps = {
  d: Dictionary['settings']['storage']
}

type StorageStatus = {
  r2Configured:   boolean
  blobConfigured: boolean
  activeProvider: StorageProvider
}

// ── cva variants ──────────────────────────────────────────────────────────────

const providerBtn = cva(
  'relative rounded-md border px-3 py-3 font-mono text-xs text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-11',
  {
    variants: {
      active: {
        true:  'border-primary bg-primary/10 text-primary',
        false: 'border-border bg-surface-2 text-muted hover:border-border/70 hover:text-text',
      },
    },
    defaultVariants: { active: false },
  },
)

// ── component ─────────────────────────────────────────────────────────────────

export function StorageSection({ d }: StorageSectionProps) {
  const [form, setForm]     = useState<StorageSettings>({
    r2BucketName: '', r2PublicUrl: '', storageProvider: 'r2',
  })
  const [status, setStatus]     = useState<StorageStatus | null>(null)
  const [loaded, setLoaded]     = useState(false)
  const [showKey, setShowKey]   = useState(false)
  const [showBlob, setShowBlob] = useState(false)
  const [r2Open, setR2Open]     = useState(false)
  const [blobOpen, setBlobOpen] = useState(false)
  const [vpsOpen, setVpsOpen]   = useState(false)
  const [r2TestResult, setR2TestResult]     = useState<string | null>(null)
  const [blobTestResult, setBlobTestResult] = useState<string | null>(null)

  const [isSaving, startSave]          = useTransition()
  const [isR2Testing, startR2Test]     = useTransition()
  const [isBlobTesting, startBlobTest] = useTransition()
  const [isSwitching, startSwitch]     = useTransition()
  const toast = useToast()

  useEffect(() => {
    Promise.all([
      getStorageSettings(),
      getStorageStatus(),
    ]).then(([settingsRes, statusRes]) => {
      if (settingsRes.success) {
        setForm(settingsRes.data)
      }
      if (statusRes.success) setStatus(statusRes.data)
      setLoaded(true)
    })
  }, [])

  function handleChange(field: keyof StorageSettings, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setR2TestResult(null)
    setBlobTestResult(null)
  }

  function handleProviderSwitch(provider: StorageProvider) {
    setForm((prev) => ({ ...prev, storageProvider: provider }))
    setStatus((prev) => prev ? { ...prev, activeProvider: provider } : prev)
    startSwitch(async () => {
      const res = await updateStorageProvider(provider)
      if (res.success) toast.success(d.providerSaved)
      else toast.error(d.providerError)
    })
  }

  function handleSave() {
    startSave(async () => {
      const res = await updateStorageSettings(form)
      if (res.success) {
        toast.success(d.saved)
        const statusRes = await getStorageStatus()
        if (statusRes.success) setStatus(statusRes.data)
      } else {
        toast.error(d.error)
      }
    })
  }

  function handleR2Test() {
    setR2TestResult(null)
    startR2Test(async () => {
      const res = await testStorageConnection()
      if (res.success) setR2TestResult(t(d, 'testOk', { latencyMs: String(res.data.latencyMs) }))
      else toast.error(d.testFail)
    })
  }

  function handleBlobTest() {
    setBlobTestResult(null)
    startBlobTest(async () => {
      const res = await testBlobConnection()
      if (res.success) setBlobTestResult(d.testBlobOk)
      else toast.error(d.testBlobFail)
    })
  }

  if (!loaded) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="font-mono text-xs text-muted animate-pulse">Loading…</span>
      </div>
    )
  }

  const activeProvider  = status?.activeProvider ?? form.storageProvider
  const bothConfigured  = !!(status?.r2Configured && status?.blobConfigured)

  return (
    <div className="space-y-5">
      <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>

      {/* ── Provider selector — solo visible cuando ambos proveedores están configurados */}
      {bothConfigured && (
        <div className="space-y-3">
          {/* Banner informativo */}
          <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2.5">
            <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="font-mono text-xs leading-snug text-primary">{d.providerSelectHint}</span>
          </div>

          <span className="block font-mono text-xs text-text-muted">{d.providerLabel}</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(['r2', 'blob'] as StorageProvider[]).map((provider) => {
              const label    = provider === 'r2' ? d.providerR2 : d.providerBlob
              const isActive = activeProvider === provider
              return (
                <button
                  key={provider}
                  type="button"
                  disabled={isSwitching}
                  onClick={() => handleProviderSwitch(provider)}
                  className={providerBtn({ active: isActive })}
                >
                  <span className="flex items-center gap-1.5 pr-12">
                    {isActive && <Check size={11} className="shrink-0" />}
                    {label}
                  </span>
                  {isActive && (
                    <span className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] text-primary uppercase tracking-widest">
                      {d.statusActive}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── R2 Accordion ─────────────────────────────────────────────── */}
      <Accordion
        open={r2Open}
        onToggle={() => setR2Open((v) => !v)}
        title={d.r2SectionTitle}
        isActiveProvider={activeProvider === 'r2'}
        badgeLabel={
          status?.r2Configured
            ? activeProvider === 'r2' ? d.statusActive : d.statusConfigured
            : d.statusNotConfigured
        }
        badgeVariant={status?.r2Configured ? (activeProvider === 'r2' ? 'primary' : 'success') : 'muted'}
      >
        <div className="space-y-4 pt-1">
          <Field label={d.r2BucketName}>
            <input
              type="text"
              value={form.r2BucketName}
              placeholder={d.r2BucketNamePlaceholder}
              onChange={(e) => handleChange('r2BucketName', e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label={d.r2PublicUrl}>
            <input
              type="url"
              value={form.r2PublicUrl}
              placeholder={d.r2PublicUrlPlaceholder}
              onChange={(e) => handleChange('r2PublicUrl', e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-1">
            {r2TestResult && (
              <span className="font-mono text-xs text-success">{r2TestResult}</span>
            )}
            <button onClick={handleR2Test} disabled={isR2Testing} className={ghostBtnCls}>
              {isR2Testing ? d.testing : d.testConnection}
            </button>
          </div>
        </div>
      </Accordion>

      {/* ── Blob Accordion ───────────────────────────────────────────── */}
      <Accordion
        open={blobOpen}
        onToggle={() => setBlobOpen((v) => !v)}
        title={d.blobSectionTitle}
        isActiveProvider={activeProvider === 'blob'}
        badgeLabel={
          status?.blobConfigured
            ? activeProvider === 'blob' ? d.statusActive : d.statusConfigured
            : d.statusNotConfigured
        }
        badgeVariant={status?.blobConfigured ? (activeProvider === 'blob' ? 'primary' : 'success') : 'muted'}
      >
        <div className="space-y-4 pt-1">
          <Field label={d.blobToken}>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <input
                  type={showBlob ? 'text' : 'password'}
                  value={form.blobToken ?? ''}
                  placeholder={d.blobTokenPlaceholder}
                  onChange={(e) => handleChange('blobToken', e.target.value)}
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowBlob((v) => !v)}
                className="rounded-md border border-border bg-surface-2 px-3 font-mono text-xs text-muted hover:text-text transition-colors cursor-pointer"
              >
                {showBlob ? d.hideKey : d.showKey}
              </button>
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-muted/60">{d.blobTokenHint}</p>
          </Field>

          <div className="flex items-center justify-end gap-3 pt-1">
            {blobTestResult && (
              <span className="font-mono text-xs text-success">{blobTestResult}</span>
            )}
            <button onClick={handleBlobTest} disabled={isBlobTesting} className={ghostBtnCls}>
              {isBlobTesting ? d.testing : d.testBlob}
            </button>
          </div>
        </div>
      </Accordion>

      {/* ── VPS Accordion ────────────────────────────────────────────── */}
      <Accordion
        open={vpsOpen}
        onToggle={() => setVpsOpen((v) => !v)}
        title={d.vpsSectionTitle}
        isActiveProvider={false}
        badgeLabel={form.mediaVpsUrl ? d.statusConfigured : d.statusNotConfigured}
        badgeVariant={form.mediaVpsUrl ? 'success' : 'muted'}
      >
        <div className="space-y-4 pt-1">
          <Field label={d.mediaVpsUrl}>
            <input
              type="url"
              value={form.mediaVpsUrl ?? ''}
              placeholder={d.mediaVpsUrlPlaceholder}
              onChange={(e) => handleChange('mediaVpsUrl', e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label={d.mediaVpsKey}>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.mediaVpsKey ?? ''}
                  onChange={(e) => handleChange('mediaVpsKey', e.target.value)}
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="rounded-md border border-border bg-surface-2 px-3 font-mono text-xs text-muted hover:text-text transition-colors cursor-pointer"
              >
                {showKey ? d.hideKey : d.showKey}
              </button>
            </div>
            <a
              href="https://optimus.azanolabs.com/guide"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-block font-mono text-xs text-primary/70 hover:text-primary transition-colors"
            >
              {d.apiDocsLink}
            </a>
          </Field>
        </div>
      </Accordion>

      {/* ── Save row ─────────────────────────────────────────────────── */}
      <div className="pt-1 space-y-2">
        <p className="font-mono text-[11px] text-muted/60">{d.saveEmptyNotice}</p>
        <div className="flex justify-end">
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
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors'

const ghostBtnCls =
  'rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-xs text-text-muted">{label}</label>
      {children}
    </div>
  )
}

type AccordionProps = {
  open:             boolean
  onToggle:         () => void
  title:            string
  badgeLabel:       string
  badgeVariant:     'primary' | 'success' | 'muted'
  isActiveProvider: boolean
  children:         React.ReactNode
}

function Accordion({ open, onToggle, title, badgeLabel, badgeVariant, isActiveProvider, children }: AccordionProps) {
  const headerBg = open ? 'bg-primary/10' : 'bg-primary/5 hover:bg-primary/10'
  const titleColor = open || isActiveProvider ? 'text-primary' : 'text-text'
  const borderColor = isActiveProvider ? 'border-primary/40' : 'border-border'

  return (
    <div className={`rounded-lg border overflow-hidden ${borderColor}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors cursor-pointer ${headerBg}`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`font-mono text-xs font-semibold ${titleColor}`}>
            {title}
          </span>
          <Badge variant={badgeVariant} size="sm" className="font-mono uppercase tracking-widest">
            {badgeLabel}
          </Badge>
        </div>
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${open ? 'rotate-180 text-primary' : isActiveProvider ? 'text-primary/60' : 'text-muted'}`}
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
