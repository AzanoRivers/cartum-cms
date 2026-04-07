'use client'

import { useState } from 'react'
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
    <main className="min-h-screen flex items-center justify-center bg-[--color-bg]">
      <VHSTransition duration="full">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <span className="font-mono text-xs tracking-[0.3em] text-[--color-text-muted] uppercase">◈ Cartum</span>
          </div>

          <div className="bg-[--color-surface] border border-[--color-border] rounded-lg p-8">
            <h1 className="text-lg font-semibold text-[--color-text] mb-2">{dict.title}</h1>
            <p className="text-sm text-[--color-text-muted] mb-6">{dict.subtitle}</p>

            {error && (
              <div className="mb-4 px-3 py-2 rounded bg-[--color-danger]/10 border border-[--color-danger]/30 text-[--color-danger] text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-mono text-[--color-text-muted] uppercase tracking-wider">
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
                    className="w-full bg-[--color-surface-2] border border-[--color-border] rounded px-3 py-2 pr-10 text-sm text-[--color-text] placeholder:text-[--color-text-muted] outline-none focus:border-[--color-accent] transition-colors"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-text-muted] hover:text-[--color-text] transition-colors text-xs"
                  >
                    {showPwd ? '●' : '○'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm" className="block text-xs font-mono text-[--color-text-muted] uppercase tracking-wider">
                  {dict.confirmPassword}
                </label>
                <input
                  id="confirm"
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-[--color-surface-2] border border-[--color-border] rounded px-3 py-2 text-sm text-[--color-text] placeholder:text-[--color-text-muted] outline-none focus:border-[--color-accent] transition-colors"
                  placeholder="••••••••••••"
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
          </div>
        </div>
      </VHSTransition>
    </main>
  )
}
