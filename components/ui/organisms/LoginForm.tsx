'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import type { Dictionary } from '@/locales/en'

type LoginFormProps = { dict: Dictionary['auth']['login'] }

export function LoginForm({ dict }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (!result || result.error) {
      setError(dict.error)
      return
    }

    router.push('/cms/board')
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="font-mono text-xs tracking-[0.3em] text-[--color-text-muted] uppercase">◈ Cartum</span>
      </div>

      <div className="bg-[--color-surface] border border-[--color-border] rounded-lg p-8">
        <h1 className="text-lg font-semibold text-[--color-text] mb-6">{dict.title}</h1>

        {error && (
          <div className="mb-4 px-3 py-2 rounded bg-[--color-danger]/10 border border-[--color-danger]/30 text-[--color-danger] text-sm">
            {error}
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
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[--color-surface-2] border border-[--color-border] rounded px-3 py-2 text-sm text-[--color-text] placeholder:text-[--color-text-muted] outline-none focus:border-[--color-accent] transition-colors"
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-mono text-[--color-text-muted] uppercase tracking-wider">
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
                className="w-full bg-[--color-surface-2] border border-[--color-border] rounded px-3 py-2 pr-10 text-sm text-[--color-text] placeholder:text-[--color-text-muted] outline-none focus:border-[--color-accent] transition-colors"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-text-muted] hover:text-[--color-text] transition-colors text-xs"
                aria-label={showPwd ? dict.hide : dict.show}
              >
                {showPwd ? dict.hide : dict.show}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[--color-primary] hover:bg-[--color-primary]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded px-4 py-2.5 transition-colors"
          >
            {loading ? dict.submitting : dict.submit}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            href="/forgot-password"
            className="text-xs text-[--color-text-muted] hover:text-[--color-text] transition-colors"
          >
            {dict.forgotPassword}
          </Link>
        </div>
      </div>
    </div>
  )
}
