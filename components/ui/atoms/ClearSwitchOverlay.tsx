'use client'

import { useEffect } from 'react'

/**
 * Safety net for any flow that lands here with a stray `data-project-switching`
 * attribute still set on <html> (the pre-hydration project-switch overlay flag
 * — see app/layout.tsx's inline script and app/globals.css). Only ThemeSync
 * normally clears it, and ThemeSync only mounts inside the CMS — pages outside
 * it (like /setup/*) would otherwise have no way to ever remove a stuck overlay.
 */
export function ClearSwitchOverlay() {
  useEffect(() => {
    document.documentElement.removeAttribute('data-project-switching')
  }, [])
  return null
}
