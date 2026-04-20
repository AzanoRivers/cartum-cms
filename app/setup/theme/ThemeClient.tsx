'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveSetupTheme } from '@/lib/actions/setup.actions'

const THEME_KEY = 'cartum-theme'
import { SetupLayout } from '@/components/ui/layouts/SetupLayout'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { THEMES } from '@/types/theme'
import type { ThemeId, ThemeDefinition } from '@/types/theme'
import type { Dictionary } from '@/locales/en'

type Props = {
  dict: Dictionary['setup']['theme']
  layoutDict: { stepLabels: string[]; back: string }
  currentTheme: ThemeId
}

export function ThemeClient({ dict, layoutDict, currentTheme }: Props) {
  const router  = useRouter()
  const [selected, setSelected] = useState<ThemeId>(currentTheme)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Live-preview: apply theme immediately on selection
  useEffect(() => {
    document.documentElement.dataset.theme = selected
  }, [selected])

  async function handleContinue() {
    setLoading(true)
    setError(null)
    const result = await saveSetupTheme({ theme: selected })
    if (!result.success) {
      setError(result.error ?? 'Failed to save theme.')
      setLoading(false)
      return
    }
    // Sync localStorage so the beforeInteractive hydration script reflects the
    // selected theme correctly on first load after login.
    try { localStorage.setItem(THEME_KEY, selected) } catch { /* sandboxed */ }
    router.push('/setup/initializing')
  }

  // Label lookup from locale dict
  const labelMap: Record<ThemeId, { label: string; description: string }> = {
    'dark':       dict.themes.dark,
    'cyber-soft': dict.themes.cyberSoft,
    'light':      dict.themes.light,
  }

  return (
    <SetupLayout currentStep="theme" layoutDict={layoutDict}>
      <VHSTransition>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-text text-xl font-semibold tracking-tight">{dict.title}</h1>
            <p className="text-muted text-sm mt-1">{dict.subtitle}</p>
          </div>

          <div className="flex flex-col gap-3">
            {THEMES.map((theme: ThemeDefinition) => {
              const isActive = selected === theme.id
              const info     = labelMap[theme.id]
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelected(theme.id)}
                  className={[
                    'relative flex items-center gap-4 rounded-lg border px-4 py-3 text-left transition-all duration-200',
                    isActive
                      ? 'border-primary bg-primary/10 shadow-[0_0_12px_var(--color-primary-glow)]'
                      : 'border-border bg-surface-2 hover:border-primary/40',
                  ].join(' ')}
                >
                  {/* Color swatch strip */}
                  <div className="flex shrink-0 gap-1 rounded-md overflow-hidden">
                    <div className="h-10 w-6 rounded-l-sm" style={{ backgroundColor: theme.preview.bg }} />
                    <div className="h-10 w-4"              style={{ backgroundColor: theme.preview.surface }} />
                    <div className="h-10 w-3"              style={{ backgroundColor: theme.preview.primary }} />
                    <div className="h-10 w-2 rounded-r-sm" style={{ backgroundColor: theme.preview.accent }} />
                  </div>

                  {/* Labels */}
                  <div className="flex-1 min-w-0">
                    <p className="text-text text-sm font-medium">{info.label}</p>
                    <p className="text-muted text-xs font-mono mt-0.5">{info.description}</p>
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="shrink-0 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_var(--color-primary)]" />
                  )}
                </button>
              )
            })}
          </div>

          {error && <p className="text-danger text-sm font-mono">{error}</p>}

          <button
            type="button"
            onClick={handleContinue}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-mono text-sm py-2.5 rounded-md transition-colors mt-1"
          >
            {loading ? '...' : `${dict.continue} →`}
          </button>
        </div>
      </VHSTransition>
    </SetupLayout>
  )
}
