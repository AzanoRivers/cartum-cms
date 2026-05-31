'use client'

import { Suspense } from 'react'
import { LanguageSelector } from './LanguageSelector'

export function LanguageSelectorWrapper({
  className,
  defaultLocale,
}: {
  className?:     string
  defaultLocale?: 'en' | 'es'
}) {
  return (
    <Suspense fallback={null}>
      <LanguageSelector className={className} defaultLocale={defaultLocale} />
    </Suspense>
  )
}
