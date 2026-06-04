'use client'

import { useEffect, useState, useTransition } from 'react'
import { Eye, EyeOff, RotateCcw, ChevronDown } from 'lucide-react'
import {
  getEnvSettings,
  updateEnvVar,
  clearEnvVar,
  clearAllEnvVars,
  type EnvSettings,
} from '@/lib/actions/settings.actions'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { SectionLoader } from '@/components/ui/atoms/SectionLoader'
import { useToast } from '@/lib/hooks/useToast'
import type { Dictionary } from '@/locales/en'

type D = Dictionary['settings']['variables']

export type EnvVarsSectionProps = {
  d:           D
  loadingText: string
}

// Map from field key → app_settings key
const FIELD_KEY_MAP: Record<string, string> = {
  r2Endpoint:         'r2_endpoint',
  r2AccessKeyId:      'r2_access_key_id',
  r2SecretKey:        'r2_secret_key',
  r2BucketName:       'r2_bucket_name',
  r2PublicUrl:        'r2_public_url',
  blobToken:          'blob_token',
  resendApiKey:       'resend_api_key',
  resendFromEmail:    'resend_from_email',
  sesAccessKeyId:     'ses_access_key_id',
  sesSecretAccessKey: 'ses_secret_access_key',
  scraperApiUrl:      'scraper_api_url',
  scraperApiKey:      'scraper_api_key',
  cartumNewPlayer:    'cartum_new_player',
}

const SENSITIVE_FIELDS = new Set([
  'r2AccessKeyId', 'r2SecretKey', 'blobToken', 'resendApiKey', 'scraperApiKey',
  'sesAccessKeyId', 'sesSecretAccessKey',
])

type FieldConfig = {
  fieldKey:  string
  label:     string
  sensitive?: boolean
  hint?:     string
  hintLink?: { label: string; href: string }
}

// ── Single var row ─────────────────────────────────────────────────────────────

function VarRow({
  d,
  fieldKey,
  label,
  sensitive,
  hint,
  hintLink,
  value,
  isOverridden,
  onSaved,
}: FieldConfig & {
  d:           D
  value:       string
  isOverridden: boolean
  onSaved:     (fieldKey: string, newValue: string, cleared: boolean) => void
}) {
  const [localValue, setLocalValue] = useState(value)
  const [visible,    setVisible]    = useState(false)
  const [isSaving,   startSave]     = useTransition()
  const toast = useToast()

  function handleSave() {
    startSave(async () => {
      const res = await updateEnvVar(FIELD_KEY_MAP[fieldKey]!, localValue)
      if (res.success) { toast.success(d.saved); onSaved(fieldKey, localValue, false) }
      else toast.error(res.error ?? 'Error')
    })
  }

  function handleClear() {
    startSave(async () => {
      const res = await clearEnvVar(FIELD_KEY_MAP[fieldKey]!)
      if (res.success) { toast.success(d.saved); onSaved(fieldKey, '', true) }
      else toast.error(res.error ?? 'Error')
    })
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="block font-mono text-xs text-muted">{label}</label>
        <span className={[
          'rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest',
          isOverridden
            ? 'border border-accent/30 bg-accent/10 text-accent'
            : 'border border-border/40 bg-surface text-muted/50',
        ].join(' ')}>
          {isOverridden ? d.overrideBadge : d.envBadge}
        </span>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            type={sensitive && !visible ? 'password' : 'text'}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            disabled={isSaving}
            className={`w-full rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text placeholder:text-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-50 ${sensitive ? 'pr-9' : ''}`}
          />
          {sensitive && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
            >
              {visible ? <EyeOff size={13} strokeWidth={1.8} /> : <Eye size={13} strokeWidth={1.8} />}
            </button>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || localValue === value}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-white hover:bg-primary/80 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isSaving ? d.saving : d.saveButton}
        </button>
        {isOverridden && (
          <button
            onClick={handleClear}
            disabled={isSaving}
            title={d.clearDesc}
            className="shrink-0 rounded-md border border-border px-2 py-1.5 text-muted hover:text-warning hover:border-warning/40 transition-colors cursor-pointer disabled:opacity-40"
          >
            <RotateCcw size={13} strokeWidth={1.8} />
          </button>
        )}
      </div>
      {(hint || hintLink) && (
        <p className="font-mono text-[10px] text-muted/60">
          {hint}
          {hint && hintLink && ' '}
          {hintLink && (
            <a href={hintLink.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {hintLink.label}
            </a>
          )}
        </p>
      )}
    </div>
  )
}

// ── Read-only row ──────────────────────────────────────────────────────────────

function ReadOnlyRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-xs text-muted">{label}</label>
      <div className="flex items-center gap-2 rounded-md border border-border/40 bg-surface-2/40 px-3 py-1.5 font-mono text-xs text-muted/70 cursor-default">
        <span className="flex-1 truncate">{value || '—'}</span>
        <span className="shrink-0 rounded-sm border border-border/50 bg-surface px-1.5 py-0.5 font-mono text-[9px] text-muted/40 uppercase tracking-widest leading-none">
          {note}
        </span>
      </div>
    </div>
  )
}

// ── Group helpers ──────────────────────────────────────────────────────────────

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface-2/20 p-4 space-y-4">
      <p className="font-mono text-[10px] text-muted/70 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  )
}

function AccordionGroup({
  title, children, configured, defaultOpen = false,
  configuredLabel, notConfiguredLabel,
}: {
  title:              string
  children:           React.ReactNode
  configured:         boolean
  defaultOpen?:       boolean
  configuredLabel:    string
  notConfiguredLabel: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors cursor-pointer ${open ? 'bg-surface-2/40' : 'bg-surface-2/20 hover:bg-surface-2/30'}`}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-muted/70 uppercase tracking-widest">{title}</span>
          <span className={`font-mono text-[9px] rounded px-1.5 py-0.5 border ${
            configured
              ? 'border-success/40 text-success bg-success/5'
              : 'border-border text-muted/60 bg-surface-2'
          }`}>
            {configured ? configuredLabel : notConfiguredLabel}
          </span>
        </div>
        <ChevronDown size={12} className={`transition-transform duration-200 text-muted/50 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-250 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-border/40 p-4 space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function EnvVarsSection({ d, loadingText }: EnvVarsSectionProps) {
  const [data, setData]         = useState<EnvSettings | null>(null)
  const [loaded, setLoaded]     = useState(false)
  const [showResetAll, setShowResetAll] = useState(false)
  const [isResetting, startReset] = useTransition()
  const toast = useToast()

  useEffect(() => {
    getEnvSettings().then((res) => {
      if (res.success) setData(res.data)
      setLoaded(true)
    })
  }, [])

  function handleSaved(fieldKey: string, newValue: string, cleared: boolean) {
    if (cleared) {
      // After clearing, re-fetch so the UI reflects the actual .env fallback value
      getEnvSettings().then((res) => { if (res.success) setData(res.data) })
      return
    }
    // For saves, update locally without re-fetch (value is what user just typed)
    type VarField = { value: string; isOverridden: boolean }
    setData((prev) => {
      if (!prev) return prev
      const updated = { ...prev }
      const vk = fieldKey as keyof typeof FIELD_KEY_MAP
      if (vk in prev) {
        ;(updated as Record<string, VarField | string>)[vk] = {
          value:        newValue,
          isOverridden: true,
        }
      }
      return updated
    })
  }

  function handleResetAll() {
    startReset(async () => {
      const res = await clearAllEnvVars()
      setShowResetAll(false)
      if (res.success) {
        toast.success(d.resetAllSuccess)
        getEnvSettings().then((r) => { if (r.success) setData(r.data) })
      }
    })
  }

  if (!loaded) return <SectionLoader text={loadingText} />
  if (!data)   return null

  const makeRow = (fieldKey: string, label: string, hint?: string, hintLink?: { label: string; href: string }) => (
    <VarRow
      key={fieldKey}
      d={d}
      fieldKey={fieldKey}
      label={label}
      sensitive={SENSITIVE_FIELDS.has(fieldKey)}
      hint={hint}
      hintLink={hintLink}
      value={(data[fieldKey as keyof EnvSettings] as { value: string }).value}
      isOverridden={(data[fieldKey as keyof EnvSettings] as { isOverridden: boolean }).isOverridden}
      onSaved={handleSaved}
    />
  )

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-mono text-xs text-muted uppercase tracking-widest flex items-center gap-2">
            {d.title}
            <span className="font-mono text-[8px] text-warning/70 border border-warning/30 rounded px-1.5 py-px leading-none normal-case tracking-normal">super</span>
          </h2>
          <p className="font-mono text-[10px] text-muted/60 leading-relaxed">{d.subtitle}</p>
        </div>
        <button
          onClick={() => setShowResetAll(true)}
          disabled={isResetting}
          className="shrink-0 flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-1.5 font-mono text-xs text-warning hover:bg-warning/20 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RotateCcw size={12} strokeWidth={2} />
          {d.resetAllButton}
        </button>
      </div>

      {/* Reset all confirm modal */}
      {showResetAll && (
        <>
          <div className="fixed inset-0 z-60" aria-hidden onClick={() => setShowResetAll(false)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none p-4">
            <VHSTransition duration="fast" className="w-full max-w-sm pointer-events-auto">
              <div
                role="dialog"
                aria-modal="true"
                className="w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-0.5 w-full bg-warning/70" />
                <div className="px-5 py-5 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-mono text-sm font-semibold text-text">{d.resetAllConfirmTitle}</h3>
                    <p className="font-mono text-xs text-muted leading-relaxed">{d.resetAllConfirmDesc}</p>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
                    <button
                      onClick={() => setShowResetAll(false)}
                      disabled={isResetting}
                      className="rounded-lg border border-border bg-surface-2 px-4 py-1.5 font-mono text-xs text-text hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResetAll}
                      disabled={isResetting}
                      className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-1.5 font-mono text-xs font-semibold text-warning hover:bg-warning/20 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isResetting ? '…' : d.resetAllButton}
                    </button>
                  </div>
                </div>
              </div>
            </VHSTransition>
          </div>
        </>
      )}

      {/* Auth & DB — read-only */}
      <Group title={d.groupAuth}>
        <ReadOnlyRow label={d.authUrl}     value={data.authUrl}     note={d.readOnlyNote} />
        <ReadOnlyRow label={d.dbProvider}  value={data.dbProvider}  note={d.readOnlyNote} />
        <ReadOnlyRow label={d.databaseUrl} value={data.databaseUrl} note={d.readOnlyNote} />
      </Group>

      {/* Almacenamiento — R2 + Blob */}
      <div className="space-y-2">
        <p className="font-mono text-[10px] text-muted/70 uppercase tracking-widest px-1">{d.groupStorage ?? 'Almacenamiento'}</p>
        <AccordionGroup
          title={d.groupR2}
          configured={Boolean(data.r2Endpoint?.value || data.r2AccessKeyId?.value)}
          defaultOpen={false}
          configuredLabel={d.varConfigured ?? 'Configured'}
          notConfiguredLabel={d.varNotConfigured ?? 'Not configured'}
        >
          {makeRow('r2Endpoint',    d.r2Endpoint)}
          {makeRow('r2AccessKeyId', d.r2AccessKeyId)}
          {makeRow('r2SecretKey',   d.r2SecretKey)}
          {makeRow('r2BucketName',  d.r2BucketName)}
          {makeRow('r2PublicUrl',   d.r2PublicUrl)}
        </AccordionGroup>
        <AccordionGroup
          title={d.groupBlob}
          configured={Boolean(data.blobToken?.value)}
          defaultOpen={false}
          configuredLabel={d.varConfigured ?? 'Configured'}
          notConfiguredLabel={d.varNotConfigured ?? 'Not configured'}
        >
          {makeRow('blobToken', d.blobToken)}
        </AccordionGroup>
      </div>

      {/* Email — Resend + AWS SES */}
      <div className="space-y-2">
        <p className="font-mono text-[10px] text-muted/70 uppercase tracking-widest px-1">{d.groupEmail ?? 'Email'}</p>
        <AccordionGroup
          title={d.groupResend}
          configured={Boolean(data.resendApiKey?.value)}
          defaultOpen={false}
          configuredLabel={d.varConfigured ?? 'Configured'}
          notConfiguredLabel={d.varNotConfigured ?? 'Not configured'}
        >
          {makeRow('resendApiKey',    d.resendApiKey)}
          {makeRow('resendFromEmail', d.resendFromEmail)}
        </AccordionGroup>
        <AccordionGroup
          title={d.groupSes ?? 'AWS SES'}
          configured={Boolean(data.sesAccessKeyId?.value || data.sesSecretAccessKey?.value)}
          defaultOpen={false}
          configuredLabel={d.varConfigured ?? 'Configured'}
          notConfiguredLabel={d.varNotConfigured ?? 'Not configured'}
        >
          {makeRow('sesAccessKeyId',     d.sesAccessKeyId     ?? 'AWS SES Access Key ID')}
          {makeRow('sesSecretAccessKey', d.sesSecretAccessKey ?? 'AWS SES Secret Access Key')}
        </AccordionGroup>
      </div>

      {/* Scraper */}
      <AccordionGroup
        title={d.groupScraper}
        configured={Boolean(data.scraperApiUrl?.value)}
        defaultOpen={false}
        configuredLabel={d.varConfigured ?? 'Configured'}
        notConfiguredLabel={d.varNotConfigured ?? 'Not configured'}
      >
        {makeRow('scraperApiUrl', d.scraperApiUrl)}
        {makeRow('scraperApiKey', d.scraperApiKey)}
      </AccordionGroup>

      {/* Misc */}
      <Group title={d.groupMisc}>
        {makeRow('cartumNewPlayer', d.cartumNewPlayer, d.cartumNewPlayerHint, { label: d.cartumNewPlayerLinkLabel, href: '/cartum-player' })}
      </Group>
    </div>
  )
}
