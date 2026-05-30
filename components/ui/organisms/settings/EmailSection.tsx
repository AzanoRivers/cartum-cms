'use client'

import { useEffect, useState, useTransition } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import {
  getEmailSettings,
  updateEmailSettings,
  testEmailConnection,
} from '@/lib/actions/settings.actions'
import { useToast } from '@/lib/hooks/useToast'
import { SectionLoader } from '@/components/ui/atoms/SectionLoader'
import type { Dictionary } from '@/locales/en'

export type EmailSectionProps = {
  isSuperAdmin: boolean
  d:            Dictionary['settings']['email']
  loadingText:  string
}

export function EmailSection({ isSuperAdmin, d, loadingText }: EmailSectionProps) {
  const [apiKey,      setApiKey]     = useState('')      // superAdmin: full key; admin: new key to set
  const [fromEmail,   setFromEmail]  = useState('')
  const [apiKeyIsSet, setApiKeyIsSet] = useState(false)  // whether a key exists (for admin masked view)
  const [showApiKey,  setShowApiKey] = useState(false)
  const [loaded,      setLoaded]     = useState(false)
  const [isSaving,    startSave]     = useTransition()
  const [isTesting,   startTest]     = useTransition()
  const toast = useToast()

  useEffect(() => {
    getEmailSettings().then((res) => {
      if (res.success) {
        setApiKey(res.data.resendApiKey)
        setFromEmail(res.data.resendFromEmail)
        setApiKeyIsSet(res.data.apiKeyIsSet)
      }
      setLoaded(true)
    })
  }, [])

  function handleSave() {
    startSave(async () => {
      const res = await updateEmailSettings(apiKey, fromEmail)
      if (res.success) {
        toast.success(d.saved)
        if (!isSuperAdmin && apiKey) {
          setApiKeyIsSet(true)
          setApiKey('')
        }
      } else {
        toast.error(d.error)
      }
    })
  }

  function handleTest() {
    startTest(async () => {
      const res = await testEmailConnection()
      if (res.success) toast.success(d.testOk)
      else toast.error(d.testFail)
    })
  }

  // Configured = for superAdmin: both fields filled; for admin: key exists + from filled
  const isConfigured = isSuperAdmin
    ? Boolean(apiKey && fromEmail)
    : Boolean(apiKeyIsSet && fromEmail)

  if (!loaded) return <SectionLoader text={loadingText} />

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>
        <p className="font-mono text-[10px] text-muted/60 leading-relaxed">{d.projectScopeNote}</p>
      </div>

      {!isConfigured && (
        <div className="rounded-md border border-border/60 bg-surface-2 p-3">
          <p className="font-mono text-xs text-muted leading-relaxed">{d.notConfigured}</p>
        </div>
      )}

      {/* API key — superAdmin sees current value; admin sees status + replace input */}
      {isSuperAdmin ? (
        <div className="space-y-1.5">
          <label className="block font-mono text-xs text-muted">{d.resendApiKey}</label>
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
      ) : (
        <div className="space-y-3">
          {/* Status badge */}
          <div className="space-y-1.5">
            <label className="block font-mono text-xs text-muted">{d.resendApiKey}</label>
            <div className={[
              'flex h-9 items-center gap-2 rounded-md border px-3 font-mono text-xs',
              apiKeyIsSet
                ? 'border-success/30 bg-success/5 text-success'
                : 'border-danger/30 bg-danger/5 text-danger/70',
            ].join(' ')}>
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{
                background: apiKeyIsSet ? 'var(--color-success)' : 'var(--color-danger)',
              }} />
              {apiKeyIsSet ? d.apiKeySet : d.apiKeyNotSet}
            </div>
          </div>
          {/* Replace input — write-only, no eye toggle */}
          <div className="space-y-1.5">
            <label className="block font-mono text-xs text-muted">{d.apiKeyReplaceLabel}</label>
            <input
              type="password"
              value={apiKey}
              placeholder={d.apiKeyReplacePlaceholder}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
        </div>
      )}

      {/* From email */}
      <div className="space-y-1.5">
        <label className="block font-mono text-xs text-muted">{d.fromEmailLabel}</label>
        <input
          type="email"
          value={fromEmail}
          placeholder="noreply@yourdomain.com"
          onChange={(e) => setFromEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
        />
        <p className="font-mono text-[10px] text-muted/60 leading-relaxed">{d.fromEmailHint}</p>
        {/* Domain warning */}
        <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 font-mono text-[10px] text-warning/80 leading-relaxed">
          ⚠ {d.fromEmailDomainWarning}{' '}
          <a
            href="https://resend.com/domains"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-warning transition-colors"
          >
            resend.com/domains
          </a>
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
          disabled={isSaving || (!apiKey && !fromEmail)}
          className="w-full sm:w-auto rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isSaving ? d.saving : d.save}
        </button>
      </div>
    </div>
  )
}
