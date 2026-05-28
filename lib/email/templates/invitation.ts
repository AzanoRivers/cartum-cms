import { Resend } from 'resend'
import { getSetting } from '@/lib/settings/get-setting'

const INVITE_COPY = {
  en: {
    subject:  (p: string) => `You've been invited to join ${p} on Cartum`,
    heading:  "You're invited",
    body:     (p: string) => `You've been invited to join <strong style="color:#e2e8f0">${p}</strong> on Cartum.`,
    cta:      'Accept invitation →',
    expiry:   (d: number) => `This invitation expires in ${d} days.`,
    ignore:   "If you didn't expect this email, you can safely ignore it.",
  },
  es: {
    subject:  (p: string) => `Has sido invitado a unirte a ${p} en Cartum`,
    heading:  'Tienes una invitación',
    body:     (p: string) => `Has sido invitado a unirte a <strong style="color:#e2e8f0">${p}</strong> en Cartum.`,
    cta:      'Aceptar invitación →',
    expiry:   (d: number) => `Esta invitación expira en ${d} días.`,
    ignore:   'Si no esperabas este correo, puedes ignorarlo sin problema.',
  },
} as const

type SupportedLocale = keyof typeof INVITE_COPY

export async function sendInvitationEmail({
  to,
  projectName,
  inviteUrl,
  expiryDays,
  locale = 'en',
}: {
  to:          string
  projectName: string
  inviteUrl:   string
  expiryDays:  number
  locale?:     SupportedLocale
}): Promise<void> {
  const apiKey  = await getSetting('resend_api_key', process.env.RESEND_API_KEY)
  const from    = await getSetting('resend_from_email', process.env.RESEND_FROM_EMAIL)

  if (!apiKey || !from) throw new Error('EMAIL_NOT_CONFIGURED')

  const copy   = INVITE_COPY[locale] ?? INVITE_COPY.en
  const resend = new Resend(apiKey)

  await resend.emails.send({
    from,
    to,
    subject: copy.subject(projectName),
    html: `
      <div style="font-family:monospace;max-width:480px;margin:0 auto;padding:32px 24px;background:#111118;color:#e2e8f0;border-radius:12px;border:1px solid #2a2a38;">
        <p style="font-size:11px;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 24px;">◈ CARTUM</p>
        <h1 style="font-size:18px;font-weight:600;margin:0 0 12px;">${copy.heading}</h1>
        <p style="font-size:14px;color:#94a3b8;margin:0 0 24px;">${copy.body(projectName)}</p>
        <a href="${inviteUrl}"
          style="display:inline-block;background:#6366f1;color:#fff;font-size:13px;font-weight:500;padding:10px 20px;border-radius:8px;text-decoration:none;margin-bottom:24px;">
          ${copy.cta}
        </a>
        <p style="font-size:12px;color:#64748b;margin:0;">
          ${copy.expiry(expiryDays)}<br/>
          ${copy.ignore}
        </p>
      </div>
    `,
  })
}
