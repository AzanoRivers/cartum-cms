import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { project } from '@/db/schema'
import { getDictionary } from '@/locales'
import type { SupportedLocale } from '@/types/project'
import { LoginForm } from '@/components/ui/organisms/LoginForm'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/cms/board')

  const rows   = await db.select({ locale: project.defaultLocale }).from(project).limit(1)
  const locale = (rows[0]?.locale ?? 'en') as SupportedLocale
  const dict   = getDictionary(locale).auth.login

  return (
    <main className="min-h-screen flex items-center justify-center bg-[--color-bg]">
      <VHSTransition duration="full">
        <LoginForm dict={dict} />
      </VHSTransition>
    </main>
  )
}
