'use client'

import { useEffect, useState, useTransition } from 'react'
import { cva } from 'class-variance-authority'
import { ChevronDown, Check, Eye, EyeOff } from 'lucide-react'
import {
  getStorageSettings,
  updateStorageSettings,
  updateStorageProvider,
  testStorageConnection,
  testBlobConnection,
  getStorageStatus,
} from '@/lib/actions/settings.actions'
import { Badge } from '@/components/ui/atoms/Badge'
import { DocLink } from '@/components/ui/atoms/DocLink'
import { useToast } from '@/lib/hooks/useToast'
import { t } from '@/lib/i18n/t'
import { SectionLoader } from '@/components/ui/atoms/SectionLoader'
import type { Dictionary } from '@/locales/en'
import type { StorageSettings, StorageSettingsIsSet, StorageProvider } from '@/types/settings'

export type StorageSectionProps = {
  d:            Dictionary['settings']['storage']
  isSuperAdmin: boolean
  isAdmin:      boolean
  loadingText:  string
  canActions?:  boolean
}

type StorageStatus = {
  r2Configured:   boolean
  blobConfigured: boolean
  activeProvider: StorageProvider
}

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

const inputCls =
  'w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors'

const ghostBtnCls =
  'rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

// ── Masked field helpers ───────────────────────────────────────────────────────

function IsSetBadge({ isSet, d }: { isSet: boolean; d: { fieldSet: string; fieldNotSet: string } }) {
  return (
    <div className={[
      'flex h-9 items-center gap-2 rounded-md border px-3 font-mono text-xs',
      isSet
        ? 'border-success/30 bg-success/5 text-success'
        : 'border-danger/30 bg-danger/5 text-danger/70',
    ].join(' ')}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{
        background: isSet ? 'var(--color-success)' : 'var(--color-danger)',
      }} />
      {isSet ? d.fieldSet : d.fieldNotSet}
    </div>
  )
}

function MaskedField({
  label, isSet, placeholder, value, onChange, d, disabled,
}: {
  label:       string
  isSet:       boolean
  placeholder: string
  value:       string
  onChange:    (v: string) => void
  d:           { fieldSet: string; fieldNotSet: string; fieldReplaceLabel: string }
  disabled?:   boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-xs text-muted">{label}</label>
      <IsSetBadge isSet={isSet} d={d} />
      <label className="block font-mono text-[10px] text-muted/60 pt-0.5">{d.fieldReplaceLabel}</label>
      <input
        type="password"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        disabled={disabled}
        className={inputCls + ' disabled:opacity-50 disabled:cursor-not-allowed'}
      />
    </div>
  )
}

