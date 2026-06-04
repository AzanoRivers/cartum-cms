'use client'

import { useActionState, useState, useTransition, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { generateSecurePassword } from '@/lib/utils/password'
import { acceptAndJoin, signInAndAccept, registerAndAccept } from '@/lib/actions/invitations.actions'
import type { getDictionary } from '@/locales'

type InviteDict = ReturnType<typeof getDictionary>['auth']['invite']

export type InviteInfo = {
  invitedEmail: string
  projectName:  string
  roleName:     string
  expired:      boolean
  consumed:     boolean
}

type Props = {
  token:        string
  invite:       InviteInfo
  sessionEmail: string | null
  existingUser: boolean
  dict:         InviteDict
}

// ── Password input with generate/copy ─────────────────────────────────────────

function GeneratedPasswordInput({
  dict,
  disabled,
}: {
  dict:     InviteDict
  disabled: boolean
}) {
  const [password, setPassword] = useState(() => generateSecurePassword())
  const [visible,  setVisible]  = useState(false)
  const [copied,   setCopied]   = useState(false)

  const regenerate = useCallback(() => {
    setPassword(generateSecurePassword())
    setCopied(false)
  }, [])

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [password])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="font-mono text-xs text-muted">{dict.passwordLabel}</label>
        <button
          type="button"
          onClick={regenerate}
          disabled={disabled}
          className="font-mono text-[10px] text-muted hover:text-accent transition-colors disabled:opacity-40"
        >
          ↻ {dict.passwordRegenerate}
        </button>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            name="password"
            type={visible ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setCopied(false) }}
            required
            disabled={disabled}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 pr-14 font-mono text-sm text-accent placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted hover:text-text cursor-pointer"
          >
            {visible ? dict.passwordHide : dict.passwordShow}
          </button>
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={disabled}
          className={`shrink-0 rounded-md border px-3 py-2 font-mono text-xs transition-all disabled:opacity-40 ${
            copied
              ? 'border-success bg-success/10 text-success'
              : 'border-border text-muted hover:border-primary hover:text-primary'
          }`}
        >
          {copied ? dict.passwordCopied : dict.passwordCopy}
        </button>
      </div>
      <p className="font-mono text-[10px] text-danger/70 leading-relaxed">
        {dict.passwordNotice}
      </p>
    </div>
  )
}

// ── Case D: new user registration ─────────────────────────────────────────────

function RegisterForm({ token, dict }: { token: string; dict: InviteDict }) {
  const [state, formAction, isPending] = useActionState<{ error: string } | undefined, FormData>(
    registerAndAccept as (prev: { error: string } | undefined, data: FormData) => Promise<{ error: string } | undefined>,
    undefined,
  )

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <GeneratedPasswordInput dict={dict} disabled={isPending} />
      {state?.error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-primary px-4 py-2 font-mono text-sm text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
      >
        {isPending ? dict.creating : dict.createButton}
      </button>
    </form>
  )
}

// ── Case C: sign in form ──────────────────────────────────────────────────────

function SignInForm({ token, email, dict }: { token: string; email: string; dict: InviteDict }) {
  const [password, setPassword]      = useState('')
  const [showPassword, setShow]      = useState(false)
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    setError(null)
    startTransition(async () => {
      const res = await signInAndAccept(token, password)
      if (res && 'error' in res) setError(res.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label className="font-mono text-xs text-muted">{dict.emailLabel}</label>
        <input
          type="email"
          value={email}
          readOnly
          className="w-full rounded-md border border-border bg-surface-2/60 px-3 py-2 font-mono text-sm text-muted"
        />
      </div>
      <div className="space-y-1.5">
        <label className="font-mono text-xs text-muted">{dict.passwordLabel}</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            disabled={isPending}
            placeholder={dict.passwordPlaceholder}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 pr-14 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted hover:text-text cursor-pointer"
          >
            {showPassword ? dict.passwordHide : dict.passwordShow}
          </button>
        </div>
      </div>
      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending || !password}
        className="w-full rounded-md bg-primary px-4 py-2 font-mono text-sm text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
      >
        {isPending ? dict.signingIn : dict.signInButton}
      </button>
    </form>
  )
}

// ── Case A: accept button ─────────────────────────────────────────────────────

function AcceptButton({ token, dict }: { token: string; dict: InviteDict }) {
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAccept() {
    setError(null)
    startTransition(async () => {
      try {
        await acceptAndJoin(token)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'An error occurred.'
        setError(msg)
      }
    })
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
          {error}
        </p>
      )}
      <button
        onClick={handleAccept}
        disabled={isPending}
        className="w-full rounded-md bg-primary px-4 py-2 font-mono text-sm text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
      >
        {isPending ? dict.accepting : dict.acceptButton}
      </button>
    </div>
  )
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function AcceptInviteCard({ token, invite, sessionEmail, existingUser, dict }: Props) {
  const isError           = invite.expired || invite.consumed
  const isMatchingSession = sessionEmail !== null && sessionEmail === invite.invitedEmail
  const isWrongAccount    = sessionEmail !== null && sessionEmail !== invite.invitedEmail

  const wrongAccountMsg = dict.wrongAccount
    .replace('{current}', sessionEmail ?? '')
    .replace('{expected}', invite.invitedEmail)

  return (
    <div className="rounded-xl border border-border bg-surface shadow-2xl">
      {/* Header */}
      <div className="border-b border-border px-6 py-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2">
            <Image
              src="/images/brand/icon.svg"
              alt="Cartum"
              width={18}
              height={18}
              className="object-contain"
            />
          </div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-muted uppercase">Cartum CMS</span>
        </div>
        {!isError && (
          <>
            <h1 className="font-mono text-base font-semibold text-text">{dict.title}</h1>
            <p className="font-mono text-sm text-muted">
              {dict.subtitle}{' '}
              <span className="text-primary">❝{invite.projectName}❞</span>
              {' '}{dict.subtitleAs}{' '}
              <span className="inline-block rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                {(dict.roleLabels as Record<string, string>)?.[invite.roleName] ?? invite.roleName}
              </span>
            </p>
          </>
        )}
      </div>

      {/* Body */}
      <div className="p-6">
        {invite.expired && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 font-mono text-xs text-danger">
            ⚠ {dict.expired}
          </p>
        )}
        {invite.consumed && !invite.expired && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 font-mono text-xs text-danger">
            ⚠ {dict.consumed}
          </p>
        )}

        {!isError && isWrongAccount && (
          <div className="space-y-3">
            <p className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 font-mono text-xs text-warning">
              ⚠ {wrongAccountMsg}
            </p>
            <p className="font-mono text-xs text-muted text-center">{dict.wrongAccountHint}</p>
          </div>
        )}

        {!isError && isMatchingSession && (
          <div className="space-y-3">
            <p className="font-mono text-xs text-muted">
              {dict.signedInAs} <strong className="text-text">{sessionEmail}</strong>
            </p>
            <AcceptButton token={token} dict={dict} />
          </div>
        )}

        {!isError && !sessionEmail && existingUser && (
          <div className="space-y-3">
            <p className="font-mono text-xs text-text font-medium">{dict.signInTitle}</p>
            <SignInForm token={token} email={invite.invitedEmail} dict={dict} />
          </div>
        )}

        {!isError && !sessionEmail && !existingUser && (
          <div className="space-y-3">
            <p className="font-mono text-xs text-text font-medium">{dict.registerTitle}</p>
            <RegisterForm token={token} dict={dict} />
          </div>
        )}

        {isError && (
          <div className="mt-4 text-center">
            <Link href="/login" className="font-mono text-xs text-primary hover:underline">
              {dict.goToLogin}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
