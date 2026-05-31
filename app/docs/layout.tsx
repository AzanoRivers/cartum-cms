import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { headers } from 'next/headers'
import { auth } from '@/auth'
import { detectLocaleFromHeader } from '@/lib/i18n/getLocale'
import { Suspense } from 'react'
import { LanguageSelectorWrapper } from '@/components/ui/atoms/LanguageSelectorWrapper'

export default async function PublicDocsLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers()
  const locale      = detectLocaleFromHeader(headerStore.get('accept-language'))
  const session     = await auth()
  const hasSession  = !!session

  const label = hasSession
    ? (locale === 'es' ? 'Ir al tablero' : 'Go to board')
    : (locale === 'es' ? 'Iniciar sesión' : 'Sign in')
  const href = hasSession ? '/cms/board' : '/login'

  return (
    <div data-theme="dusk" className="h-dvh flex flex-col bg-bg text-text">
      {/* Minimal top bar */}
      <header className="shrink-0 flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-2">
            <Image
              src="/images/brand/icon.svg"
              alt="Cartum"
              width={16}
              height={16}
              className="object-contain"
            />
          </div>
          <span className="font-mono text-[11px] tracking-[0.25em] text-muted uppercase">Cartum Docs</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden md:flex"><LanguageSelectorWrapper defaultLocale={locale} /></span>
          <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary transition-all hover:bg-primary/20 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {hasSession ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          )}
          {label}
        </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
