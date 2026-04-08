'use client'

import { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { requestPasswordResetAction } from '@/lib/actions/auth.actions'
import { generateCaptchaAction } from '@/lib/actions/captcha.actions'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { CaptchaChallenge } from '@/components/ui/molecules/CaptchaChallenge'
import { toast } from 'sonner'
import type { Dictionary } from '@/locales/en'

type Props = {
  dict:      Dictionary['auth']['forgotPassword']
  hasResend: boolean
}

type ServerCaptcha = { a: number; b: number; token: string }

export function ForgotPasswordClient({ dict, hasResend }: Props) {
  const [email,        setEmail]        = useState('')
  const [submitted,    setSubmitted]    = useState(false)
  const [captcha,      setCaptcha]      = useState<ServerCaptcha | null>(null)
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaError, setCaptchaError] = useState(false)
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

    const emailTrimmed = email.trim()
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      toast.error(dict.emailRequired)
      return
    }

    startTransition(async () => {
      const res = await requestPasswordResetAction({
        email: emailTrimmed,
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
          toast.error(dict.rateLimited)
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

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="fp-email" className="block text-xs font-mono text-muted uppercase tracking-wider">
                      {dict.email}
                    </label>
                    <input
                      id="fp-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-accent transition-colors"
                      placeholder="admin@example.com"
                    />
                  </div>

                  {/* CAPTCHA */}
                  <div className="pt-1">
                    <CaptchaChallenge
                      a={captcha?.a ?? 0}
                      b={captcha?.b ?? 0}
                      value={captchaInput}
                      onChange={(v) => { setCaptchaInput(v); setCaptchaError(false) }}
                      onRefresh={refreshCaptcha}
                      label={dict.captchaLabel}
                      placeholder={dict.captchaPlaceholder}
                      isError={captchaError}
                    />
                    {captchaError && (
                      <p className="mt-1.5 font-mono text-xs text-danger">{dict.captchaError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || !email.trim() || !captcha || Number(captchaInput) !== captcha.a + captcha.b}
                    className="w-full bg-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded px-4 py-2.5 transition-colors"
                  >
                    {isPending ? dict.submitting : dict.submit}
                  </button>
                </form>

                <div className="mt-4">
                  <Link
                    href="/login"
                    className="flex items-center justify-center w-full border border-border rounded px-4 py-2.5 text-sm text-muted hover:text-text hover:border-accent transition-colors"
                  >
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