function RevealField({
  label, value, placeholder, onChange,
  showLabel, hideLabel, disabled,
}: {
  label:       string
  value:       string
  placeholder: string
  onChange:    (v: string) => void
  showLabel:   string
  hideLabel:   string
  disabled?:   boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-xs text-muted">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputCls + ' pr-16 disabled:opacity-50 disabled:cursor-not-allowed'}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function StorageSection({ d, isSuperAdmin, isAdmin, loadingText, canActions = true }: StorageSectionProps) {
  const canManage = isSuperAdmin || isAdmin

  const [form, setForm]     = useState<StorageSettings>({
    r2Endpoint: '', r2AccessKeyId: '', r2SecretAccessKey: '',
    r2BucketName: '', r2PublicUrl: '', storageProvider: 'r2',
  })
  const [isSet, setIsSet]   = useState<StorageSettingsIsSet>({
    r2Endpoint: false, r2AccessKeyId: false, r2SecretAccessKey: false,
    r2BucketName: false, r2PublicUrl: false, mediaVpsUrl: false, mediaVpsKey: false, blobToken: false,
  })
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [r2Open, setR2Open]     = useState(false)
  const [blobOpen, setBlobOpen] = useState(false)
  const [vpsOpen, setVpsOpen]   = useState(false)
  const [r2TestResult, setR2TestResult]     = useState<string | null>(null)
  const [blobTestResult, setBlobTestResult] = useState<string | null>(null)

  const [pendingProvider, setPendingProvider] = useState<StorageProvider>('r2')
  const [isSaving, startSave]          = useTransition()
  const [isR2Testing, startR2Test]     = useTransition()
  const [isBlobTesting, startBlobTest] = useTransition()
  const [isSwitching, startSwitch]     = useTransition()
  const toast = useToast()

  useEffect(() => {
    Promise.all([getStorageSettings(), getStorageStatus()]).then(([settingsRes, statusRes]) => {
      if (settingsRes.success) {
        setForm(settingsRes.data.settings)
        setIsSet(settingsRes.data.isSet)
      }
      if (statusRes.success) {
        setStatus(statusRes.data)
        setPendingProvider(statusRes.data.activeProvider)
      }
      setLoaded(true)
    })
  }, [])

  function handleChange(field: keyof StorageSettings, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setR2TestResult(null)
    setBlobTestResult(null)
  }

  // Validate admin can switch to a provider: target must have credentials configured or entered
  function canSwitchTo(provider: StorageProvider): boolean {
    if (isSuperAdmin) return true // superAdmin: any switch when bothConfigured (checked at render)
    if (provider === 'r2') {
      const hasExisting = isSet.r2Endpoint && isSet.r2AccessKeyId && isSet.r2SecretAccessKey && isSet.r2BucketName
      const hasEntered  = !!(form.r2Endpoint && form.r2AccessKeyId && form.r2SecretAccessKey && form.r2BucketName)
      return hasExisting || hasEntered
    }
    // blob
    return isSet.blobToken || !!form.blobToken
  }

  function handleProviderSwitch(provider: StorageProvider) {
    if (!canActions || provider === pendingProvider) return
    if (!canSwitchTo(provider)) {
      toast.error(d.providerMissingCredentials ?? 'Configure the required credentials for this provider before switching.')
      return
    }
    setPendingProvider(provider)  // only update UI — not saved yet
  }

  function handleSaveProvider() {
    if (!canActions || pendingProvider === activeProvider) return
    startSwitch(async () => {
      const res = await updateStorageProvider(pendingProvider)
      if (res.success) {
        setForm((prev) => ({ ...prev, storageProvider: pendingProvider }))
        setStatus((prev) => prev ? { ...prev, activeProvider: pendingProvider } : prev)
        toast.success(d.providerSaved)
      } else {
        toast.error(res.error ?? d.providerError)
        setPendingProvider(status?.activeProvider ?? form.storageProvider)  // revert on error
      }
    })
  }

  function handleSave() {
    if (!canActions) return
    startSave(async () => {
      const res = await updateStorageSettings(form)
      if (res.success) {
        toast.success(d.saved)
        const statusRes = await getStorageStatus()
        if (statusRes.success) setStatus(statusRes.data)
        // Re-fetch to get updated isSet status
        getStorageSettings().then((r) => {
          if (r.success) { setIsSet(r.data.isSet); setForm(r.data.settings) }
        })
      } else {
        toast.error(d.error)
      }
    })
  }

  function handleR2Test() {
    if (!canActions) return
    setR2TestResult(null)
    startR2Test(async () => {
      const res = await testStorageConnection()
      if (res.success) setR2TestResult(t(d, 'testOk', { latencyMs: String(res.data.latencyMs) }))
      else toast.error(d.testFail)
    })
  }

  function handleBlobTest() {
    if (!canActions) return
    setBlobTestResult(null)
    startBlobTest(async () => {
      const res = await testBlobConnection()
      if (res.success) setBlobTestResult(d.testBlobOk)
      else toast.error(d.testBlobFail)
    })
  }

  if (!loaded) return <SectionLoader text={loadingText} />

  const activeProvider            = status?.activeProvider ?? form.storageProvider
  const bothConfigured            = !!(status?.r2Configured && status?.blobConfigured)
  const providerHasUnsavedChanges = pendingProvider !== activeProvider

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>
        <p className="font-mono text-[10px] text-muted/60">{d.projectScopeNote}</p>
      </div>

      {/* Provider selector — superAdmin (both configured) or admin (always shown, validated on switch) */}
      {canManage && (isSuperAdmin ? bothConfigured : true) && (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2.5">
            <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="font-mono text-xs leading-snug text-primary">
              {isSuperAdmin ? d.providerSelectHint : (d.providerSelectHintAdmin ?? 'To switch provider, first configure the credentials for the target provider in its accordion below, then select it here.')}
            </span>
          </div>
          <span className="block font-mono text-xs text-muted">{d.providerLabel}</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(['r2', 'blob'] as StorageProvider[]).map((provider) => {
              const label     = provider === 'r2' ? d.providerR2 : d.providerBlob
              const isPending = pendingProvider === provider
              const isActive  = activeProvider === provider
              return (
                <button
                  key={provider}
                  type="button"
                  disabled={isSwitching || !canActions}
                  onClick={() => handleProviderSwitch(provider)}
                  className={providerBtn({ active: isPending })}
                >
                  <span className="flex items-center gap-1.5 pr-12">
                    {isPending && <Check size={11} className="shrink-0" />}
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

          {/* Unsaved changes warning + save */}
          {providerHasUnsavedChanges && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
              <span className="font-mono text-[10px] text-warning/90">
                ⚠ {d.providerUnsaved ?? 'Unsaved changes — provider not yet switched.'}
              </span>
              <button
                onClick={handleSaveProvider}
                disabled={isSwitching || !canActions}
                className="shrink-0 rounded-md bg-primary px-3 py-1 font-mono text-[10px] font-semibold text-white hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                {isSwitching ? (d.providerSaved ?? '…') : (d.saveProviderBtn ?? d.providerSaved)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Cloudflare R2 ──────────────────────────────────────────────── */}
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
          {/* Warning */}
          <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 font-mono text-[10px] text-warning/80 leading-relaxed">
            ⚠ {d.r2Warning}
          </p>

          {/* R2 Endpoint */}
          {isSuperAdmin ? (
            <Field label={d.r2Endpoint}>
              <input type="text" value={form.r2Endpoint} placeholder={d.r2EndpointPlaceholder}
                onChange={(e) => handleChange('r2Endpoint', e.target.value)}
                disabled={!canActions}
                className={inputCls + ' disabled:opacity-50 disabled:cursor-not-allowed'} />
            </Field>
          ) : (
            <MaskedField label={d.r2Endpoint} isSet={isSet.r2Endpoint}
              placeholder={d.r2EndpointPlaceholder} value={form.r2Endpoint}
              onChange={(v) => handleChange('r2Endpoint', v)} d={d} disabled={!canActions} />
          )}

          {/* Access Key ID */}
          {isSuperAdmin ? (
            <RevealField label={d.r2AccessKeyId} value={form.r2AccessKeyId}
              placeholder={d.r2AccessKeyIdPlaceholder}
              onChange={(v) => handleChange('r2AccessKeyId', v)}
              showLabel={d.showKey} hideLabel={d.hideKey} disabled={!canActions} />
          ) : (
            <MaskedField label={d.r2AccessKeyId} isSet={isSet.r2AccessKeyId}
              placeholder={d.r2AccessKeyIdPlaceholder} value={form.r2AccessKeyId}
              onChange={(v) => handleChange('r2AccessKeyId', v)} d={d} disabled={!canActions} />
          )}

          {/* Secret Access Key */}
          {isSuperAdmin ? (
            <RevealField label={d.r2SecretAccessKey} value={form.r2SecretAccessKey}
              placeholder={d.r2SecretAccessKeyPlaceholder}
              onChange={(v) => handleChange('r2SecretAccessKey', v)}
              showLabel={d.showKey} hideLabel={d.hideKey} disabled={!canActions} />
          ) : (
            <MaskedField label={d.r2SecretAccessKey} isSet={isSet.r2SecretAccessKey}
              placeholder={d.r2SecretAccessKeyPlaceholder} value={form.r2SecretAccessKey}
              onChange={(v) => handleChange('r2SecretAccessKey', v)} d={d} disabled={!canActions} />
          )}

          {/* Bucket name — non-sensitive, all roles see value */}
          {isSuperAdmin ? (
            <Field label={d.r2BucketName}>
              <input type="text" value={form.r2BucketName} placeholder={d.r2BucketNamePlaceholder}
                onChange={(e) => handleChange('r2BucketName', e.target.value)}
                disabled={!canActions}
                className={inputCls + ' disabled:opacity-50 disabled:cursor-not-allowed'} />
            </Field>
          ) : (
            <MaskedField label={d.r2BucketName} isSet={isSet.r2BucketName}
              placeholder={d.r2BucketNamePlaceholder} value={form.r2BucketName}
              onChange={(v) => handleChange('r2BucketName', v)} d={d} disabled={!canActions} />
          )}

          {/* Public URL — all roles can see (not a secret) */}
          <Field label={d.r2PublicUrl}>
            <input type="url" value={form.r2PublicUrl} placeholder={d.r2PublicUrlPlaceholder}
              onChange={(e) => handleChange('r2PublicUrl', e.target.value)}
              disabled={!canActions}
              className={inputCls + ' disabled:opacity-50 disabled:cursor-not-allowed'} />
          </Field>

          <div className="flex items-center justify-between gap-3 pt-1">
            <a href="https://developers.cloudflare.com/r2/get-started/" target="_blank" rel="noopener noreferrer"
              className="font-mono text-xs text-primary/70 hover:text-primary transition-colors">
              {d.r2DocsLink} ↗
            </a>
            <div className="flex items-center gap-3">
              {r2TestResult && <span className="font-mono text-xs text-success">{r2TestResult}</span>}
              {canManage && (
                <button onClick={handleR2Test} disabled={isR2Testing || !canActions} className={ghostBtnCls}>
                  {isR2Testing ? d.testing : d.testConnection}
                </button>
              )}
            </div>
          </div>
        </div>
      </Accordion>

      {/* ── Vercel Blob ────────────────────────────────────────────────── */}
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
          <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 font-mono text-[10px] text-warning/80 leading-relaxed">
            ⚠ {d.blobWarning}
          </p>

          {isSuperAdmin ? (
            <div className="space-y-1.5">
              <label className="block font-mono text-xs text-muted">{d.blobToken}</label>
              <div className="flex gap-2">
                <BlobTokenField value={form.blobToken ?? ''} placeholder={d.blobTokenPlaceholder}
                  onChange={(v) => handleChange('blobToken', v)} showLabel={d.showKey} hideLabel={d.hideKey}
                  disabled={!canActions} />
              </div>
              <p className="font-mono text-[10px] text-muted/60">{d.blobTokenHint}</p>
            </div>
          ) : (
            <MaskedField label={d.blobToken} isSet={isSet.blobToken}
              placeholder={d.blobTokenPlaceholder} value={form.blobToken ?? ''}
              onChange={(v) => handleChange('blobToken', v)} d={d} disabled={!canActions} />
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <a href="https://vercel.com/docs/storage/vercel-blob" target="_blank" rel="noopener noreferrer"
              className="font-mono text-xs text-primary/70 hover:text-primary transition-colors">
              {d.blobDocsLink} ↗
            </a>
            <div className="flex items-center gap-3">
              {blobTestResult && <span className="font-mono text-xs text-success">{blobTestResult}</span>}
              {canManage && (
                <button onClick={handleBlobTest} disabled={isBlobTesting || !canActions} className={ghostBtnCls}>
                  {isBlobTesting ? d.testing : d.testBlob}
                </button>
              )}
            </div>
          </div>
        </div>
      </Accordion>

      {/* ── VPS Media Optimizer ────────────────────────────────────────── */}
      <Accordion
        open={vpsOpen}
        onToggle={() => setVpsOpen((v) => !v)}
        title={d.vpsSectionTitle}
        isActiveProvider={false}
        badgeLabel={isSet.mediaVpsUrl ? d.statusConfigured : d.statusNotConfigured}
        badgeVariant={isSet.mediaVpsUrl ? 'success' : 'muted'}
      >
        <div className="space-y-4 pt-1">
          <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 font-mono text-[10px] text-warning/80 leading-relaxed">
            ⚠ {d.mediaVpsWarning}
          </p>

          {/* VPS URL — superAdmin can edit, admin sees read-only */}
          <Field label={d.mediaVpsUrl}>
            {isSuperAdmin ? (
              <input type="url" value={form.mediaVpsUrl ?? ''} placeholder={d.mediaVpsUrlPlaceholder}
                onChange={(e) => handleChange('mediaVpsUrl', e.target.value)}
                disabled={!canActions}
                className={inputCls + ' disabled:opacity-50 disabled:cursor-not-allowed'} />
            ) : (
              <div className="flex h-9 items-center gap-2 rounded-md border border-border/40 bg-surface-2/40 px-3 font-mono text-sm text-muted/70 overflow-hidden cursor-default">
                <span className="truncate flex-1">{form.mediaVpsUrl || d.mediaVpsUrlPlaceholder}</span>
                <span className="shrink-0 rounded-sm border border-border/50 bg-surface px-1.5 py-0.5 font-mono text-[9px] text-muted/40 uppercase tracking-widest leading-none">
                  read-only
                </span>
              </div>
            )}
            {!isSuperAdmin && (
              <p className="font-mono text-[10px] text-muted/50 mt-1">{d.mediaVpsUrlLocked}</p>
            )}
          </Field>

          {/* VPS Key — superAdmin sees it, admin can only replace */}
          {isSuperAdmin ? (
            <div className="space-y-1.5">
              <label className="block font-mono text-xs text-muted">{d.mediaVpsKey}</label>
              <div className="flex gap-2">
                <VpsKeyField value={form.mediaVpsKey ?? ''} onChange={(v) => handleChange('mediaVpsKey', v)}
                  showLabel={d.showKey} hideLabel={d.hideKey} disabled={!canActions} />
              </div>
              <a href="https://optimus.azanolabs.com/guide" target="_blank" rel="noopener noreferrer"
                className="inline-block mt-1 font-mono text-xs text-primary/70 hover:text-primary transition-colors">
                {d.apiDocsLink} ↗
              </a>
            </div>
          ) : (
            <MaskedField label={d.mediaVpsKey} isSet={isSet.mediaVpsKey}
              placeholder="VPS API key" value={form.mediaVpsKey ?? ''}
              onChange={(v) => handleChange('mediaVpsKey', v)} d={d} disabled={!canActions} />
          )}
        </div>
      </Accordion>

      {/* Docs link */}
      <DocLink href="/docs#storageSetup" label={d.docsLinkLabel} desc={d.docsLinkDesc} />

      {/* Save row */}
      {canManage && (
        <div className="pt-1 space-y-2">
          <p className="font-mono text-[11px] text-muted/60">{d.saveEmptyNotice}</p>
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || !canActions}
              className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? d.saving : d.save}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-xs text-muted">{label}</label>
      {children}
    </div>
  )
}

function BlobTokenField({ value, placeholder, onChange, showLabel, hideLabel, disabled }: {
  value: string; placeholder: string; onChange: (v: string) => void
  showLabel: string; hideLabel: string; disabled?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex gap-2 w-full">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={inputCls + ' flex-1 min-w-0 disabled:opacity-50 disabled:cursor-not-allowed'}
      />
      <button type="button" onClick={() => setShow((v) => !v)}
        className="rounded-md border border-border bg-surface-2 px-3 font-mono text-xs text-muted hover:text-text transition-colors cursor-pointer">
        {show ? hideLabel : showLabel}
      </button>
    </div>
  )
}

function VpsKeyField({ value, onChange, showLabel, hideLabel, disabled }: {
  value: string; onChange: (v: string) => void
  showLabel: string; hideLabel: string; disabled?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex gap-2 w-full">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={inputCls + ' flex-1 min-w-0 disabled:opacity-50 disabled:cursor-not-allowed'}
      />
      <button type="button" onClick={() => setShow((v) => !v)}
        className="rounded-md border border-border bg-surface-2 px-3 font-mono text-xs text-muted hover:text-text transition-colors cursor-pointer">
        {show ? hideLabel : showLabel}
      </button>
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
  const headerBg   = open ? 'bg-primary/10' : 'bg-primary/5 hover:bg-primary/10'
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
          <span className={`font-mono text-xs font-semibold ${titleColor}`}>{title}</span>
          <Badge variant={badgeVariant} size="sm" className="font-mono uppercase tracking-widest">
            {badgeLabel}
          </Badge>
        </div>
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${open ? 'rotate-180 text-primary' : isActiveProvider ? 'text-primary/60' : 'text-muted'}`}
        />
      </button>
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
