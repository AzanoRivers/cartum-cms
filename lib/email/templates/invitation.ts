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
  baseUrl,
}: {
  to:          string
  projectName: string
  inviteUrl:   string
  expiryDays:  number
  locale?:     SupportedLocale
  baseUrl?:    string
}): Promise<void> {
  const apiKey  = await getSetting('resend_api_key', process.env.RESEND_API_KEY)
  const from    = await getSetting('resend_from_email', process.env.RESEND_FROM_EMAIL)

  if (!apiKey || !from) throw new Error('EMAIL_NOT_CONFIGURED')

  const copy    = INVITE_COPY[locale] ?? INVITE_COPY.en
  const resend  = new Resend(apiKey)
  const logoUrl = baseUrl ? `${baseUrl}/images/brand/icon.png` : null

  await resend.emails.send({
    from,
    to,
    subject: copy.subject(projectName),
    html: `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:32px 16px;background:#0a0a0f;font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
    <tr>
      <td>
        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#111118;border:1px solid #2a2a38;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:24px 28px 20px;border-bottom:1px solid #2a2a38;">
              <!-- Logo row -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    ${logoUrl
                      ? `<img src="${logoUrl}" alt="Cartum" width="20" height="20"
                           style="display:block;border-radius:4px;margin-right:8px;" />`
                      : `<span style="font-size:14px;color:#6366f1;margin-right:8px;">◈</span>`
                    }
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:10px;color:#64748b;letter-spacing:0.3em;text-transform:uppercase;">
                      CARTUM CMS
                    </span>
                  </td>
                </tr>
              </table>
              <!-- Heading -->
              <h1 style="margin:16px 0 0;font-size:18px;font-weight:600;color:#e2e8f0;">
                ${copy.heading}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.6;">
                ${copy.body(projectName)}
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#6366f1;border-radius:8px;">
                    <a href="${inviteUrl}"
                      style="display:inline-block;padding:10px 20px;color:#ffffff;font-size:13px;font-weight:500;text-decoration:none;">
                      ${copy.cta}
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Footer note -->
              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                ${copy.expiry(expiryDays)}<br/>
                ${copy.ignore}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  })
}
