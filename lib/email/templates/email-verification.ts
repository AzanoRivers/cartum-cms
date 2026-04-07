import type { Dictionary } from '@/locales/en'

export type VerifyEmailStrings = Dictionary['email']['verifyEmail'] & { poweredBy: string }

export interface VerifyEmailTemplateInput {
  code:    string
  strings: VerifyEmailStrings
}

export function verifyEmailHtml({ code, strings }: VerifyEmailTemplateInput): string {
  const digits = code.split('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${strings.heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0f;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:#e2e8f0;letter-spacing:0.12em;">CARTUM</span>
              <span style="color:#6366f1;font-size:18px;margin:0 8px;vertical-align:middle;">·</span>
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#64748b;letter-spacing:0.08em;vertical-align:middle;">CMS</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#111118;border:1px solid #2a2a38;border-radius:12px;padding:40px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Icon -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="width:52px;height:52px;background-color:#6366f115;border:1px solid #6366f130;border-radius:12px;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:700;line-height:52px;text-align:center;color:#6366f1;">
                          @
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Heading -->
                <tr>
                  <td style="padding-bottom:8px;">
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#e2e8f0;letter-spacing:-0.02em;line-height:1.3;">
                      ${strings.heading}
                    </h1>
                  </td>
                </tr>

                <!-- Intro -->
                <tr>
                  <td style="padding-bottom:32px;">
                    <p style="margin:0;font-size:14px;color:#64748b;line-height:1.7;">
                      ${strings.intro}
                    </p>
                  </td>
                </tr>

                <!-- OTP Code block -->
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        ${digits.map((d) => `
                        <td style="padding:0 6px;">
                          <div style="width:52px;height:64px;background-color:#0a0a0f;border:1px solid #6366f1;border-radius:10px;text-align:center;line-height:64px;font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:700;color:#6366f1;letter-spacing:0;">
                            ${d}
                          </div>
                        </td>`).join('')}
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Expiry notice -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                           style="background-color:#6366f110;border:1px solid #6366f130;border-radius:8px;">
                      <tr>
                        <td style="padding:12px 16px;">
                          <p style="margin:0;font-size:13px;color:#a5b4fc;line-height:1.6;">
                            &#8987;&nbsp;${strings.expiry}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:20px;">
                    <div style="height:1px;background-color:#2a2a38;"></div>
                  </td>
                </tr>

                <!-- Ignore notice -->
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
