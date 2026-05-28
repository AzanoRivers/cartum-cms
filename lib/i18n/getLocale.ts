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

/**
 * Detects locale from the Accept-Language header.
 * Any Spanish variant (es-MX, es-ES, es-AR, …) → 'es'. Everything else → 'en'.
 * Server Components only.
 */
export function detectLocaleFromHeader(acceptLanguage: string | null): SupportedLocale {
  if (!acceptLanguage) return 'en'
  const top = acceptLanguage
    .split(',')
    .map((entry) => {
      const [lang, q] = entry.trim().split(';q=')
      return { lang: lang.trim().toLowerCase(), weight: q ? parseFloat(q) : 1.0 }
    })
    .sort((a, b) => b.weight - a.weight)[0]?.lang ?? ''
  return top.startsWith('es') ? 'es' : 'en'
}
