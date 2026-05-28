import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { detectLocaleFromHeader } from '@/lib/i18n/getLocale'
import { PlayerRegisterForm } from '@/components/ui/organisms/PlayerRegisterForm'

export default async function CartumPlayerPage() {
  if (process.env.CARTUM_NEW_PLAYER !== 'true') {
    notFound()
  }

  const headerStore   = await headers()
  const initialLocale = detectLocaleFromHeader(headerStore.get('accept-language'))

  return <PlayerRegisterForm initialLocale={initialLocale} />
}
