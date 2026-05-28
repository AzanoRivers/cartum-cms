'use client'

import { useActionState, useState, useTransition } from 'react'
import Link from 'next/link'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { acceptAndJoin, signInAndAccept, registerAndAccept } from '@/lib/actions/invitations.actions'

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
}

// ── Case D: new user registration ─────────────────────────────────────────────

function RegisterForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState<{ error: string } | undefined, FormData>(
    registerAndAccept as (prev: { error: string } | undefined, data: FormData) => Promise<{ error: string } | undefined>,
    undefined,
  )
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <label className="font-mono text-xs text-muted">Your name</label>
        <input
          name="name"
          required
          autoFocus
          disabled={isPending}
          placeholder="Jane Smith"
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
        />
      </div>
      <div className="space-y-1.5">
        <label className="font-mono text-xs text-muted">Password</label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            disabled={isPending}
            placeholder="At least 8 characters"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 pr-14 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted hover:text-text cursor-pointer"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
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
        {isPending ? 'Creating account…' : 'Create account and join →'}
      </button>
    </form>
  )
}

// ── Case C: sign in form ──────────────────────────────────────────────────────

function SignInForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword]     = useState('')
  const [showPassword, setShow]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
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
        <label className="font-mono text-xs text-muted">Email</label>
        <input
          type="email"
          value={email}
          readOnly
          className="w-full rounded-md border border-border bg-surface-2/60 px-3 py-2 font-mono text-sm text-muted"
        />
      </div>
      <div className="space-y-1.5">
        <label className="font-mono text-xs text-muted">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            disabled={isPending}
            placeholder="Your password"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 pr-14 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted hover:text-text cursor-pointer"
          >
            {showPassword ? 'Hide' : 'Show'}
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
        {isPending ? 'Joining…' : 'Sign in and join →'}
      </button>
    </form>
  )
}

// ── Case A: accept button ─────────────────────────────────────────────────────

function AcceptButton({ token }: { token: string }) {
  const [error, setError]           = useState<string | null>(null)
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
        {isPending ? 'Joining…' : 'Accept invitation →'}
      </button>
    </div>
  )
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function AcceptInviteCard({ token, invite, sessionEmail, existingUser }: Props) {
  const isError    = invite.expired || invite.consumed
  const isMatchingSession = sessionEmail !== null && sessionEmail === invite.invitedEmail
  const isWrongAccount    = sessionEmail !== null && sessionEmail !== invite.invitedEmail

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-12">
      <VHSTransition duration="normal" trigger className="w-full max-w-sm">
        <div className="rounded-xl border border-border bg-surface shadow-2xl">
          {/* Header */}
          <div className="border-b border-border px-6 py-5 space-y-1">
            <p className="font-mono text-[11px] text-muted uppercase tracking-widest">◈ CARTUM</p>
            {!isError && (
              <>
                <h1 className="font-mono text-base font-semibold text-text">You've been invited</h1>
                <p className="font-mono text-sm text-muted">
                  to join{' '}
                  <span className="text-primary">❝{invite.projectName}❞</span>
                  {' '}as a{' '}
                  <span className="inline-block rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                    {invite.roleName}
                  </span>
                </p>
              </>
            )}
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Error states */}
            {invite.expired && (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 font-mono text-xs text-danger">
                ⚠ This invitation has expired.
              </p>
            )}
            {invite.consumed && !invite.expired && (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 font-mono text-xs text-danger">
                ⚠ This invitation has already been used.
              </p>
            )}

            {/* Wrong account */}
            {!isError && isWrongAccount && (
              <div className="space-y-3">
                <p className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 font-mono text-xs text-warning">
                  ⚠ You're signed in as <strong>{sessionEmail}</strong>, but this invitation is for{' '}
                  <strong>{invite.invitedEmail}</strong>.
                </p>
                <p className="font-mono text-xs text-muted text-center">
                  Sign out and sign in with the correct account to accept.
                </p>
              </div>
            )}

            {/* Case A: matching session */}
            {!isError && isMatchingSession && (
              <div className="space-y-3">
                <p className="font-mono text-xs text-muted">
                  Signed in as <strong className="text-text">{sessionEmail}</strong>
                </p>
                <AcceptButton token={token} />
              </div>
            )}

            {/* Case C: not logged in, email exists */}
            {!isError && !sessionEmail && existingUser && (
              <div className="space-y-3">
                <p className="font-mono text-xs text-text font-medium">Sign in to accept this invitation</p>
                <SignInForm token={token} email={invite.invitedEmail} />
              </div>
            )}

            {/* Case D: not logged in, new user */}
            {!isError && !sessionEmail && !existingUser && (
              <div className="space-y-3">
                <p className="font-mono text-xs text-text font-medium">Create your account to join</p>
                <RegisterForm token={token} />
              </div>
            )}

            {/* Error footer */}
            {isError && (
              <div className="mt-4 text-center">
                <Link href="/login" className="font-mono text-xs text-primary hover:underline">
                  Go to sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </VHSTransition>
    </div>
  )
}
