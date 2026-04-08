'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { requestPasswordResetAction } from '@/lib/actions/auth.actions'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { Dictionary } from '@/locales/en'

type Props = {
  dict:      Dictionary['auth']['forgotPassword']
  hasResend: boolean
}

export function ForgotPasswordClient({ dict, hasResend }: Props) {
  const [email,     setEmail]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    await requestPasswordResetAction({ email })
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg">
      <VHSTransition duration="full">
        <div className="w-full max-w-sm">

          {/* Logo — mismo estilo que SetupLayout */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="relative h-8 w-8 shrink-0">
              <div className="absolute inset-1 rounded-full bg-primary/40 blur-md" />
              <Image
                src="/images/brand/icon.svg"
                alt="Cartum"
                width={32}
                height={32}
                priority
                className="relative h-8 w-8 object-contain"
              />
            </div>
            <div className="relative select-none">
              <span
                aria-hidden="true"
                className="absolute inset-0 font-mono text-sm tracking-[0.3em] uppercase text-accent blur-[10px] opacity-20"
              >
                CARTUM
              </span>
              <span className="relative font-mono text-sm tracking-[0.3em] uppercase text-text">
                CARTUM
              </span>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-8">
            {submitted ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-text">{dict.success}</p>
                <Link
                  href="/login"
                  className="text-xs text-muted hover:text-text transition-colors"
                >
                  ← {dict.backToLogin}
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-lg font-semibold text-text mb-2">{dict.title}</h1>
                <p className="text-sm text-muted mb-6">{dict.subtitle}</p>

                {!hasResend && (
                  <div className="mb-4 px-3 py-2 rounded bg-danger/10 border border-danger/30 text-danger text-xs">
                    {dict.noEmailWarning}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-xs font-mono text-muted uppercase tracking-wider">
                      {dict.email}
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-accent transition-colors"
                      placeholder="admin@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded px-4 py-2.5 transition-colors"
                  >
                    {loading ? dict.submitting : dict.submit}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <Link href="/login" className="text-xs text-muted hover:text-text transition-colors">
                    ← {dict.backToLogin}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </VHSTransition>
    </main>
  )
}
