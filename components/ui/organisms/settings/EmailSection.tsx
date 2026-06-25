'use client'

import { useEffect, useState, useTransition } from 'react'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import { cva } from 'class-variance-authority'
import {
  getEmailSettings,
  updateEmailSettings,
  updateSesSettings,
  updateEmailProvider,
  testEmailConnection,
  type EmailProvider,
  type EmailTestOverride,
} from '@/lib/actions/settings.actions'
import { Mail } from 'lucide-react'
import { DocLink } from '@/components/ui/atoms/DocLink'
import { useToast } from '@/lib/hooks/useToast'
import { SectionLoader } from '@/components/ui/atoms/SectionLoader'
import type { Dictionary } from '@/locales/en'

export type EmailSectionProps = {
  isSuperAdmin: boolean
  d:            Dictionary['settings']['email']
  loadingText:  string
  canActions?:  boolean
}

const providerBtn = cva(
  'relative rounded-md border px-3 py-2.5 font-mono text-xs text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
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

const inputCls = 'w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

function IsSetBadge({ isSet, d }: { isSet: boolean; d: Dictionary['settings']['email'] }) {
  return (
    <div className={[
      'flex h-8 items-center gap-2 rounded-md border px-3 font-mono text-xs',
      isSet
        ? 'border-success/30 bg-success/5 text-success'
        : 'border-danger/30 bg-danger/5 text-danger/70',
    ].join(' ')}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{
        background: isSet ? 'var(--color-success)' : 'var(--color-danger)',
      }} />
      {isSet ? d.apiKeySet : d.apiKeyNotSet}
    </div>
  )
}

