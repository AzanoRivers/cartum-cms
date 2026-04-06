'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSuperAdmin } from '@/lib/actions/setup.actions'
import { SetupLayout } from '@/components/ui/layouts/SetupLayout'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { Dictionary } from '@/locales/en'

function getStrength(password: string): 'weak' | 'fair' | 'strong' {
  if (password.length < 8) return 'weak'
  const hasUpper  = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^a-zA-Z0-9]/.test(password)
  const score = [password.length >= 12, hasUpper, hasNumber, hasSymbol].filter(Boolean).length
  if (score >= 3) return 'strong'
  if (score >= 2) return 'fair'
  return 'weak'
}

const STRENGTH_COLOR = { weak: 'text-danger', fair: 'text-warning', strong: 'text-success' }
const STRENGTH_BAR   = { weak: 'w-1/3 bg-danger', fair: 'w-2/3 bg-warning', strong: 'w-full bg-success' }

type Props = {
  dict: Dictionary['setup']['credentials']
  layoutDict: { stepLabels: string[]; back: string }
}

export function CredentialsClient({ dict, layoutDict }: Props) {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const strength = getStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await createSuperAdmin({ email, password, confirm })
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/setup/project')
  }

  return (
    <SetupLayout currentStep="credentials" layoutDict={layoutDict}>
      <VHSTransition>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <h1 className="text-text text-xl font-semibold tracking-tight">{dict.title}</h1>
            <p className="text-muted text-sm mt-1">{dict.subtitle}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted font-mono text-xs uppercase tracking-wider">{dict.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-surface-2 border border-border rounded-md px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="admin@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted font-mono text-xs uppercase tracking-wider">{dict.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-surface-2 border border-border rounded-md px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition-colors"
            />
            {password.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${STRENGTH_BAR[strength]}`} />
                </div>
                <span className={`font-mono text-xs capitalize ${STRENGTH_COLOR[strength]}`}>
                  {dict.strength[strength]}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted font-mono text-xs uppercase tracking-wider">{dict.confirm}</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="bg-surface-2 border border-border rounded-md px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition-colors"
            />
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
