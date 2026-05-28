import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getDictionary } from '@/locales'
import { detectLocaleFromHeader } from '@/lib/i18n/getLocale'
import { LoginForm } from '@/components/ui/organisms/LoginForm'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth()
  if (session) redirect('/cms/board')

  const { error } = await searchParams
  const headerStore         = await headers()
  const locale              = detectLocaleFromHeader(headerStore.get('accept-language'))
  const dict                = getDictionary(locale).auth.login
  const registrationEnabled = process.env.CARTUM_NEW_PLAYER === 'true'

  return (
    <main className="relative min-h-dvh flex items-center justify-center bg-bg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <VHSTransition duration="full" className="relative z-[1]">
        <LoginForm dict={dict} initialError={error} registrationEnabled={registrationEnabled} />
      </VHSTransition>
    </main>
  )
}
