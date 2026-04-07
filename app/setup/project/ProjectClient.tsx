'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/lib/actions/setup.actions'
import { SetupLayout } from '@/components/ui/layouts/SetupLayout'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { Dictionary } from '@/locales/en'

type Props = {
  dict: Dictionary['setup']['project']
  layoutDict: { stepLabels: string[]; back: string }
}

export function ProjectClient({ dict, layoutDict }: Props) {
  const router = useRouter()
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await createProject({ name, description: description || undefined })
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/setup/initializing')
  }

  return (
    <SetupLayout currentStep="project" layoutDict={layoutDict}>
      <VHSTransition>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <h1 className="text-text text-xl font-semibold tracking-tight">{dict.title}</h1>
            <p className="text-muted text-sm mt-1">{dict.subtitle}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted font-mono text-xs uppercase tracking-wider">{dict.name}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={40}
              className="bg-surface-2 border border-border rounded-md px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="My CMS"
            />
            <span className="text-muted font-mono text-xs text-right">{name.length}/40</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted font-mono text-xs uppercase tracking-wider">
              {dict.description}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
              className="bg-surface-2 border border-border rounded-md px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition-colors resize-none"
              placeholder="A short description of this project..."
            />
            <span className="text-muted font-mono text-xs text-right">{description.length}/200</span>
          </div>

          {error && <p className="text-danger text-sm font-mono">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-mono text-sm py-2.5 rounded-md transition-colors mt-1"
          >
            {loading ? '...' : `${dict.continue} →`}
          </button>
        </form>
      </VHSTransition>
    </SetupLayout>
  )
}
