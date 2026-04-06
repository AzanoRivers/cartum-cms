'use client'

import { useState } from 'react'
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await requestPasswordResetAction({ email })
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[--color-bg]">
      <VHSTransition duration="full">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <span className="font-mono text-xs tracking-[0.3em] text-[--color-text-muted] uppercase">◈ Cartum</span>
          </div>

          <div className="bg-[--color-surface] border border-[--color-border] rounded-lg p-8">
            {submitted ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-[--color-text]">{dict.success}</p>
                <Link
                  href="/login"
                  className="text-xs text-[--color-text-muted] hover:text-[--color-text] transition-colors"
                >
                  ← {dict.backToLogin}
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-lg font-semibold text-[--color-text] mb-2">{dict.title}</h1>
                <p className="text-sm text-[--color-text-muted] mb-6">{dict.subtitle}</p>

                {!hasResend && (
                  <div className="mb-4 px-3 py-2 rounded bg-[--color-danger]/10 border border-[--color-danger]/30 text-[--color-danger] text-xs">
                    {dict.noEmailWarning}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-xs font-mono text-[--color-text-muted] uppercase tracking-wider">
                      {dict.email}
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[--color-surface-2] border border-[--color-border] rounded px-3 py-2 text-sm text-[--color-text] placeholder:text-[--color-text-muted] outline-none focus:border-[--color-accent] transition-colors"
                      placeholder="admin@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[--color-primary] hover:bg-[--color-primary]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded px-4 py-2.5 transition-colors"
                  >
                    {loading ? dict.submitting : dict.submit}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <Link href="/login" className="text-xs text-[--color-text-muted] hover:text-[--color-text] transition-colors">
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
