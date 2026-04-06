import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { project } from '@/db/schema'
import { getDictionary } from '@/locales'
import type { SupportedLocale } from '@/types/project'
import { InitializingClient } from './InitializingClient'

export default async function InitializingPage() {
  // Guard: project must exist (Step 3 completed)
  const rows = await db.select({ id: project.id }).from(project).limit(1)
  if (rows.length === 0) redirect('/setup/project')

  const jar    = await cookies()
  const locale = (jar.get('cartum-setup-locale')?.value ?? 'en') as SupportedLocale
  const setup  = getDictionary(locale).setup
  const dict   = setup.initializing

  return <InitializingClient dict={dict} layoutDict={{ stepLabels: setup.stepLabels, back: setup.layout.back }} />
}
