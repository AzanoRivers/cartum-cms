import { Resend } from 'resend'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { getSetting } from '@/lib/settings/get-setting'
import { getDictionary } from '@/locales'
import { resetPasswordHtml } from '@/lib/email/templates/reset-password'
import { welcomeHtml } from '@/lib/email/templates/welcome'
import { verifyEmailHtml } from '@/lib/email/templates/email-verification'
import { t } from '@/lib/i18n/t'
import type { SupportedLocale } from '@/types/project'
import type { EmailProvider } from '@/lib/actions/settings.actions'

// ── Provider resolution ────────────────────────────────────────────────────────

async function resolveActiveProvider(projectId?: string | null): Promise<EmailProvider> {
  const project = projectId ? await getSetting(`email_provider:${projectId}`) : null
  const global  = await getSetting('default_email_provider')
  return (project ?? global ?? 'resend') as EmailProvider
}

// ── Resend client ──────────────────────────────────────────────────────────────

async function getResendClient(projectId?: string | null): Promise<Resend | null> {
  const key = await getSetting(
    projectId ? `resend_api_key:${projectId}` : 'resend_api_key',
    process.env.RESEND_API_KEY,
  )
  if (!key) return null
  return new Resend(key)
}

async function getResendFrom(projectId?: string | null): Promise<string | undefined> {
  return getSetting(
    projectId ? `resend_from_email:${projectId}` : 'resend_from_email',
    process.env.RESEND_FROM_EMAIL,
  ) ?? undefined
}

// ── AWS SES client ─────────────────────────────────────────────────────────────

async function getSesClient(projectId?: string | null): Promise<SESClient | null> {
  const [ak, sk] = await Promise.all([
    getSetting(projectId ? `ses_access_key_id:${projectId}`     : 'ses_access_key_id',     process.env.AWS_SES_ACCESS_KEY_ID),
    getSetting(projectId ? `ses_secret_access_key:${projectId}` : 'ses_secret_access_key', process.env.AWS_SES_SECRET_ACCESS_KEY),
  ])
  if (!ak || !sk) return null
  return new SESClient({
    region:      process.env.AWS_SES_REGION ?? 'us-east-1',
    credentials: { accessKeyId: ak, secretAccessKey: sk },
  })
}

async function getSesFrom(projectId?: string | null): Promise<string | undefined> {
  return getSetting(
    projectId ? `ses_from_email:${projectId}` : 'ses_from_email',
    process.env.AWS_SES_FROM_EMAIL,
  ) ?? undefined
}

// ── Unified send ───────────────────────────────────────────────────────────────

export interface EmailAttachment {
  filename: string
  content:  string   // base64
  mimeType: string
}

interface SendParams {
  to:           string
  subject:      string
  html:         string
  projectId?:   string | null
  attachments?: EmailAttachment[]
}

/** Send via a specific provider (bypasses active-provider resolution). */
export async function sendEmailViaProvider(
  params:       SendParams,
  provider:     EmailProvider,
  overrideFrom?: string,
): Promise<{ sent: boolean; error?: string }> {
  if (provider === 'ses') {
    const [ses, resolvedFrom] = await Promise.all([
      getSesClient(params.projectId),
      getSesFrom(params.projectId),
    ])
    const from = overrideFrom || resolvedFrom
    if (!ses || !from) return { sent: false, error: 'AWS SES no está configurado. Verifica las credenciales.' }
    try {
      if (params.attachments?.length) {
        const { SendRawEmailCommand } = await import('@aws-sdk/client-ses')
        const boundary = `----=_Part_${Math.random().toString(36).slice(2)}`
        const rawLines = [
          `From: ${from}`, `To: ${params.to}`, `Subject: ${params.subject}`,
          `MIME-Version: 1.0`, `Content-Type: multipart/mixed; boundary="${boundary}"`, ``,
          `--${boundary}`, `Content-Type: text/html; charset=UTF-8`, `Content-Transfer-Encoding: base64`, ``,
          Buffer.from(params.html).toString('base64').match(/.{1,76}/g)?.join('\n') ?? '',
          ...params.attachments.flatMap(a => [
            `--${boundary}`,
            `Content-Type: ${a.mimeType}; name="${a.filename}"`,
            `Content-Disposition: attachment; filename="${a.filename}"`,
            `Content-Transfer-Encoding: base64`, ``,
            a.content.match(/.{1,76}/g)?.join('\n') ?? a.content,
          ]),
          `--${boundary}--`,
        ]
        await ses.send(new SendRawEmailCommand({ RawMessage: { Data: Buffer.from(rawLines.join('\n')) } }))
      } else {
        await ses.send(new SendEmailCommand({
          Source: from, Destination: { ToAddresses: [params.to] },
          Message: { Subject: { Data: params.subject, Charset: 'UTF-8' }, Body: { Html: { Data: params.html, Charset: 'UTF-8' } } },
        }))
      }
      return { sent: true }
    } catch (err) {
      return { sent: false, error: err instanceof Error ? err.message : 'SES send failed.' }
    }
  }
  const [resend, resolvedFrom] = await Promise.all([
    getResendClient(params.projectId),
    getResendFrom(params.projectId),
  ])
  const from = overrideFrom || resolvedFrom
  if (!resend || !from) return { sent: false, error: 'Resend no está configurado. Verifica las credenciales.' }
  const result = await resend.emails.send({
    from, to: params.to, subject: params.subject, html: params.html,
    attachments: params.attachments?.map(a => ({ filename: a.filename, content: a.content })),
  } as Parameters<typeof resend.emails.send>[0])
  if (result.error) return { sent: false, error: result.error.message }
  return { sent: true }
}

