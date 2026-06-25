'use client'

import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'cartum_rl_'

interface StoredState {
  nextAllowedAt: string
}

function readStorage(key: string): { blocked: boolean; nextAt: string | null } {
  if (typeof window === 'undefined') return { blocked: false, nextAt: null }
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return { blocked: false, nextAt: null }
    const { nextAllowedAt } = JSON.parse(raw) as StoredState
    const blocked = new Date(nextAllowedAt) > new Date()
    if (!blocked) localStorage.removeItem(PREFIX + key)
    return blocked ? { blocked: true, nextAt: nextAllowedAt } : { blocked: false, nextAt: null }
  } catch {
    return { blocked: false, nextAt: null }
  }
}

function fmtCountdown(secs: number): string {
  if (secs <= 0) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
}

export function useLocalRateLimit(key: string) {
  const [state, setState] = useState<{ blocked: boolean; nextAt: string | null }>({ blocked: false, nextAt: null })

  useEffect(() => {
    setState(readStorage(key))
    const id = setInterval(() => setState(readStorage(key)), 1000)
    return () => clearInterval(id)
  }, [key])

  const markBlocked = useCallback((nextAllowedAt: string) => {
    try { localStorage.setItem(PREFIX + key, JSON.stringify({ nextAllowedAt })) } catch { /* unavailable */ }
    setState({ blocked: true, nextAt: nextAllowedAt })
  }, [key])

  const secondsLeft = state.nextAt
    ? Math.max(0, Math.round((new Date(state.nextAt).getTime() - Date.now()) / 1000))
    : 0

  return {
    blocked:    state.blocked,
    nextAt:     state.nextAt,
    secondsLeft,
    countdown:  fmtCountdown(secondsLeft),
    markBlocked,
  }
}
