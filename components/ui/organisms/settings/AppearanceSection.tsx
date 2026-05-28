'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useTheme } from '@/lib/hooks/useTheme'
import { useStrangerThingsSound } from '@/lib/hooks/useStrangerThingsSound'
import { ThemeSwatch } from '@/components/ui/molecules/ThemeSwatch'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { THEMES } from '@/types/theme'
import type { ThemeId } from '@/types/theme'
import type { Dictionary } from '@/locales/en'

export type AppearanceSectionProps = {
  d: Dictionary['settings']['appearance']
}

export function AppearanceSection({ d }: AppearanceSectionProps) {
  const { applyTheme, currentTheme } = useTheme()
  const { playIfST, isPlaying: stPlaying } = useStrangerThingsSound()
  const [activeTheme, setActiveTheme] = useState<ThemeId>('dark')
  const [saving, setSaving] = useState(false)

  // Read current theme from DOM on mount (avoids SSR mismatch)
  useEffect(() => {
    setActiveTheme(currentTheme())
  }, [currentTheme])

  async function handleSelect(themeId: ThemeId) {
    if (saving || stPlaying || themeId === activeTheme) return
    playIfST(themeId)
    const previous = activeTheme
    setActiveTheme(themeId)
    setSaving(true)
    const { ok, error } = await applyTheme(themeId, previous)
    setSaving(false)
    if (!ok) {
      setActiveTheme(previous)
      toast.error(error ?? d.saveError)
    } else {
      toast.success(d.saved)
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="font-mono text-sm font-semibold text-text">{d.title}</h2>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <p className="font-mono text-xs text-muted">{d.themeLabel}</p>
          {saving && <Spinner size="sm" color="muted" />}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
          {THEMES.map((theme) => {
            const themeKey = theme.id.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())
            const localised = d.themes[themeKey as keyof typeof d.themes]
            return (
              <ThemeSwatch
                key={theme.id}
                theme={{ ...theme, label: localised.label, description: localised.description }}
                isActive={activeTheme === theme.id}
                disabled={saving || stPlaying}
                stPlaying={stPlaying}
                onSelect={handleSelect}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
