import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDictionary } from '@/locales'
import type { SupportedLocale } from '@/types/project'
import { CredentialsClient } from './CredentialsClient'
import { checkSetupComplete } from '@/db/adapters/check-setup'

export default async function CredentialsPage() {
  // Guard: if super admin already exists, go to theme (next step after credentials)
  const state = await checkSetupComplete()
  if (state === 'no_project') redirect('/setup/theme')

  const jar    = await cookies()
  const locale = jar.get('cartum-setup-locale')?.value

  // Guard: locale must have been selected in Step 1
  if (!locale) redirect('/setup/locale')

  const setup = getDictionary(locale as SupportedLocale).setup
  const dict  = setup.credentials

  return <CredentialsClient dict={dict} layoutDict={{ stepLabels: setup.stepLabels, back: setup.layout.back }} />
}
