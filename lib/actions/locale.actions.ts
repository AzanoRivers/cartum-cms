'use server'

import { cookies } from 'next/headers'
import type { SupportedLocale } from '@/types/project'

/**
 * Persists the user's locale preference as a cookie.
 * The locale is read by getLocale() on every page render.
 */
export async function setLocale(locale: SupportedLocale): Promise<void> {
  ;(await cookies()).set('cartum-locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
