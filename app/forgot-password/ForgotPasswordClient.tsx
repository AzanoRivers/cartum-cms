'use client'

import { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { requestPasswordResetAction } from '@/lib/actions/auth.actions'
import { generateCaptchaAction } from '@/lib/actions/captcha.actions'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { Dictionary } from '@/locales/en'

type Props = {
  dict:      Dictionary['auth']['forgotPassword']
  hasResend: boolean
}

type CaptchaChallenge = { a: number; b: number; token: string }

export function ForgotPasswordClient({ dict, hasResend }: Props) {
  const [email,        setEmail]        = useState('')
  const [submitted,    setSubmitted]    = useState(false)
  const [captcha,      setCaptcha]      = useState<CaptchaChallenge | null>(null)
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaError, setCaptchaError] = useState(false)
  const [rateLimited,  setRateLimited]  = useState(false)
  const [isPending,    startTransition] = useTransition()

  async function refreshCaptcha() {
    setCaptchaInput('')
    setCaptchaError(false)
    const challenge = await generateCaptchaAction()
    setCaptcha(challenge)
  }

  useEffect(() => {
    refreshCaptcha()
  }, [])

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setCaptchaError(false)
    setRateLimited(false)

    startTransition(async () => {
      const res = await requestPasswordResetAction({
        email,
        captchaToken:  captcha?.token ?? '',
        captchaAnswer: Number(captchaInput),
      })

      if (!res.success) {
        if (res.error === 'captcha_error') {
          setCaptchaError(true)
          await refreshCaptcha()
          return
        }
        if (res.error === 'rate_limited') {
          setRateLimited(true)
          return
        }
      }

      setSubmitted(true)
    })
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

                {rateLimited && (
                  <div className="mb-4 px-3 py-2 rounded bg-danger/10 border border-danger/30 text-danger text-xs">
                    {dict.rateLimited}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="fp-email" className="block text-xs font-mono text-muted uppercase tracking-wider">
                      {dict.email}
                    </label>
                    <input
                      id="fp-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-accent transition-colors"
                      placeholder="admin@example.com"
                    />
                  </div>

                  {/* CAPTCHA */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-muted uppercase tracking-wider">
                      {dict.captchaLabel}
                    </label>
                    <div className="flex items-center gap-2">
                      {/* Challenge */}
                      <div className="flex items-center px-3 py-2 rounded bg-surface-2 border border-border font-mono text-sm text-text select-none shrink-0">
                        {captcha
                          ? <span>{captcha.a}&nbsp;+&nbsp;{captcha.b}&nbsp;=</span>
                          : <span className="text-muted animate-pulse">···</span>
                        }
                      </div>
                      {/* Answer */}
                      <input
                        type="number"
                        required
                        min={0}
                        max={99}
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        placeholder={dict.captchaPlaceholder}
                        className={[
                          'w-16 bg-surface-2 border rounded px-3 py-2 font-mono text-sm text-center text-text placeholder:text-muted outline-none transition-colors',
                          captchaError
                            ? 'border-danger focus:border-danger'
                            : 'border-border focus:border-accent',
                        ].join(' ')}
                      />
                      {/* Refresh */}
                      <button
                        type="button"
                        onClick={refreshCaptcha}
                        title="New challenge"
                        className="text-muted hover:text-text transition-colors font-mono text-base leading-none"
                      >
                        ↺
                      </button>
                    </div>
                    {captchaError && (
                      <p className="text-xs text-danger">{dict.captchaError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || !captcha}
                    className="w-full bg-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded px-4 py-2.5 transition-colors"
                  >
                    {isPending ? dict.submitting : dict.submit}
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
