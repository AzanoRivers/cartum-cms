'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getStorageSettings,
  updateStorageSettings,
  testStorageConnection,
} from '@/lib/actions/settings.actions'
import { useToast } from '@/lib/hooks/useToast'
import { t } from '@/lib/i18n/t'
import type { Dictionary } from '@/locales/en'
import type { StorageSettings } from '@/types/settings'

export type StorageSectionProps = {
  d: Dictionary['settings']['storage']
}

export function StorageSection({ d }: StorageSectionProps) {
  const [form, setForm]       = useState<StorageSettings>({ r2BucketName: '', r2PublicUrl: '' })
  const [loaded, setLoaded]   = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [isSaving, startSave]   = useTransition()
  const [isTesting, startTest]  = useTransition()
  const toast = useToast()

  useEffect(() => {
    getStorageSettings().then((res) => {
      if (res.success) setForm(res.data)
      setLoaded(true)
    })
  }, [])

  function handleChange(field: keyof StorageSettings, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setTestResult(null)
  }

  function handleSave() {
    startSave(async () => {
      const res = await updateStorageSettings(form)
      if (res.success) toast.success(d.saved)
      else toast.error(d.error)
    })
  }

  function handleTest() {
    setTestResult(null)
    startTest(async () => {
      const res = await testStorageConnection()
      if (res.success) {
        setTestResult(t(d, 'testOk', { latencyMs: String(res.data.latencyMs) }))
      } else {
        toast.error(d.testFail)
      }
    })
  }

  if (!loaded) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="font-mono text-xs text-muted animate-pulse">Loading…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>

      {/* R2 Bucket name */}
      <Field label={d.r2BucketName}>
        <input
          type="text"
          value={form.r2BucketName}
          placeholder={d.r2BucketNamePlaceholder}
          onChange={(e) => handleChange('r2BucketName', e.target.value)}
          className={inputCls}
        />
      </Field>

      {/* R2 Public URL */}
      <Field label={d.r2PublicUrl}>
        <input
          type="url"
          value={form.r2PublicUrl}
          placeholder={d.r2PublicUrlPlaceholder}
          onChange={(e) => handleChange('r2PublicUrl', e.target.value)}
          className={inputCls}
        />
      </Field>

      {/* Optimization server URL */}
      <Field label={d.mediaVpsUrl}>
        <input
          type="url"
          value={form.mediaVpsUrl ?? ''}
          placeholder={d.mediaVpsUrlPlaceholder}
          onChange={(e) => handleChange('mediaVpsUrl', e.target.value)}
          className={inputCls}
        />
      </Field>

      {/* Optimization server API key */}
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

      {/* Test + save row */}
      <div className="pt-1 space-y-2">
        <p className="font-mono text-[11px] text-muted/60">{d.saveEmptyNotice}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {testResult && (
            <span className="font-mono text-xs text-success">{testResult}</span>
          )}
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="w-full sm:w-auto rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? d.testing : d.testConnection}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-xs text-text-muted">{label}</label>
      {children}
    </div>
  )
}
