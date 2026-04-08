import { db } from '@/db'
import { project } from '@/db/schema'
import { getDictionary } from '@/locales'
import { getSetting } from '@/lib/settings/get-setting'
import type { SupportedLocale } from '@/types/project'
import { ForgotPasswordClient } from './ForgotPasswordClient'

export default async function ForgotPasswordPage() {
  const rows     = await db.select({ locale: project.defaultLocale }).from(project).limit(1)
  const locale   = (rows[0]?.locale ?? 'en') as SupportedLocale
  const dict     = getDictionary(locale).auth.forgotPassword

  const [apiKey, fromEmail] = await Promise.all([
    getSetting('resend_api_key',   process.env.RESEND_API_KEY),
    getSetting('resend_from_email', process.env.RESEND_FROM_EMAIL),
  ])
  const hasResend = Boolean(apiKey && fromEmail)

  return <ForgotPasswordClient dict={dict} hasResend={hasResend} />
}
