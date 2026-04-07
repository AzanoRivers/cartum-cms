import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getDictionary } from '@/locales'
import { getTheme } from '@/lib/settings/get-setting'
import type { SupportedLocale } from '@/types/project'
import { ThemeClient } from './ThemeClient'

export default async function ThemePage() {
  // Guard: credentials step must be completed (user must exist)
  const rows = await db.select({ id: users.id }).from(users).limit(1)
  if (rows.length === 0) redirect('/setup/credentials')

  const jar    = await cookies()
  const locale = (jar.get('cartum-setup-locale')?.value ?? 'en') as SupportedLocale
  const setup  = getDictionary(locale).setup
  const dict   = setup.theme

  const currentTheme = await getTheme()

  return (
    <ThemeClient
      dict={dict}
      layoutDict={{ stepLabels: setup.stepLabels, back: setup.layout.back }}
      currentTheme={currentTheme}
    />
  )
}
