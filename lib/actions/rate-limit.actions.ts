'use server'

import { auth } from '@/auth'
import { getSetting, setSetting } from '@/lib/settings/get-setting'

interface RLState {
  requests: number[]  // unix timestamps (seconds)
}

/**
 * Attempts to consume one slot from the rate limit window.
 * If allowed, records the timestamp and returns { allowed: true }.
 * If blocked, returns { allowed: false, nextAllowedAt }.
 */
export async function consumeRateLimit(
  key: string,
  windowSecs: number,
  maxRequests: number,
): Promise<{ allowed: boolean; nextAllowedAt?: string; remaining: number }> {
  const session = await auth()
  if (!session?.user?.id) return { allowed: false, remaining: 0 }

  const userId  = session.user.id
  const dbKey   = `rl:${userId}:${key}`
  const nowSecs = Math.floor(Date.now() / 1000)

  const stored = await getSetting(dbKey)
  const state: RLState = stored ? (JSON.parse(stored) as RLState) : { requests: [] }
  // Slide the window — drop expired entries
  state.requests = state.requests.filter(t => nowSecs - t < windowSecs)

  if (state.requests.length >= maxRequests) {
    const oldest = Math.min(...state.requests)
    return {
      allowed:       false,
      nextAllowedAt: new Date((oldest + windowSecs) * 1000).toISOString(),
      remaining:     0,
    }
  }

  state.requests.push(nowSecs)
  await setSetting(dbKey, JSON.stringify(state), userId)

  return { allowed: true, remaining: maxRequests - state.requests.length }
}

/**
 * Checks current rate limit status without consuming a slot.
 */
export async function getRateLimitStatus(
  key: string,
  windowSecs: number,
  maxRequests: number,
): Promise<{ canProceed: boolean; nextAllowedAt?: string; remaining: number }> {
  const session = await auth()
  if (!session?.user?.id) return { canProceed: false, remaining: 0 }

  const userId  = session.user.id
  const dbKey   = `rl:${userId}:${key}`
  const nowSecs = Math.floor(Date.now() / 1000)

  const stored = await getSetting(dbKey)
  if (!stored) return { canProceed: true, remaining: maxRequests }

  const state: RLState = JSON.parse(stored) as RLState
  const recent = state.requests.filter(t => nowSecs - t < windowSecs)

  if (recent.length >= maxRequests) {
    const oldest = Math.min(...recent)
    return {
      canProceed:    false,
      nextAllowedAt: new Date((oldest + windowSecs) * 1000).toISOString(),
      remaining:     0,
    }
  }

  return { canProceed: true, remaining: maxRequests - recent.length }
}
