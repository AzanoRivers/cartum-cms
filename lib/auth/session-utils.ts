'use server'

import { cookies } from 'next/headers'
import { ACTIVE_PROJECT_COOKIE, SWITCH_COOKIE } from '@/lib/auth/constants'

export async function updateSessionProject(projectId: string): Promise<void> {
  const store = await cookies()
  const cookieOpts = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
  }
  store.set(ACTIVE_PROJECT_COOKIE, projectId, { ...cookieOpts, maxAge: 12 * 60 * 60 })
  store.set(SWITCH_COOKIE,         projectId, { ...cookieOpts, maxAge: 60 })
}

export async function clearActiveProject(): Promise<void> {
  const store = await cookies()
  store.delete(ACTIVE_PROJECT_COOKIE)
  store.delete(SWITCH_COOKIE)
}
