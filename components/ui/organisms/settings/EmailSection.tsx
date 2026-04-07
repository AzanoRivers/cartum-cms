'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getEmailSettings,
  updateEmailSettings,
  testEmailConnection,
} from '@/lib/actions/settings.actions'
import { useToast } from '@/lib/hooks/useToast'
import type { Dictionary } from '@/locales/en'

export type EmailSectionProps = {
  d: Dictionary['settings']['email']
}

export function EmailSection({ d }: EmailSectionProps) {
  const [apiKey, setApiKey]   = useState('')
  const [loaded, setLoaded]   = useState(false)
  const [isSaving, startSave] = useTransition()
  const [isTesting, startTest] = useTransition()
  const toast = useToast()

  useEffect(() => {
    getEmailSettings().then((res) => {
      if (res.success) setApiKey(res.data.resendApiKey)
      setLoaded(true)
    })
  }, [])

  function handleSave() {
    startSave(async () => {
      const res = await updateEmailSettings(apiKey)
      if (res.success) toast.success(d.saved)
      else toast.error(d.error)
    })
  }

  function handleTest() {
    startTest(async () => {
      const res = await testEmailConnection()
      if (res.success) toast.success(d.testOk)
      else toast.error(d.testFail)
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

      {!apiKey && (
        <div className="rounded-md border border-border/60 bg-surface-2 p-3">
          <p className="font-mono text-xs text-muted leading-relaxed">{d.notConfigured}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block font-mono text-xs text-text-muted">{d.resendApiKey}</label>
        <input
          type="password"
          value={apiKey}
          placeholder={d.resendKeyPlaceholder}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
        />
      </div>

      <div className="pt-1 flex items-center gap-3 justify-end">
        <button
          onClick={handleTest}
          disabled={isTesting || !apiKey}
          className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTesting ? d.testing : d.testEmail}
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
  )
}
