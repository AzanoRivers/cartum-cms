import { db } from '@/db'
import { project } from '@/db/schema'
import { getDictionary } from '@/locales'
import type { SupportedLocale } from '@/types/project'
import { ForgotPasswordClient } from './ForgotPasswordClient'

export default async function ForgotPasswordPage() {
  const rows     = await db.select({ locale: project.defaultLocale }).from(project).limit(1)
  const locale   = (rows[0]?.locale ?? 'en') as SupportedLocale
  const dict     = getDictionary(locale).auth.forgotPassword
  const hasResend = Boolean(process.env.RESEND_API_KEY)

  return <ForgotPasswordClient dict={dict} hasResend={hasResend} />
}
