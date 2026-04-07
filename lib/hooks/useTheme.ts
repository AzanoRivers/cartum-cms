'use client'

import { useCallback } from 'react'
import { updateAppearanceSettings } from '@/lib/actions/settings.actions'
import type { ThemeId } from '@/types/theme'

const THEME_KEY = 'cartum-theme'

export function useTheme() {
  /**
   * Applies theme to DOM immediately, then persists to DB.
   * Returns true on success, false on failure (DOM is reverted on failure).
   */
  const applyTheme = useCallback(async (themeId: ThemeId, previous: ThemeId): Promise<{ ok: boolean; error?: string }> => {
    document.documentElement.dataset.theme = themeId
    try { localStorage.setItem(THEME_KEY, themeId) } catch { /* sandboxed env */ }
    const result = await updateAppearanceSettings({ theme: themeId })
    if (!result.success) {
      console.error('[useTheme] updateAppearanceSettings failed:', result.error)
      document.documentElement.dataset.theme = previous
      try { localStorage.setItem(THEME_KEY, previous) } catch { /* sandboxed env */ }
      return { ok: false, error: result.error }
    }
    return { ok: true }
  }, [])

  const currentTheme = useCallback((): ThemeId => {
    const current = document.documentElement.dataset.theme
    if (current === 'dark' || current === 'cyber-soft' || current === 'light') {
      return current
    }
    return 'dark'
  }, [])

  return { applyTheme, currentTheme }
}
