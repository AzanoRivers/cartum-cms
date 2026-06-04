import { DUSK } from './dusk-theme'

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

function buildHtml({
  locale, projectName, inviteUrl, expiryDays, logoUrl,
}: {
  locale: SupportedLocale
  projectName: string
  inviteUrl: string
  expiryDays: number
  logoUrl: string | null
}): string {
  const copy = INVITE_COPY[locale] ?? INVITE_COPY.en
  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:32px 16px;background:${DUSK.bg};font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:${DUSK.surface};border:1px solid ${DUSK.border};border-radius:12px;overflow:hidden;">
        <tr><td style="padding:24px 28px 20px;border-bottom:1px solid ${DUSK.border};">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;">
              ${logoUrl
                ? `<img src="${logoUrl}" alt="Cartum" width="20" height="20" style="display:block;border-radius:4px;margin-right:8px;" />`
                : `<span style="font-size:14px;color:#6366f1;margin-right:8px;">◈</span>`}
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:10px;color:${DUSK.muted};letter-spacing:0.3em;text-transform:uppercase;">CARTUM CMS</span>
            </td>
          </tr></table>
          <h1 style="margin:16px 0 0;font-size:18px;font-weight:600;color:${DUSK.text};">${copy.heading}</h1>
        </td></tr>
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 24px;font-size:14px;color:${DUSK.muted};line-height:1.6;">${copy.body(projectName)}</p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
            <td style="background:${DUSK.primary};border-radius:8px;">
              <a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;color:#ffffff;font-size:13px;font-weight:500;text-decoration:none;">${copy.cta}</a>
            </td>
          </tr></table>
          <p style="margin:0;font-size:12px;color:${DUSK.muted};line-height:1.6;">${copy.expiry(expiryDays)}<br/>${copy.ignore}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function sendInvitationEmail({
  to, projectName, inviteUrl, expiryDays, locale = 'en', baseUrl, projectId,
}: {
  to:          string
  projectName: string
  inviteUrl:   string
  expiryDays:  number
  locale?:     SupportedLocale
  baseUrl?:    string
  projectId?:  string | null
}): Promise<void> {
  const { resolveActiveProvider, sendEmailViaProvider } = await import('@/lib/email/mailer')

  const provider = await resolveActiveProvider(projectId)
  const logoUrl  = baseUrl ? `${baseUrl}/images/brand/icon.png` : null
  const html     = buildHtml({ locale, projectName, inviteUrl, expiryDays, logoUrl })
  const copy     = INVITE_COPY[locale] ?? INVITE_COPY.en

  const result = await sendEmailViaProvider(
    { to, subject: copy.subject(projectName), html, projectId },
    provider,
  )

  if (!result.sent) throw new Error('EMAIL_NOT_CONFIGURED')
}
