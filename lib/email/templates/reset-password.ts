import type { Dictionary } from '@/locales/en'

export type ResetPasswordStrings = Dictionary['email']['reset'] & { poweredBy: string }

export interface ResetPasswordTemplateInput {
  resetUrl: string
  baseUrl:  string
  strings:  ResetPasswordStrings
}

export function resetPasswordHtml({ resetUrl, baseUrl, strings }: ResetPasswordTemplateInput): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${strings.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0f;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Logo / Brand header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!-- Icon with glow ring -->
                  <td valign="middle" style="padding-right:10px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="width:36px;height:36px;background-color:#6366f130;border-radius:50%;line-height:0;">
                          <img src="${baseUrl}/images/brand/icon.png" width="28" height="28" alt="Cartum" style="display:block;margin:4px auto;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- CARTUM wordmark -->
                  <td valign="middle">
                    <span style="font-family:'Courier New',Courier,monospace;font-size:14px;font-weight:700;color:#e2e8f0;letter-spacing:0.3em;text-transform:uppercase;">CARTUM</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#111118;border:1px solid #2a2a38;border-radius:12px;padding:40px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Card icon -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="width:56px;height:56px;background-color:#6366f115;border:1px solid #6366f130;border-radius:14px;line-height:0;">
                          <img src="${baseUrl}/images/brand/icon.png" width="36" height="36" alt="Cartum" style="display:block;margin:10px auto;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Heading -->
                <tr>
                  <td style="padding-bottom:12px;">
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#e2e8f0;letter-spacing:-0.02em;line-height:1.3;">
                      ${strings.heading}
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding-bottom:32px;">
                    <p style="margin:0;font-size:14px;color:#64748b;line-height:1.7;">
                      ${strings.intro}
                    </p>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background-color:#6366f1;color:#ffffff;font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:700;letter-spacing:0.08em;text-decoration:none;padding:14px 36px;border-radius:8px;border:1px solid #818cf8;">
                      ${strings.cta} &nbsp;&rarr;
                    </a>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <div style="height:1px;background-color:#2a2a38;"></div>
                  </td>
                </tr>

                <!-- Fallback URL -->
                <tr>
                  <td style="padding-bottom:10px;">
                    <p style="margin:0;font-size:12px;color:#64748b;">
                      ${strings.urlFallback}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:24px;">
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;color:#22d3ee;word-break:break-all;background-color:#0a0a0f;border:1px solid #2a2a38;border-radius:6px;padding:10px 14px;line-height:1.6;">
                      ${resetUrl}
                    </p>
                  </td>
                </tr>

                <!-- Security note -->
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                      ${strings.ignore}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0;font-size:12px;color:#2a2a38;">
                ${strings.poweredBy}&nbsp;
                <a href="https://azanorivers.com" style="color:#22d3ee;text-decoration:none;">AzanoRivers</a>
                <span style="color:#2a2a38;margin:0 6px;">&#xB7;</span>
                <a href="https://azanolabs.com" style="color:#6366f1;text-decoration:none;">AzanoLabs</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
