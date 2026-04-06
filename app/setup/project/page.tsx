import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getDictionary } from '@/locales'
import type { SupportedLocale } from '@/types/project'
import { ProjectClient } from './ProjectClient'

export default async function ProjectPage() {
  // Guard: super admin must exist (Step 2 completed)
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isSuperAdmin, true))
    .limit(1)

  if (rows.length === 0) redirect('/setup/credentials')

  const jar    = await cookies()
  const locale = (jar.get('cartum-setup-locale')?.value ?? 'en') as SupportedLocale
  const setup  = getDictionary(locale).setup
  const dict   = setup.project

  return <ProjectClient dict={dict} layoutDict={{ stepLabels: setup.stepLabels, back: setup.layout.back }} />
}
