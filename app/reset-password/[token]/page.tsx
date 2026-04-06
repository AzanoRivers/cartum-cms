import { db } from '@/db'
import { project } from '@/db/schema'
import { getDictionary } from '@/locales'
import type { SupportedLocale } from '@/types/project'
import { ResetPasswordClient } from './ResetPasswordClient'

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const rows   = await db.select({ locale: project.defaultLocale }).from(project).limit(1)
  const locale = (rows[0]?.locale ?? 'en') as SupportedLocale
  const dict   = getDictionary(locale).auth.resetPassword

  return <ResetPasswordClient token={token} dict={dict} />
}
