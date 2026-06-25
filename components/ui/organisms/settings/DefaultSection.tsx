'use client'

import { useEffect, useState, useTransition } from 'react'
import { ChevronDown, Mail, Eye, EyeOff } from 'lucide-react'
import { cva } from 'class-variance-authority'
import {
  getDefaultEmailSettings,
  updateDefaultEmailProvider,
  updateGlobalResendFromEmail,
  updateGlobalSesFromEmail,
  checkProviderConfiguration,
  testDefaultEmailConnection,
  getDefaultStorageSettings,
  updateDefaultStorageProvider,
  type EmailProvider,
  type StorageProviderType,
} from '@/lib/actions/settings.actions'
import { HardDrive } from 'lucide-react'
import { useToast } from '@/lib/hooks/useToast'
import { useLocalRateLimit } from '@/lib/hooks/useLocalRateLimit'
import { RATE_LIMITS } from '@/lib/rate-limits'
import { SectionLoader } from '@/components/ui/atoms/SectionLoader'
import { Spinner } from '@/components/ui/atoms/Spinner'
import type { Dictionary } from '@/locales/en'

export type DefaultSectionProps = {
  d:           Dictionary['settings']['defaults']
  loadingText: string
}

const providerBtn = cva(
  'w-full rounded-md border px-3 py-2 font-mono text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
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

const inputCls = 'w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors'

type ProviderStatus = { configured: boolean; error?: string } | null

function FromEmailField({
  label, value, onChange, onSave, saving, warning, placeholder, saveLabel, savingLabel,
}: {
  label:        string
  value:        string
  onChange:     (v: string) => void
  onSave:       () => void
  saving:       boolean
  warning:      string
  placeholder:  string
  saveLabel:    string
  savingLabel:  string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-[10px] text-muted/70 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          data-lpignore="true"
          data-form-type="other"
          className={`${inputCls} pr-9`}
        />
        <button type="button" tabIndex={-1} onClick={() => setShow(v => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
        >
          {show ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
        </button>
      </div>
      <p className="font-mono text-[9px] text-warning/80 leading-relaxed">⚠ {warning}</p>
      <div className="flex justify-end">
        <button onClick={onSave} disabled={saving || !value}
          className="rounded-md bg-primary px-3 py-1 font-mono text-xs text-white hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? savingLabel : saveLabel}
        </button>
      </div>
    </div>
  )
}

export function DefaultSection({ d, loadingText }: DefaultSectionProps) {
  const [loaded,            setLoaded]            = useState(false)
  const [provider,          setProvider]          = useState<EmailProvider>('resend')
  const [open,              setOpen]              = useState(false)
  const [storageProvider,   setStorageProvider]   = useState<StorageProviderType>('r2')
  const [r2Configured,      setR2Configured]      = useState(false)
  const [blobConfigured,    setBlobConfigured]     = useState(false)
  const [storageOpen,       setStorageOpen]        = useState(false)
  const [isSavingStorage,   startSaveStorage]      = useTransition()
  const [resendStatus,    setResendStatus]    = useState<ProviderStatus>(null)
  const [sesStatus,       setSesStatus]       = useState<ProviderStatus>(null)
  const [checkingStatus,  setCheckingStatus]  = useState(false)
  const [resendFromEmail, setResendFromEmail] = useState('')
  const [sesFromEmail,    setSesFromEmail]    = useState('')
  const [testTo,          setTestTo]          = useState('')
  const [testingProvider, setTestingProvider] = useState<EmailProvider>('resend')
  const [isSavingResendFrom, startSaveResendFrom] = useTransition()
  const [isSavingSesFrom,    startSaveSesFrom]    = useTransition()
  const [isTesting,          startTest]           = useTransition()
  const [isSaving,           startSave]           = useTransition()
  const toast  = useToast()
  const localRL = useLocalRateLimit(RATE_LIMITS.EMAIL_TEST.key)

  async function refreshStatus() {
    setCheckingStatus(true)
    const [r, s] = await Promise.all([
      checkProviderConfiguration('resend'),
      checkProviderConfiguration('ses'),
    ])
    if (r.success) setResendStatus(r.data)
    if (s.success) setSesStatus(s.data)
    setCheckingStatus(false)
  }

  useEffect(() => {
    Promise.all([
      getDefaultEmailSettings(),
      getDefaultStorageSettings(),
    ]).then(([emailRes, storageRes]) => {
      if (emailRes.success) {
        setProvider(emailRes.data.defaultProvider)
        setResendFromEmail(emailRes.data.resendFromEmail)
        setSesFromEmail(emailRes.data.sesFromEmail)
        setTestingProvider(emailRes.data.defaultProvider)
      }
      if (storageRes.success) {
        setStorageProvider(storageRes.data.defaultProvider)
        setR2Configured(storageRes.data.r2Configured)
        setBlobConfigured(storageRes.data.blobConfigured)
      }
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (loaded) refreshStatus()
  }, [loaded])

  function handleSave(p: EmailProvider) {
    const status = p === 'resend' ? resendStatus : sesStatus
    if (!status?.configured) {
      toast.error(d.notConfiguredError ?? 'Provider not configured — configure credentials first.')
      return
    }
    startSave(async () => {
      const res = await updateDefaultEmailProvider(p)
      if (res.success) { setProvider(p); setTestingProvider(p); toast.success(d.saved) }
      else toast.error(d.error)
    })
  }

  function handleTest() {
    if (!testTo.trim()) { toast.error(d.testToRequired ?? 'Enter a destination email.'); return }
    if (localRL.blocked) {
      toast.error(d.rateLimited ?? 'Too many tests.', { description: `${d.retryIn ?? 'Retry in'} ${localRL.countdown}` })
      return
    }
    startTest(async () => {
      const fromOverride = testingProvider === 'resend'
        ? (resendFromEmail || undefined)
        : (sesFromEmail || undefined)
      const res = await testDefaultEmailConnection(testingProvider, testTo, fromOverride)
      if (res.success) {
        toast.success(d.testOk ?? 'Test email sent.')
        if (res.nextAllowedAt) localRL.markBlocked(res.nextAllowedAt)
      } else {
        if (res.error === 'RATE_LIMITED' && res.nextAllowedAt) {
          localRL.markBlocked(res.nextAllowedAt)
          toast.error(d.rateLimited ?? 'Too many tests.', { description: `${d.retryIn ?? 'Retry in'} ${localRL.countdown}` })
        } else {
          toast.error(d.testFail ?? 'Could not send test email.', res.error ? { description: res.error } : undefined)
        }
      }
    })
  }

  function StatusBadge({ status }: { status: ProviderStatus }) {
    if (checkingStatus) return <Spinner size="sm" color="muted" />
    if (!status) return null
    return (
      <span className={`font-mono text-[9px] rounded px-1.5 py-0.5 border ${
        status.configured
          ? 'border-success/40 text-success bg-success/5'
          : 'border-danger/30 text-danger/70 bg-danger/5'
      }`}>
        {status.configured ? (d.configured ?? 'Configured') : (d.notConfigured ?? 'Not configured')}
      </span>
    )
  }

  if (!loaded) return <SectionLoader text={loadingText} />

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest flex items-center gap-2">
          {d.title}
          <span className="font-mono text-[8px] text-warning/70 border border-warning/30 rounded px-1.5 py-px leading-none normal-case tracking-normal">super</span>
        </h2>
        <p className="font-mono text-[10px] text-muted/60 leading-relaxed">{d.subtitle}</p>
      </div>

      {/* Storage provider accordion */}
      <div className="rounded-md border border-border overflow-hidden">
        <button type="button" onClick={() => setStorageOpen(v => !v)}
          className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors cursor-pointer ${storageOpen ? 'bg-primary/10' : 'bg-primary/5 hover:bg-primary/10'}`}
        >
          <div className="flex items-center gap-2">
            <HardDrive size={13} className={storageOpen ? 'text-primary' : 'text-muted'} />
            <span className={`font-mono text-xs font-semibold ${storageOpen ? 'text-primary' : 'text-text'}`}>
              {d.storageSection ?? 'Storage Provider'}
            </span>
          </div>
          <ChevronDown size={13} className={`transition-transform duration-300 ${storageOpen ? 'rotate-180 text-primary' : 'text-muted'}`} />
        </button>
        <div className={`grid transition-[grid-template-rows] duration-280 ${storageOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
              <p className="font-mono text-[10px] text-muted/60 leading-relaxed">
                {d.storageDesc ?? 'Select the default storage provider for new media uploads across all projects.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['r2', 'blob'] as StorageProviderType[]).map((p) => {
                  const configured = p === 'r2' ? r2Configured : blobConfigured
                  const isDefault  = storageProvider === p
                  return (
                    <div key={p} className={`flex flex-col gap-3 rounded-md border p-3 transition-colors ${isDefault ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-surface-2/30'}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-text">
                          {p === 'r2' ? 'Cloudflare R2' : 'Vercel Blob'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isDefault && (
                            <span className="font-mono text-[9px] rounded px-1.5 py-0.5 border border-primary/50 text-primary bg-primary/10">
                              ✓ {d.defaultBadge ?? 'Default'}
                            </span>
                          )}
                          <span className={`font-mono text-[9px] rounded px-1.5 py-0.5 border ${configured ? 'border-success/40 text-success bg-success/5' : 'border-danger/30 text-danger/70 bg-danger/5'}`}>
                            {configured ? (d.configured ?? 'Configured') : (d.notConfigured ?? 'Not configured')}
                          </span>
                        </div>
                      </div>
                      <button type="button"
                        disabled={isSavingStorage || !configured || isDefault}
                        onClick={() => startSaveStorage(async () => {
                          const res = await updateDefaultStorageProvider(p)
                          if (res.success) { setStorageProvider(p); toast.success(d.saved) }
                          else toast.error(res.error ?? d.error)
                        })}
                        className={providerBtn({ active: isDefault })}
                      >
                        {isDefault ? `✓ ${d.active}` : (d.setAsDefault ?? 'Set as default')}
                      </button>
                    </div>
                  )
                })}
              </div>
              {(!r2Configured && !blobConfigured) && (
                <p className="font-mono text-[10px] text-warning/80">
                  ⚠ {d.storageNotConfiguredNote ?? 'No storage provider is configured globally. Set credentials in Variables section first.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email provider accordion */}
      <div className="rounded-md border border-border overflow-hidden">
        <button type="button" onClick={() => setOpen(v => !v)}
          className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors cursor-pointer ${open ? 'bg-primary/10' : 'bg-primary/5 hover:bg-primary/10'}`}
        >
          <div className="flex items-center gap-2">
            <Mail size={13} className={open ? 'text-primary' : 'text-muted'} />
            <span className={`font-mono text-xs font-semibold ${open ? 'text-primary' : 'text-text'}`}>
              {d.emailSection}
            </span>
          </div>
          <ChevronDown size={13} className={`transition-transform duration-300 ${open ? 'rotate-180 text-primary' : 'text-muted'}`} />
        </button>

        <div className={`grid transition-[grid-template-rows] duration-280 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-5">
              <p className="font-mono text-[10px] text-muted/60 leading-relaxed">{d.emailDesc}</p>

              {/* From email fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FromEmailField
                  label={d.resendFromEmailLabel ?? 'RESEND_FROM_EMAIL (global)'}
                  value={resendFromEmail}
                  onChange={setResendFromEmail}
                  onSave={() => startSaveResendFrom(async () => {
                    const res = await updateGlobalResendFromEmail(resendFromEmail)
                    if (res.success) { toast.success(d.saved); await refreshStatus() }
                    else toast.error(d.error)
                  })}
                  saving={isSavingResendFrom}
                  warning={d.resendFromEmailWarning ?? 'Must be from a verified domain in your Resend account.'}
                  placeholder="noreply@yourdomain.com"
                  saveLabel={d.save}
                  savingLabel={d.saving}
                />
                <FromEmailField
                  label={d.sesFromEmailLabel ?? 'AWS_SES_FROM_EMAIL (global)'}
                  value={sesFromEmail}
                  onChange={setSesFromEmail}
                  onSave={() => startSaveSesFrom(async () => {
                    const res = await updateGlobalSesFromEmail(sesFromEmail)
                    if (res.success) { toast.success(d.saved); await refreshStatus() }
                    else toast.error(d.error)
                  })}
                  saving={isSavingSesFrom}
                  warning={d.sesFromEmailWarning ?? 'The sender domain must be verified in AWS SES. Unverified domains will cause delivery failures.'}
                  placeholder="cartum@azanolabs.com"
                  saveLabel={d.save}
                  savingLabel={d.saving}
                />
              </div>

              {/* Provider cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Resend */}
                <div className={`flex flex-col gap-3 rounded-md border p-3 transition-colors ${provider === 'resend' ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-surface-2/30'}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-text">{d.resend}</span>
                    <div className="flex items-center gap-1.5">
                      {provider === 'resend' && (
                        <span className="font-mono text-[9px] rounded px-1.5 py-0.5 border border-primary/50 text-primary bg-primary/10">
                          ✓ {d.defaultBadge ?? 'Default'}
                        </span>
                      )}
                      <StatusBadge status={resendStatus} />
                    </div>
                  </div>
                  {resendStatus && !resendStatus.configured && (
                    <p className="font-mono text-[9px] text-danger/70 leading-relaxed">{resendStatus.error}</p>
                  )}
                  <button type="button" onClick={() => handleSave('resend')}
                    disabled={isSaving || !resendStatus?.configured || provider === 'resend'}
                    className={providerBtn({ active: provider === 'resend' })}
                  >
                    {provider === 'resend' ? `✓ ${d.active}` : (d.setAsDefault ?? 'Set as default')}
                  </button>
                </div>

                {/* AWS SES */}
                <div className={`flex flex-col gap-3 rounded-md border p-3 transition-colors ${provider === 'ses' ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-surface-2/30'}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-text">{d.ses}</span>
                    <div className="flex items-center gap-1.5">
                      {provider === 'ses' && (
                        <span className="font-mono text-[9px] rounded px-1.5 py-0.5 border border-primary/50 text-primary bg-primary/10">
                          ✓ {d.defaultBadge ?? 'Default'}
                        </span>
                      )}
                      <StatusBadge status={sesStatus} />
                    </div>
                  </div>
                  {sesStatus && !sesStatus.configured && (
                    <p className="font-mono text-[9px] text-danger/70 leading-relaxed">{sesStatus.error}</p>
                  )}
                  <button type="button" onClick={() => handleSave('ses')}
                    disabled={isSaving || !sesStatus?.configured || provider === 'ses'}
                    className={providerBtn({ active: provider === 'ses' })}
                  >
                    {provider === 'ses' ? `✓ ${d.active}` : (d.setAsDefault ?? 'Set as default')}
                  </button>
                </div>
              </div>

              {/* Test email section */}
              <div className="rounded-md border border-border/60 bg-surface-2/20 p-3 space-y-3">
                <p className="font-mono text-[10px] text-muted/70 uppercase tracking-wider">
                  {d.testSectionTitle ?? 'Send test email'}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted/50" />
                    <input
                      type="email"
                      value={testTo}
                      onChange={(e) => setTestTo(e.target.value)}
                      placeholder={d.testToPlaceholder ?? 'email@example.com'}
                      autoComplete="email"
                      className="w-full rounded-md border border-border bg-surface-2 pl-7 pr-3 py-1.5 font-mono text-xs text-text placeholder-muted/40 outline-none focus:border-primary/60 transition-colors"
                    />
                  </div>
                  {/* Provider selector for test */}
                  <select
                    value={testingProvider}
                    onChange={(e) => setTestingProvider(e.target.value as EmailProvider)}
                    className="rounded-md border border-border bg-surface-2 px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-primary/60 transition-colors cursor-pointer"
                  >
                    <option value="resend">{d.resend}</option>
                    <option value="ses">{d.ses}</option>
                  </select>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={handleTest}
                      disabled={isTesting || localRL.blocked || !testTo.trim() || !(testingProvider === 'resend' ? resendStatus?.configured : sesStatus?.configured)}
                      className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isTesting ? (d.testing ?? '…') : (d.testEmail ?? 'Send test')}
                    </button>
                    {localRL.blocked && localRL.countdown && (
                      <span className="font-mono text-[10px] text-warning/70">
                        {d.retryIn ?? 'Retry in'} {localRL.countdown}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
