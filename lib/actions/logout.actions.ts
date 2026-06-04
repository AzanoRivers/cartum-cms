'use server'

import { signOut }      from '@/auth'
import { cookies }      from 'next/headers'
import { ACTIVE_PROJECT_COOKIE, SWITCH_COOKIE } from '@/lib/auth/constants'

export async function logout(): Promise<void> {
  // Clear project cookies before NextAuth clears the session
  // (can't set cookies after redirect, so do it here first)
  const store = await cookies()
  store.delete(ACTIVE_PROJECT_COOKIE)
  store.delete(SWITCH_COOKIE)

  await signOut({ redirectTo: '/login' })
}
