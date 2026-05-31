import { headers } from 'next/headers'
import { getDictionary } from '@/locales'
import { detectLocaleFromHeader } from '@/lib/i18n/getLocale'
import { DocsPage } from '@/components/ui/organisms/docs/DocsPage'
import type { Metadata } from 'next'
import type { SupportedLocale } from '@/types/project'

export const metadata: Metadata = {
  title: 'Cartum Docs',
  description: 'Documentation for Cartum CMS: decks, cards, roles, storage, API and more.',
}

export default async function PublicDocsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang }    = await searchParams
  const headerStore = await headers()
  const fallback    = detectLocaleFromHeader(headerStore.get('accept-language'))
  const locale: SupportedLocale = lang === 'en' || lang === 'es' ? lang : fallback
  const d = getDictionary(locale).cms.docs

  return <DocsPage d={d} locale={locale} noPad />
}
