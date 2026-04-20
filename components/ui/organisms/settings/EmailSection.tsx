'use client'

import { useEffect, useState, useTransition } from 'react'
import { Eye, EyeOff } from 'lucide-react'
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
  const [apiKey,       setApiKey]      = useState('')
  const [fromEmail,    setFromEmail]   = useState('')
  const [showApiKey,   setShowApiKey]  = useState(false)
  const [loaded,       setLoaded]      = useState(false)
  const [isSaving,     startSave]      = useTransition()
  const [isTesting,    startTest]      = useTransition()
  const toast = useToast()

  useEffect(() => {
    getEmailSettings().then((res) => {
      if (res.success) {
        setApiKey(res.data.resendApiKey)
        setFromEmail(res.data.resendFromEmail)
      }
      setLoaded(true)
    })
  }, [])

  function handleSave() {
    startSave(async () => {
      const res = await updateEmailSettings(apiKey, fromEmail)
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

  const isConfigured = Boolean(apiKey && fromEmail)

  return (
    <div className="space-y-5">
      <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>

      {!isConfigured && (
        <div className="rounded-md border border-border/60 bg-surface-2 p-3">
          <p className="font-mono text-xs text-muted leading-relaxed">{d.notConfigured}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block font-mono text-xs text-text-muted">{d.resendApiKey}</label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            placeholder={d.resendKeyPlaceholder}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 pr-9 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowApiKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
            tabIndex={-1}
          >
            {showApiKey ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block font-mono text-xs text-text-muted">{d.fromEmailLabel}</label>
        <input
          type="email"
          value={fromEmail}
          placeholder="noreply@yourdomain.com"
          onChange={(e) => setFromEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
        />
        <p className="font-mono text-[10px] text-muted leading-relaxed">
          {d.fromEmailHint}
        </p>
      </div>

      <div className="pt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          onClick={handleTest}
          disabled={isTesting || !isConfigured}
          className="w-full sm:w-auto rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTesting ? d.testing : d.testEmail}
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
  )
}