function ProviderBadge({ active, configured, d }: {
  active: boolean
  configured: boolean
  d: Dictionary['settings']['email']
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-mono text-[9px] rounded px-1.5 py-0.5 border ${
        configured ? 'border-success/40 text-success bg-success/5' : 'border-border text-muted bg-surface-2'
      }`}>
        {configured ? d.configured : d.notConfiguredBadge}
      </span>
      {active && (
        <span className="font-mono text-[9px] rounded px-1.5 py-0.5 border border-primary/40 text-primary bg-primary/5">
          {d.active}
        </span>
      )}
    </div>
  )
}

function Accordion({ open, onToggle, title, badges, children }: {
  open:     boolean
  onToggle: () => void
  title:    string
  badges:   React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors cursor-pointer ${open ? 'bg-primary/10' : 'bg-primary/5 hover:bg-primary/10'}`}
      >
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xs font-semibold ${open ? 'text-primary' : 'text-text'}`}>{title}</span>
          {badges}
        </div>
        <ChevronDown size={13} className={`transition-transform duration-300 ${open ? 'rotate-180 text-primary' : 'text-muted'}`} />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-280 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className={`min-h-0 overflow-hidden transition-opacity duration-200 ${open ? 'opacity-100 delay-75' : 'opacity-0'}`}>
          <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export function EmailSection({ isSuperAdmin, d, loadingText, canActions = true }: EmailSectionProps) {
  const [loaded,          setLoaded]          = useState(false)
  const [activeProvider,  setActiveProvider]  = useState<EmailProvider>('resend')  // saved in DB
  const [pendingProvider, setPendingProvider] = useState<EmailProvider>('resend')  // selected in UI
  const [isSavingProvider, startSaveProvider] = useTransition()

  // Resend
  const [resendKey,    setResendKey]    = useState('')
  const [resendFrom,   setResendFrom]   = useState('')
  const [resendKeySet, setResendKeySet] = useState(false)
  const [showResend,   setShowResend]   = useState(false)
  const [resendOpen,   setResendOpen]   = useState(false)

  // AWS SES
  const [sesAk,          setSesAk]          = useState('')
  const [sesSk,          setSesSk]          = useState('')
  const [sesFrom,        setSesFrom]        = useState('')
  const [sesAkSet,       setSesAkSet]       = useState(false)
  const [sesSkSet,       setSesSkSet]       = useState(false)
  const [sesFromEmailIsSet, setSesFromEmailIsSet] = useState(false)
  const [showSesAk,  setShowSesAk]  = useState(false)
  const [showSesSk,  setShowSesSk]  = useState(false)
  const [sesOpen,    setSesOpen]    = useState(false)

  const [testTo,         setTestTo]       = useState('')
  const [isSavingResend, startSaveResend] = useTransition()
  const [isSavingSes,    startSaveSes]    = useTransition()
  const [isTesting,      startTest]       = useTransition()

  const toast = useToast()

  useEffect(() => {
    getEmailSettings().then((res) => {
      if (res.success) {
        setActiveProvider(res.data.activeProvider)
        setPendingProvider(res.data.activeProvider)
        setResendKey(res.data.resendApiKey)
        setResendFrom(res.data.resendFromEmail)
        setResendKeySet(res.data.apiKeyIsSet)
        setSesAk(res.data.sesAccessKeyId)
        setSesSk(res.data.sesSecretKey)
        setSesFrom(res.data.sesFromEmail)
        setSesAkSet(res.data.sesAccessKeyIsSet)
        setSesSkSet(res.data.sesSecretKeyIsSet)
        setSesFromEmailIsSet(res.data.sesFromEmailIsSet)
      }
      setLoaded(true)
    })
  }, [])

  // Validation: can the user actually switch to this provider?
  // Super_admin: needs keys already present OR typed in input fields
  // Admin: must fill replace fields (can't see existing keys)
  function canSwitchTo(p: EmailProvider): boolean {
    if (p === 'resend') {
      return isSuperAdmin
        ? Boolean(resendKey || resendKeySet)   // has existing or typed new
        : Boolean(resendKey)                    // must type new
    }
    // ses
    return isSuperAdmin
      ? Boolean((sesAk || sesAkSet) && (sesSk || sesSkSet))
      : Boolean(sesAk && sesSk)
  }

  function handleProviderSwitch(p: EmailProvider) {
    if (!canActions || p === pendingProvider) return
    if (!canSwitchTo(p)) {
      toast.error(d.providerSwitchError ?? 'Configure credentials for this provider before switching.')
      return
    }
    setPendingProvider(p)   // only update UI — not saved yet
  }

  function handleSaveProvider() {
    if (!canActions || pendingProvider === activeProvider) return
    startSaveProvider(async () => {
      const res = await updateEmailProvider(pendingProvider)
      if (res.success) {
        setActiveProvider(pendingProvider)
        toast.success(d.saved)
      } else {
        toast.error(res.error ?? d.error)
        setPendingProvider(activeProvider)  // revert UI on error
      }
    })
  }

  const providerHasUnsavedChanges = pendingProvider !== activeProvider

  function handleSaveResend() {
    if (!canActions) return
    startSaveResend(async () => {
      const res = await updateEmailSettings(resendKey, resendFrom)
      if (res.success) {
        toast.success(d.saved)
        if (!isSuperAdmin && resendKey) { setResendKeySet(true); setResendKey('') }
      } else toast.error(d.error)
    })
  }

  function handleSaveSes() {
    if (!canActions) return
    startSaveSes(async () => {
      const res = await updateSesSettings(sesAk, sesSk, sesFrom)
      if (res.success) {
        toast.success(d.saved)
        if (!isSuperAdmin) {
          if (sesAk) { setSesAkSet(true); setSesAk('') }
          if (sesSk) { setSesSkSet(true); setSesSk('') }
        }
      } else toast.error(d.error)
    })
  }

  function handleTest(provider: EmailProvider) {
    if (!canActions) return
    startTest(async () => {
      // Always pass the provider being tested (the accordion's provider, not the saved active one)
      // Include any unsaved credentials typed in the form fields
      let override: EmailTestOverride
      if (provider === 'resend') {
        override = { provider: 'resend' }
        if (resendKey)  override.resendApiKey = resendKey
        if (resendFrom) override.resendFrom   = resendFrom
      } else {
        override = { provider: 'ses' }
        if (sesAk)  override.sesAccessKeyId = sesAk
        if (sesSk)  override.sesSecretKey   = sesSk
        if (sesFrom) override.sesFromEmail  = sesFrom
      }
      const res = await testEmailConnection(testTo || undefined, override)
      if (res.success) toast.success(d.testOk)
      else toast.error(d.testFail, res.error ? { description: res.error } : undefined)
    })
  }

  // Can test if: saved credentials exist OR unsaved form values are present
  const resendHasUnsaved = Boolean(resendKey)
  const sesHasUnsaved    = Boolean(sesAk && sesSk)
  const resendConfigured = resendKeySet || resendHasUnsaved
  const sesConfigured    = (sesAkSet && sesSkSet) || sesHasUnsaved
  const anyConfigured    = resendConfigured || sesConfigured

  if (!loaded) return <SectionLoader text={loadingText} />

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>
          <p className="font-mono text-[10px] text-muted/60 leading-relaxed">{d.projectScopeNote}</p>
        </div>
        <DocLink href="/docs#emailSetup" label={d.docsLinkLabel} desc={d.docsLinkDesc} />
      </div>

      {!anyConfigured && (
        <div className="rounded-md border border-border/60 bg-surface-2 p-3">
          <p className="font-mono text-xs text-muted leading-relaxed">{d.notConfigured}</p>
        </div>
      )}

      {/* Credential warning */}
      <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2.5">
        <p className="font-mono text-[10px] text-warning/90 leading-relaxed">
          ⚠ {d.providerSwitchWarning ?? 'To switch provider you must include the ACCESS_KEY for Resend or the ACCESS_KEY_ID + SECRET_ACCESS_KEY for AWS SES, otherwise you cannot save the new email provider configuration.'}
        </p>
      </div>

      {/* Provider selector */}
      <div className="space-y-2">
        <label className="block font-mono text-xs text-muted">{d.providerLabel}</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleProviderSwitch('resend')}
            disabled={!canActions}
            className={providerBtn({ active: pendingProvider === 'resend' })}
          >
            <span className="font-semibold">{d.resendTab}</span>
            {activeProvider === 'resend' && (
              <span className="absolute top-1.5 right-2 font-mono text-[9px] text-primary/70">✓ {d.active}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleProviderSwitch('ses')}
            disabled={!canActions}
            className={providerBtn({ active: pendingProvider === 'ses' })}
          >
            <span className="font-semibold">{d.sesTab}</span>
            {activeProvider === 'ses' && (
              <span className="absolute top-1.5 right-2 font-mono text-[9px] text-primary/70">✓ {d.active}</span>
            )}
          </button>
        </div>

        {/* Unsaved changes warning + save button */}
        {providerHasUnsavedChanges && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
            <span className="font-mono text-[10px] text-warning/90">
              ⚠ {d.unsavedProvider ?? 'Unsaved changes — provider not yet switched.'}
            </span>
            <button
              onClick={handleSaveProvider}
              disabled={isSavingProvider || !canActions}
              className="shrink-0 rounded-md bg-primary px-3 py-1 font-mono text-[10px] font-semibold text-white hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              {isSavingProvider ? d.saving : (d.saveProvider ?? d.save)}
            </button>
          </div>
        )}
      </div>

      {/* Resend accordion */}
      <Accordion
        open={resendOpen}
        onToggle={() => setResendOpen((v) => !v)}
        title={d.resendTab}
        badges={
          <ProviderBadge
            active={activeProvider === 'resend'}
            configured={resendConfigured}
            d={d}
          />
        }
      >
        {isSuperAdmin ? (
          <div className="space-y-1.5">
            <label className="block font-mono text-xs text-muted">{d.resendApiKey}</label>
            <div className="relative">
              <input
                type={showResend ? 'text' : 'password'}
                value={resendKey}
                placeholder={d.resendKeyPlaceholder}
                onChange={(e) => setResendKey(e.target.value)}
                disabled={!canActions}
                className={inputCls}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowResend((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
              >
                {showResend ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block font-mono text-xs text-muted">{d.resendApiKey}</label>
              <IsSetBadge isSet={resendKeySet} d={d} />
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] text-muted/60">{d.apiKeyReplaceLabel}</label>
              <input
                type="password"
                value={resendKey}
                placeholder={d.apiKeyReplacePlaceholder}
                onChange={(e) => setResendKey(e.target.value)}
                autoComplete="off"
                disabled={!canActions}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* From email */}
        <div className="space-y-1.5">
          <label className="block font-mono text-xs text-muted">{d.fromEmailLabel}</label>
          <input
            type="email"
            value={resendFrom}
            placeholder="noreply@yourdomain.com"
            onChange={(e) => setResendFrom(e.target.value)}
            disabled={!canActions}
            className={inputCls}
          />
          <p className="font-mono text-[10px] text-muted/60 leading-relaxed">{d.fromEmailHint}</p>
          <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 font-mono text-[10px] text-warning/80 leading-relaxed">
            ⚠ {d.fromEmailDomainWarning}{' '}
            <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-warning transition-colors">
              resend.com/domains
            </a>
          </p>
        </div>

        {/* Test email input + buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted/50" />
              <input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder={d.testToPlaceholder ?? 'Send test to...'}
                className="w-full rounded-md border border-border bg-surface-2 pl-7 pr-3 py-1.5 font-mono text-xs text-text placeholder-muted/40 outline-none focus:border-primary/60 transition-colors"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={() => handleTest('resend')}
            disabled={isTesting || !resendConfigured || !canActions || !testTo.trim()}
            className="w-full sm:w-auto rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? d.testing : d.testEmail}
          </button>
          <button
            onClick={handleSaveResend}
            disabled={isSavingResend || (!resendKey && !resendFrom) || !canActions}
            className="w-full sm:w-auto rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSavingResend ? d.saving : d.save}
          </button>
          </div>
        </div>
      </Accordion>

      {/* AWS SES accordion — super_admin only sees keys */}
      <Accordion
        open={sesOpen}
        onToggle={() => setSesOpen((v) => !v)}
        title={d.sesTab}
        badges={
          <ProviderBadge
            active={activeProvider === 'ses'}
            configured={sesConfigured}
            d={d}
          />
        }
      >
        {isSuperAdmin ? (
          <>
            <div className="space-y-1.5">
              <label className="block font-mono text-xs text-muted">{d.sesAccessKeyId}</label>
              <div className="relative">
                <input
                  type={showSesAk ? 'text' : 'password'}
                  value={sesAk}
                  placeholder={d.sesKeyPlaceholder}
                  onChange={(e) => setSesAk(e.target.value)}
                  disabled={!canActions}
                  className={inputCls}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowSesAk((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                >
                  {showSesAk ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-xs text-muted">{d.sesSecretKey}</label>
              <div className="relative">
                <input
                  type={showSesSk ? 'text' : 'password'}
                  value={sesSk}
                  placeholder={d.sesSecretPlaceholder}
                  onChange={(e) => setSesSk(e.target.value)}
                  disabled={!canActions}
                  className={inputCls}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowSesSk((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                >
                  {showSesSk ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block font-mono text-xs text-muted">{d.sesAccessKeyId}</label>
              <IsSetBadge isSet={sesAkSet} d={d} />
              <label className="block font-mono text-[10px] text-muted/60">{d.apiKeyReplaceLabel}</label>
              <input type="password" value={sesAk} placeholder={d.sesKeyPlaceholder}
                onChange={(e) => setSesAk(e.target.value)} autoComplete="off"
                disabled={!canActions} className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-xs text-muted">{d.sesSecretKey}</label>
              <IsSetBadge isSet={sesSkSet} d={d} />
              <label className="block font-mono text-[10px] text-muted/60">{d.apiKeyReplaceLabel}</label>
              <input type="password" value={sesSk} placeholder={d.sesSecretPlaceholder}
                onChange={(e) => setSesSk(e.target.value)} autoComplete="off"
                disabled={!canActions} className={inputCls}
              />
            </div>
          </div>
        )}

        {/* AWS SES From email */}
        <div className="space-y-1.5">
          <label className="block font-mono text-xs text-muted">{d.sesFromEmailLabel ?? 'AWS SES From email (AWS_SES_FROM_EMAIL)'}</label>
          {!isSuperAdmin && (
            <IsSetBadge isSet={sesFromEmailIsSet} d={d} />
          )}
          <input
            type="email"
            value={sesFrom}
            placeholder="cartum@azanolabs.com"
            onChange={(e) => setSesFrom(e.target.value)}
            disabled={!canActions}
            className={inputCls}
          />
          <p className="font-mono text-[10px] text-muted/60 leading-relaxed">{d.fromEmailHint}</p>
          <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 font-mono text-[10px] text-warning/80 leading-relaxed">
            ⚠ {d.sesFromEmailDomainWarning ?? d.fromEmailDomainWarning} AWS SES.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted/50" />
              <input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder={d.testToPlaceholder ?? 'Send test to...'}
                className="w-full rounded-md border border-border bg-surface-2 pl-7 pr-3 py-1.5 font-mono text-xs text-text placeholder-muted/40 outline-none focus:border-primary/60 transition-colors"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={() => handleTest('ses')}
            disabled={isTesting || !sesConfigured || !canActions || !testTo.trim()}
            className="w-full sm:w-auto rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? d.testing : d.testEmail}
          </button>
          <button
            onClick={handleSaveSes}
            disabled={isSavingSes || (!sesAk && !sesSk && !sesFrom) || !canActions}
            className="w-full sm:w-auto rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSavingSes ? d.saving : d.save}
          </button>
          </div>
        </div>
      </Accordion>
    </div>
  )
}
