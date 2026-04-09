import type { Dictionary } from '@/locales/en'
import { t } from '@/lib/i18n/t'

export type WelcomeStrings = Dictionary['email']['welcome'] & { poweredBy: string }

export interface WelcomeTemplateInput {
  email:       string
  password:    string
  cmsUrl:      string
  strings:     WelcomeStrings
  projectName?: string
}

export function welcomeHtml({ email, password, cmsUrl, strings, projectName }: WelcomeTemplateInput): string {
  const title  = projectName
    ? t(strings, 'titleWith', { project: projectName })
    : strings.titleFallback
  const subject = projectName
    ? t(strings, 'subjectWith', { project: projectName })
    : strings.subjectFallback
  const partOf  = projectName
    ? t(strings, 'partOf', { project: projectName })
    : null

  // Derive base URL for static assets
  const baseUrl = cmsUrl.match(/^(https?:\/\/[^/]+)/)?.[1] ?? ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
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
                  <td valign="middle" style="padding-right:10px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="width:36px;height:36px;background-color:#6366f130;border-radius:50%;line-height:0;">
                          <img src="${baseUrl}/images/brand/icon.png" width="28" height="28" alt="Cartum" style="display:block;margin:4px auto;" />
                        </td>
                      </tr>
                    </table>
                  </td>
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

                <!-- Icon -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <img src="${baseUrl}/images/brand/icon.png" width="52" height="52" alt="Cartum" style="display:block;border-radius:12px;" />
                  </td>
                </tr>

                <!-- Heading -->
                <tr>
                  <td style="padding-bottom:8px;">
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#e2e8f0;letter-spacing:-0.02em;line-height:1.3;">
                      ${title}
                    </h1>
                  </td>
                </tr>

                <!-- Subheading -->
                <tr>
                  <td style="padding-bottom:${partOf ? '12px' : '16px'};">
                    <p style="margin:0;font-size:14px;color:#64748b;line-height:1.7;">
                      ${strings.subtitle}
                    </p>
                  </td>
                </tr>

                ${partOf ? `
                <!-- Part-of project badge -->
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0;display:inline-block;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:600;color:#22d3ee;background-color:#22d3ee10;border:1px solid #22d3ee30;border-radius:6px;padding:6px 12px;letter-spacing:0.04em;">
                      ${partOf}
                    </p>
                  </td>
                </tr>
                ` : ''}

                <!-- Separator -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <div style="height:1px;flex:1;background-color:#2a2a38;"></div>
                      <span style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#2a2a38;letter-spacing:0.2em;">&#183;&#183;&#183;</span>
                      <div style="height:1px;flex:1;background-color:#2a2a38;"></div>
                    </div>
                  </td>
                </tr>

                <!-- Credentials block -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                           style="background-color:#0a0a0f;border:1px solid #2a2a38;border-radius:8px;overflow:hidden;">

                      <!-- Email row -->
                      <tr>
                        <td style="padding:14px 18px;border-bottom:1px solid #2a2a38;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;width:90px;">
                                ${strings.labelEmail}
                              </td>
                              <td style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#e2e8f0;word-break:break-all;">
                                ${email}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Password row -->
                      <tr>
                        <td style="padding:14px 18px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;width:90px;vertical-align:top;padding-top:2px;">
                                ${strings.labelPassword}
                              </td>
                              <td style="font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:700;color:#22d3ee;letter-spacing:0.06em;word-break:break-all;">
                                ${password}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>

                <!-- Warning banner -->
                <tr>
                  <td style="padding-bottom:32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                           style="background-color:#ef444410;border:1px solid #ef444430;border-radius:8px;">
                      <tr>
                        <td style="padding:12px 16px;">
                          <p style="margin:0;font-size:13px;color:#fca5a5;line-height:1.6;">
                            ${strings.warning}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${cmsUrl}"
                       style="display:inline-block;background-color:#6366f1;color:#ffffff;font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:700;letter-spacing:0.08em;text-decoration:none;padding:14px 36px;border-radius:8px;border:1px solid #818cf8;">
                      ${strings.cta} &nbsp;&rarr;
                    </a>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:20px;">
                    <div style="height:1px;background-color:#2a2a38;"></div>
                  </td>
                </tr>

                <!-- Note -->
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                      ${strings.note}
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
