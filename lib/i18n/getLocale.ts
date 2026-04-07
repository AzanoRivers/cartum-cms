import { cookies } from 'next/headers'
import type { SupportedLocale } from '@/types/project'

export const DEFAULT_LOCALE: SupportedLocale =
  (process.env.DEFAULT_LOCALE as SupportedLocale) ?? 'en'

/**
 * Reads the user's locale preference from the `cartum-locale` cookie.
 * Falls back to DEFAULT_LOCALE if not set or unrecognised.
 * Server Components only.
 */
export async function getLocale(): Promise<SupportedLocale> {
  const cookieLocale = (await cookies()).get('cartum-locale')?.value
  if (cookieLocale === 'en' || cookieLocale === 'es') return cookieLocale
  return DEFAULT_LOCALE
}
