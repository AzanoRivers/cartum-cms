import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { project, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getDictionary } from '@/locales'
import type { SupportedLocale } from '@/types/project'
import { SetupLayout } from '@/components/ui/layouts/SetupLayout'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { ReadyClient } from './ReadyClient'

export default async function ReadyPage() {
  const [proj]  = await db.select().from(project).limit(1)
  const [admin] = await db.select().from(users).where(eq(users.isSuperAdmin, true)).limit(1)

  if (!proj || !admin) redirect('/setup')

  const jar    = await cookies()
  const locale = (jar.get('cartum-setup-locale')?.value ?? 'en') as SupportedLocale
  const setup  = getDictionary(locale).setup
  const dict   = setup.ready

  return (
    <SetupLayout currentStep="ready" layoutDict={{ stepLabels: setup.stepLabels, back: setup.layout.back }}>
      <VHSTransition>
        <ReadyClient projectName={proj.name} adminEmail={admin.email} dict={dict} />
      </VHSTransition>
    </SetupLayout>
  )
}
