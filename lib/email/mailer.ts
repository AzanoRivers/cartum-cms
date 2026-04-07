import { Resend } from 'resend'
import { getSetting } from '@/lib/settings/get-setting'
import { getDictionary } from '@/locales'
import { resetPasswordHtml } from '@/lib/email/templates/reset-password'
import { welcomeHtml } from '@/lib/email/templates/welcome'
import { verifyEmailHtml } from '@/lib/email/templates/email-verification'
import { t } from '@/lib/i18n/t'
import type { SupportedLocale } from '@/types/project'

const FROM_ADDRESS = 'labs@azanorivers.com'

async function getResendClient(): Promise<Resend | null> {
  const apiKey = await getSetting('resend_api_key', process.env.RESEND_API_KEY)
  if (!apiKey) return null
  return new Resend(apiKey)
}

// ── Password reset ─────────────────────────────────────────────────────────────

export interface SendPasswordResetEmailInput {
  to:       string
  resetUrl: string
  locale:   SupportedLocale
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
): Promise<{ sent: boolean }> {
  const resend = await getResendClient()
  if (!resend) return { sent: false }

  const dict    = getDictionary(input.locale)
  const strings = { ...dict.email.reset, poweredBy: dict.email.poweredBy }

  await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      input.to,
    subject: strings.subject,
    html:    resetPasswordHtml({ resetUrl: input.resetUrl, strings }),
  })

  return { sent: true }
}

// ── Welcome / credentials confirmation ────────────────────────────────────────

export interface SendWelcomeEmailInput {
  to:           string
  password:     string
  cmsUrl:       string
  locale:       SupportedLocale
  projectName?: string
}

export async function sendWelcomeEmail(
  input: SendWelcomeEmailInput,
): Promise<{ sent: boolean }> {
  const resend = await getResendClient()
  if (!resend) return { sent: false }

  const dict    = getDictionary(input.locale)
  const strings = { ...dict.email.welcome, poweredBy: dict.email.poweredBy }

  const subject = input.projectName
    ? t(strings, 'subjectWith', { project: input.projectName })
    : strings.subjectFallback

  await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      input.to,
    subject,
    html:    welcomeHtml({
      email:       input.to,
      password:    input.password,
      cmsUrl:      input.cmsUrl,
      strings,
      projectName: input.projectName,
    }),
  })

  return { sent: true }
}

// ── Email change OTP ───────────────────────────────────────────────────────────

export async function sendEmailOtp(input: {
  to:     string
  code:   string
  locale: SupportedLocale
}): Promise<{ sent: boolean }> {
  const resend = await getResendClient()
  if (!resend) return { sent: false }

  const dict    = getDictionary(input.locale)
  const strings = { ...dict.email.verifyEmail, poweredBy: dict.email.poweredBy }
  const subject = t(strings, 'subject', { code: input.code })

  await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      input.to,
    subject,
    html:    verifyEmailHtml({ code: input.code, strings }),
  })

  return { sent: true }
}
