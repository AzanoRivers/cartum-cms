'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/lib/stores/uiStore'

/**
 * Global keyboard shortcuts:
 * - Esc   → close any open overlay
 * - G+H   → /board (Home)
 * - G+S   → /board (Schema)
 * - G+C   → /content
 * - G+,   → Open Settings
 *
 * G-sequences use a 350ms window after pressing G.
 */
export function useKeyboardShortcuts() {
  const router      = useRouter()
  const closeSettings     = useUIStore.getState().closeSettings
  const closeCreationPanel = useUIStore.getState().closeCreationPanel
  const closeFieldEdit    = useUIStore.getState().closeFieldEdit
  const openSettings      = useUIStore.getState().openSettings
  const openHelp          = useUIStore.getState().openHelp
  const closeHelp         = useUIStore.getState().closeHelp

  const openCreationPanel  = useUIStore.getState().openCreationPanel

  const gPressedAt = useRef<number | null>(null)
  const G_WINDOW   = 350

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      // Don't intercept shortcuts when typing in inputs/textareas
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return

      // ── Esc — close any open overlay ──────────────────────────────────────
      if (e.key === 'Escape') {
        const { settingsOpen, helpOpen, creationPanelOpen, editingFieldId } = useUIStore.getState()
        if (editingFieldId)    { closeFieldEdit();     return }
        if (creationPanelOpen) { closeCreationPanel(); return }
        if (settingsOpen)      { closeSettings();      return }
        if (helpOpen)          { closeHelp();          return }
        return
      }

      // ── G sequences ───────────────────────────────────────────────────────
      if (e.key === 'g' || e.key === 'G') {
        gPressedAt.current = Date.now()
        return
      }

      if (gPressedAt.current !== null) {
        const elapsed = Date.now() - gPressedAt.current
        gPressedAt.current = null

        if (elapsed <= G_WINDOW) {
          if (e.key === 'h' || e.key === 'H') { router.push('/cms/board');   return }
          if (e.key === 's' || e.key === 'S') { router.push('/cms/board');   return }
          if (e.key === 'c' || e.key === 'C') { router.push('/cms/content'); return }
          if (e.key === 'n' || e.key === 'N') { openCreationPanel();      return }
          if (e.key === ',')                  { openSettings('project'); return }
          if (e.key === '?')                  { openHelp();              return }
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [router, closeSettings, closeCreationPanel, closeFieldEdit, openSettings, openHelp, closeHelp])
}