// Export for use in help.actions.ts
export { resolveActiveProvider }

export async function sendEmail(params: SendParams): Promise<{ sent: boolean; error?: string }> {
  const provider = await resolveActiveProvider(params.projectId)

  if (provider === 'ses') {
    const [ses, from] = await Promise.all([
      getSesClient(params.projectId),
      getSesFrom(params.projectId),
    ])
    if (!ses || !from) return { sent: false, error: 'AWS SES no está configurado. Verifica las credenciales.' }
    try {
      await ses.send(new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [params.to] },
        Message: {
          Subject: { Data: params.subject, Charset: 'UTF-8' },
          Body:    { Html: { Data: params.html, Charset: 'UTF-8' } },
        },
      }))
      return { sent: true }
    } catch (err) {
      return { sent: false, error: err instanceof Error ? err.message : 'Error al enviar con AWS SES.' }
    }
  }

  // Resend
  const [resend, from] = await Promise.all([
    getResendClient(params.projectId),
    getResendFrom(params.projectId),
  ])
  if (!resend || !from) return { sent: false, error: 'Resend no está configurado. Verifica las credenciales.' }
  const result = await resend.emails.send({ from, to: params.to, subject: params.subject, html: params.html })
  if (result.error) return { sent: false, error: result.error.message }
  return { sent: true }
}

// ── Provider status check (for super_admin defaults badge) ────────────────────

export async function checkProviderStatus(provider: EmailProvider, projectId?: string | null): Promise<{
  configured: boolean
  error?:     string
}> {
  if (provider === 'ses') {
    const [ak, sk, from] = await Promise.all([
      getSetting(projectId ? `ses_access_key_id:${projectId}`     : 'ses_access_key_id',     process.env.AWS_SES_ACCESS_KEY_ID),
      getSetting(projectId ? `ses_secret_access_key:${projectId}` : 'ses_secret_access_key', process.env.AWS_SES_SECRET_ACCESS_KEY),
      getSesFrom(projectId),
    ])
    if (!ak || !sk || !from) return { configured: false, error: 'Missing Access Key ID, Secret Key, or From email.' }
    return { configured: true }
  }
  // Resend
  const [key, from] = await Promise.all([
    getResendClient(projectId),
    getResendFrom(projectId),
  ])
  if (!key || !from) return { configured: false, error: 'Missing API key or From email.' }
  return { configured: true }
}

// ── Password reset ─────────────────────────────────────────────────────────────

export interface SendPasswordResetEmailInput {
  to:        string
  resetUrl:  string
  locale:    SupportedLocale
  projectId?: string | null
}

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<{ sent: boolean }> {
  const dict    = getDictionary(input.locale)
  const strings = { ...dict.email.reset, poweredBy: dict.email.poweredBy }
  const baseUrl = input.resetUrl.match(/^(https?:\/\/[^/]+)/)?.[1] ?? ''
  const result  = await sendEmail({
    to:        input.to,
    subject:   strings.subject,
    html:      resetPasswordHtml({ resetUrl: input.resetUrl, baseUrl, strings }),
    projectId: input.projectId,
  })
  return { sent: result.sent }
}

// ── Welcome / credentials confirmation ────────────────────────────────────────

export interface SendWelcomeEmailInput {
  to:           string
  password:     string
  cmsUrl:       string
  locale:       SupportedLocale
  projectName?: string
  projectId?:   string | null
}

export async function sendWelcomeEmail(input: SendWelcomeEmailInput): Promise<{ sent: boolean }> {
  const dict    = getDictionary(input.locale)
  const strings = { ...dict.email.welcome, poweredBy: dict.email.poweredBy }
  const subject = input.projectName
    ? t(strings, 'subjectWith', { project: input.projectName })
    : strings.subjectFallback
  const result = await sendEmail({
    to:        input.to,
    subject,
    html:      welcomeHtml({ email: input.to, password: input.password, cmsUrl: input.cmsUrl, strings, projectName: input.projectName }),
    projectId: input.projectId,
  })
  return { sent: result.sent }
}

// ── Email change OTP ───────────────────────────────────────────────────────────

export async function sendEmailOtp(input: {
  to:        string
  code:      string
  locale:    SupportedLocale
  projectId?: string | null
}): Promise<{ sent: boolean }> {
  const dict    = getDictionary(input.locale)
  const strings = { ...dict.email.verifyEmail, poweredBy: dict.email.poweredBy }
  const subject = t(strings, 'subject', { code: input.code })
  const baseUrl = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const result  = await sendEmail({
    to:        input.to,
    subject,
    html:      verifyEmailHtml({ code: input.code, baseUrl, strings }),
    projectId: input.projectId,
  })
  return { sent: result.sent }
}
