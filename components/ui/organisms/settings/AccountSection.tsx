'use client'

import { useRef, useState, useTransition, useCallback, useEffect } from 'react'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'
import { requestEmailChangeAction, confirmEmailChangeAction, changePasswordAction } from '@/lib/actions/account.actions'
import { t } from '@/lib/i18n/t'
import type { Dictionary } from '@/locales/en'

export type AccountSectionProps = {
  currentEmail: string
  d: Dictionary['settings']['account']
}

type Step = 'form' | 'verify' | 'success'

export function AccountSection({ currentEmail, d }: AccountSectionProps) {
  const [step, setStep]               = useState<Step>('form')
  const [pendingEmail, setPendingEmail] = useState('')
  const [displayEmail, setDisplayEmail] = useState(currentEmail)
  const [fieldError, setFieldError]   = useState('')
  const [codeError, setCodeError]     = useState('')
  const [isPending, startTransition]  = useTransition()

  // ── OTP digit refs ──────────────────────────────────────────────────────────
  const digitRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null])
  const [digits, setDigits] = useState(['', '', '', ''])

  const setDigitRef = useCallback((i: number) => (el: HTMLInputElement | null) => {
    digitRefs.current[i] = el
  }, [])

  function handleDigitInput(i: number, value: string) {
    const cleaned = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = cleaned
    setDigits(next)
    setCodeError('')
    if (cleaned && i < 3) {
      digitRefs.current[i + 1]?.focus()
    }
  }

  function handleDigitKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      digitRefs.current[i - 1]?.focus()
    }
  }

  function handleDigitPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (text.length === 4) {
      e.preventDefault()
      setDigits(text.split(''))
      setCodeError('')
      digitRefs.current[3]?.focus()
    }
  }

  useEffect(() => {
    if (step === 'verify') {
      digitRefs.current[0]?.focus()
    }
  }, [step])

  // ── Step 1: request code ────────────────────────────────────────────────────
  function handleSendCode(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = new FormData(e.currentTarget).get('email') as string
    setFieldError('')

    startTransition(async () => {
      const res = await requestEmailChangeAction({ email })
      if (!res.success) {
        const map: Record<string, string> = {
          email_invalid: d.errors.emailInvalid,
          email_taken:   d.errors.emailTaken,
          same_email:    d.errors.sameEmail,
        }
        setFieldError(map[res.error] ?? d.errors.unknown)
        return
      }
      setPendingEmail(res.data.pendingEmail)
      setStep('verify')
    })
  }

  // ── Step 2: confirm code ────────────────────────────────────────────────────
  function handleConfirm(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const code = digits.join('')
    setCodeError('')

    startTransition(async () => {
      const res = await confirmEmailChangeAction({ code })
      if (!res.success) {
        setCodeError(d.errors.invalidCode)
        setDigits(['', '', '', ''])
        digitRefs.current[0]?.focus()
        return
      }
      setDisplayEmail(res.data.newEmail)
      setStep('success')
    })
  }

  function handleResend() {
    setDigits(['', '', '', ''])
    setCodeError('')
    startTransition(async () => {
      await requestEmailChangeAction({ email: pendingEmail })
      digitRefs.current[0]?.focus()
    })
  }

  function handleReset() {
    setStep('form')
    setPendingEmail('')
    setDigits(['', '', '', ''])
    setFieldError('')
    setCodeError('')
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest mb-4">
          {d.title}
        </h2>
      </div>

      {/* Current email display */}
      <div className="space-y-1">
        <label className="block font-mono text-xs text-muted uppercase tracking-wider">
          {d.currentEmail}
        </label>
        <div className="flex h-9 items-center rounded-md border border-border bg-bg px-3 font-mono text-sm text-text overflow-hidden">
          <span className="truncate">{displayEmail}</span>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* ── Step: form ─────────────────────────────────────────────────────── */}
      {step === 'form' && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="block font-mono text-xs text-muted uppercase tracking-wider">
              {d.newEmail}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={d.newEmailPlaceholder}
              disabled={isPending}
              className="w-full h-9 rounded-md border border-border bg-bg px-3 font-mono text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors disabled:opacity-50"
            />
            {fieldError && (
              <p className="font-mono text-xs text-danger pt-0.5">{fieldError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="h-8 rounded-md bg-primary px-4 font-mono text-xs font-bold text-white hover:bg-primary/80 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isPending ? d.sending : d.sendCode}
          </button>
        </form>
      )}

      {/* ── Step: verify ───────────────────────────────────────────────────── */}
      {step === 'verify' && (
        <div className="space-y-5">
          <p className="font-mono text-xs text-muted leading-relaxed">
            {t(d, 'codeSentTo', { email: pendingEmail })}
          </p>

          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="space-y-2">
              <label className="block font-mono text-xs text-muted uppercase tracking-wider">
                {d.codeLabel}
              </label>

              {/* 4-digit OTP input */}
              <div
                className="flex gap-2"
                onPaste={handleDigitPaste}
              >
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={setDigitRef(i)}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={digit}
                    placeholder={d.codePlaceholder}
                    disabled={isPending}
                    onChange={(e) => handleDigitInput(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    aria-label={`Digit ${i + 1}`}
                    className="w-12 h-14 rounded-lg border border-border bg-bg text-center font-mono text-2xl font-bold text-primary caret-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors placeholder:text-muted/30 disabled:opacity-50"
                  />
                ))}
              </div>

              {codeError && (
                <p className="font-mono text-xs text-danger pt-0.5">{codeError}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isPending || digits.join('').length !== 4}
                className="h-8 rounded-md bg-primary px-4 font-mono text-xs font-bold text-white hover:bg-primary/80 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isPending ? d.confirming : d.confirmChange}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={isPending}
                className="h-8 rounded-md border border-border px-3 font-mono text-xs text-muted hover:text-text hover:border-border/80 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {d.resend}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="h-8 px-2 font-mono text-xs text-muted/60 hover:text-muted disabled:opacity-50 transition-colors cursor-pointer ml-auto"
              >
                ✕
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step: success ──────────────────────────────────────────────────── */}
      {step === 'success' && (
        <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3">
          <p className="font-mono text-sm text-success leading-relaxed">
            ✓ {d.emailUpdated}
          </p>
        </div>
      )}

      <div className="h-px bg-border" />

      {/* ── Password section ───────────────────────────────────────────────── */}
      <PasswordSection d={d.password} />
    </section>
  )
}

// ── Password sub-section ──────────────────────────────────────────────────────

function PasswordSection({ d }: { d: Dictionary['settings']['account']['password'] }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [pwError, setPwError]                 = useState('')
  const [pwSuccess, setPwSuccess]             = useState(false)
  const [generateLabel, setGenerateLabel]     = useState(d.generate)
  const [showCurrent, setShowCurrent]         = useState(false)
  const [showNew, setShowNew]                 = useState(false)
  const [isCopied, setIsCopied]               = useState(false)
  const [isPending, startTransition]          = useTransition()
  const newPasswordRef = useRef<HTMLInputElement>(null)

  function handleGenerate() {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+'
    const array   = new Uint8Array(16)
    crypto.getRandomValues(array)
    const password = Array.from(array).map((b) => charset[b % charset.length]).join('')
    setNewPassword(password)
    navigator.clipboard.writeText(password).then(() => {
      setGenerateLabel(d.copied)
      setIsCopied(true)
      setTimeout(() => { setGenerateLabel(d.generate); setIsCopied(false) }, 2000)
    })
    newPasswordRef.current?.focus()
  }

  function handleCopyNew() {
    if (!newPassword) return
    navigator.clipboard.writeText(newPassword).then(() => {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    })
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)

    startTransition(async () => {
      const res = await changePasswordAction({ currentPassword, newPassword })
      if (!res.success) {
        const map: Record<string, string> = {
          wrong_password:   d.errorWrong,
          validation_error: d.errorWeak,
        }
        setPwError(map[res.error] ?? d.errorUnknown)
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 4000)
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-xs text-muted uppercase tracking-widest">
        {d.title}
      </h3>

      {pwSuccess && (
        <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-2">
          <p className="font-mono text-xs text-success">✓ {d.changed}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Current password */}
        <div className="space-y-1">
          <label htmlFor="currentPassword" className="block font-mono text-xs text-muted uppercase tracking-wider">
            {d.currentLabel}
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPwError('') }}
              disabled={isPending}
              className="w-full h-9 rounded-md border border-border bg-bg px-3 pr-9 font-mono text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors cursor-pointer"
              aria-label={showCurrent ? 'Hide password' : 'Show password'}
            >
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {pwError && (
            <p className="font-mono text-xs text-danger pt-0.5">{pwError}</p>
          )}
        </div>

        {/* New password + copy + generate */}
        <div className="space-y-1">
          <label htmlFor="newPassword" className="block font-mono text-xs text-muted uppercase tracking-wider">
            {d.newLabel}
          </label>
          <div className="flex gap-2 min-w-0">
            <div className="relative flex-1 min-w-0">
              <input
                id="newPassword"
                ref={newPasswordRef}
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isPending}
                className="w-full h-9 rounded-md border border-border bg-bg px-3 pr-9 font-mono text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors cursor-pointer"
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleCopyNew}
              disabled={isPending || !newPassword}
              title={d.copy}
              aria-label={d.copy}
              className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-muted hover:text-text hover:border-border/80 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            >
              {isCopied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending}
              className="h-9 rounded-md border border-border px-3 font-mono text-xs text-muted hover:text-text hover:border-border/80 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
            >
              {generateLabel}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || !currentPassword || newPassword.length < 12}
          className="h-8 rounded-md bg-primary px-4 font-mono text-xs font-bold text-white hover:bg-primary/80 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isPending ? d.changing : d.change}
        </button>
      </form>
    </div>
  )
}
