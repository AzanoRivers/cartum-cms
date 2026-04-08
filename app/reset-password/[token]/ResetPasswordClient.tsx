'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { resetPasswordAction } from '@/lib/actions/auth.actions'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { Dictionary } from '@/locales/en'

type Props = {
  token: string
  dict:  Dictionary['auth']['resetPassword']
}

export function ResetPasswordClient({ token, dict }: Props) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await resetPasswordAction({ token, password, confirm })

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Reset failed.')
      return
    }

    router.push('/login?reset=1')
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
            <h1 className="text-lg font-semibold text-text mb-2">{dict.title}</h1>
            <p className="text-sm text-muted mb-6">{dict.subtitle}</p>

            {error && (
              <div className="mb-4 px-3 py-2 rounded bg-danger/10 border border-danger/30 text-danger text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-mono text-muted uppercase tracking-wider">
                  {dict.newPassword}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    required
                    minLength={12}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 pr-10 text-sm text-text placeholder:text-muted outline-none focus:border-accent transition-colors"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors text-xs"
                  >
                    {showPwd ? '●' : '○'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm" className="block text-xs font-mono text-muted uppercase tracking-wider">
                  {dict.confirmPassword}
                </label>
                <input
                  id="confirm"
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-accent transition-colors"
                  placeholder="••••••••••••"
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
          </div>
        </div>
      </VHSTransition>
    </main>
  )
}
