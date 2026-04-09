'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CaptchaChallenge } from '@/components/ui/molecules/CaptchaChallenge'
import type { Dictionary } from '@/locales/en'

type LoginFormProps = {
  dict:         Dictionary['auth']['login']
  initialError?: string
}

function randomDigit() {
  return Math.floor(Math.random() * 10)
}

export function LoginForm({ dict, initialError }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  // Show toast if redirected here with an error (e.g., from the middleware)
  useEffect(() => {
    if (initialError === 'disabled') {
      toast.error(dict.accountDisabled)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Captcha state
  const [captchaA, setCaptchaA]         = useState(randomDigit)
  const [captchaB, setCaptchaB]         = useState(randomDigit)
  const [captchaValue, setCaptchaValue] = useState('')
  const [captchaError, setCaptchaError] = useState(false)

  const refreshCaptcha = useCallback(() => {
    setCaptchaA(randomDigit())
    setCaptchaB(randomDigit())
    setCaptchaValue('')
    setCaptchaError(false)
  }, [])

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setCaptchaError(false)

    // Validate captcha first
    if (parseInt(captchaValue, 10) !== captchaA + captchaB) {
      setCaptchaError(true)
      toast.error(dict.captchaError)
      refreshCaptcha()
      return
    }

    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (!result || result.error) {
      if (result?.error === 'account_disabled') {
        toast.error(dict.accountDisabled)
        refreshCaptcha()
        return
      }
      setError(dict.error)
      refreshCaptcha()
      return
    }

    toast.success(dict.loginSuccess)
    router.push('/cms/board')
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/icon.svg" alt="Cartum" width={28} height={28} className="h-7 w-7 object-contain" />
        </div>
        <span className="font-mono text-[10px] tracking-[0.3em] text-muted uppercase">Cartum CMS</span>
      </div>

      <div className="rounded-lg border border-border bg-surface p-8">
        <h1 className="mb-6 text-lg font-semibold text-text">{dict.title}</h1>

        {error && (
          <div className="mb-4 rounded border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block font-mono text-xs uppercase tracking-wider text-muted">
              {dict.email}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-muted outline-none transition-colors focus:border-accent"
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block font-mono text-xs uppercase tracking-wider text-muted">
              {dict.password}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-border bg-surface-2 px-3 py-2 pr-10 text-sm text-text placeholder:text-muted outline-none transition-colors focus:border-accent"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted transition-colors hover:text-text"
                aria-label={showPwd ? dict.hide : dict.show}
              >
                {showPwd ? dict.hide : dict.show}
              </button>
            </div>
          </div>

          {/* Captcha */}
          <div className="pt-1">
            <CaptchaChallenge
              a={captchaA}
              b={captchaB}
              value={captchaValue}
              onChange={(v) => { setCaptchaValue(v); setCaptchaError(false) }}
              onRefresh={refreshCaptcha}
              label={dict.captchaLabel}
              placeholder={dict.captchaPlaceholder}
              isError={captchaError}
            />
            {captchaError && (
              <p className="mt-1.5 font-mono text-xs text-danger">
                {dict.captchaError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? dict.submitting : dict.submit}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            href="/forgot-password"
            className="font-mono text-xs text-muted transition-colors hover:text-text"
          >
            {dict.forgotPassword}
          </Link>
        </div>
      </div>
    </div>
  )
}
