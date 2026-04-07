'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSuperAdmin } from '@/lib/actions/setup.actions'
import { SetupLayout } from '@/components/ui/layouts/SetupLayout'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { Dictionary } from '@/locales/en'

function generateSecurePassword(): string {
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower   = 'abcdefghijklmnopqrstuvwxyz'
  const digits  = '0123456789'
  const symbols = '!@#$%^&*-_=+'
  const charset = upper + lower + digits + symbols

  const length = 20
  const buf    = new Uint8Array(length + 4)
  crypto.getRandomValues(buf)

  // Guarantee one of each class
  const required = [
    upper  [buf[0] % upper.length],
    lower  [buf[1] % lower.length],
    digits [buf[2] % digits.length],
    symbols[buf[3] % symbols.length],
  ]
  const rest = Array.from(buf.slice(4), (b) => charset[b % charset.length])

  // Fisher-Yates shuffle
  const chars     = [...required, ...rest]
  const shuffleBuf = new Uint8Array(chars.length)
  crypto.getRandomValues(shuffleBuf)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBuf[i] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

type Props = {
  dict:       Dictionary['setup']['credentials']
  layoutDict: { stepLabels: string[]; back: string }
}

export function CredentialsClient({ dict, layoutDict }: Props) {
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState(() => generateSecurePassword())
  const [visible,  setVisible]  = useState(false)
  const [copied,   setCopied]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const regenerate = useCallback(() => {
    setPassword(generateSecurePassword())
    setCopied(false)
  }, [])

  const copyPassword = useCallback(async () => {
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [password])

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await createSuperAdmin({ email, password, confirm: password })
    if (!result.success) {
      setError(result.error ?? null)
      setLoading(false)
      return
    }

    router.push('/setup/theme')
  }

  return (
    <SetupLayout currentStep="credentials" layoutDict={layoutDict}>
      <VHSTransition>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <h1 className="text-text text-xl font-semibold tracking-tight">{dict.title}</h1>
            <p className="text-muted text-sm mt-1">{dict.subtitle}</p>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-muted font-mono text-xs uppercase tracking-wider">
              {dict.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-surface-2 border border-border rounded-md px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="admin@example.com"
            />
          </div>

          {/* Generated password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-muted font-mono text-xs uppercase tracking-wider">
                {dict.generatedPassword}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={regenerate}
                  title={dict.regenerate}
                  className="text-muted hover:text-accent font-mono text-xs transition-colors"
                >
                  ↻ {dict.regenerate}
                </button>
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <input
                  type={visible ? 'text' : 'password'}
                  value={password}
                  readOnly
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-accent font-mono text-sm focus:outline-none focus:border-primary transition-colors pr-14"
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text font-mono text-xs transition-colors"
                >
                  {visible ? dict.hide : dict.show}
                </button>
              </div>
              <button
                type="button"
                onClick={copyPassword}
                className={`shrink-0 border rounded-md px-3 py-2 font-mono text-xs transition-all ${
                  copied
                    ? 'border-success text-success bg-success/10'
                    : 'border-border text-muted hover:border-primary hover:text-primary'
                }`}
              >
                {copied ? dict.copied : dict.copy}
              </button>
            </div>

            {/* Notice */}
            <p className="text-danger/80 font-mono text-xs leading-relaxed mt-0.5">
              {dict.passwordNotice}
            </p>
          </div>

          {error && <p className="text-danger text-sm font-mono">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-mono text-sm py-2.5 rounded-md transition-colors mt-1"
          >
            {loading ? '...' : `${dict.continue} →`}
          </button>
        </form>
      </VHSTransition>
    </SetupLayout>
  )
}
