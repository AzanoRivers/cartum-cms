'use client'

import { useEffect, useRef } from 'react'
import { toast } from '@/lib/toast'
import { playStartSound } from '@/lib/sounds'
import { useUIStore } from '@/lib/stores/uiStore'

export const PENDING_WELCOME_KEY = 'cartum:pending-welcome'

/**
 * Invisible component mounted in the CMS layout. Fires the welcome
 * toast/sound only once the dashboard has actually mounted, and clears
 * the global loader LoginForm turned on before navigating here.
 */
export function PostLoginWelcome() {
  const setGlobalLoading = useUIStore((s) => s.setGlobalLoading)
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    let message: string | null = null
    try {
      message = sessionStorage.getItem(PENDING_WELCOME_KEY)
      if (message) sessionStorage.removeItem(PENDING_WELCOME_KEY)
    } catch { /* sandboxed */ }

    if (!message) return

    setGlobalLoading(false)
    playStartSound()
    toast.success(message)
  }, [setGlobalLoading])

  return null
}
