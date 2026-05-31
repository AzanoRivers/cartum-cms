'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export function LanguageSelector({
  className = '',
  defaultLocale = 'en',
}: {
  className?:     string
  defaultLocale?: 'en' | 'es'
}) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const param        = searchParams.get('lang')
  const current: 'en' | 'es' = param === 'en' || param === 'es' ? param : defaultLocale

  function switchTo(lang: 'en' | 'es') {
    const params = new URLSearchParams(searchParams.toString())
    params.set('lang', lang)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className={`flex items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5 ${className}`}>
      {(['en', 'es'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => switchTo(lang)}
          disabled={current === lang}
          className={[
            'rounded px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest transition-colors cursor-pointer',
            current === lang
              ? 'bg-primary/20 text-primary font-semibold cursor-default'
              : 'text-muted hover:text-text',
          ].join(' ')}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
