import { en } from './en'
import { es } from './es'
import type { SupportedLocale } from '@/types/project'

export const dictionaries = { en, es }

export function getDictionary(locale: SupportedLocale) {
  return dictionaries[locale]
}
