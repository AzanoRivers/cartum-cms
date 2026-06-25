'use server'

import { auth } from '@/auth'
import { consumeRateLimit, getRateLimitStatus } from '@/lib/actions/rate-limit.actions'
import { RATE_LIMITS } from '@/lib/rate-limits'

export interface HelpAttachment {
  filename: string
  content:  string   // base64
  mimeType: string
}

export interface HelpFormInput {
  subject:     string
  email:       string
  message:     string
  attachments: HelpAttachment[]
}

const MAX_ATTACHMENTS = 10
const MAX_CHARS       = 800
const RL              = RATE_LIMITS.HELP_REPORT

export async function sendHelpReport(
  input: HelpFormInput,
): Promise<{ success: boolean; error?: string; nextAllowedAt?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'UNAUTHORIZED' }

  if (!input.subject?.trim()) return { success: false, error: 'Subject is required.' }
  if (!input.email?.trim())   return { success: false, error: 'Email is required.' }
  if (!input.message?.trim()) return { success: false, error: 'Message is required.' }
  if (input.message.length > MAX_CHARS) return { success: false, error: `Message must be at most ${MAX_CHARS} characters.` }
  if (input.attachments.length > MAX_ATTACHMENTS) return { success: false, error: `Maximum ${MAX_ATTACHMENTS} images allowed.` }

  // Rate limit check + consume
  const rl = await consumeRateLimit(RL.key, RL.windowSecs, RL.maxRequests)
  if (!rl.allowed) {
    return { success: false, error: 'RATE_LIMITED', nextAllowedAt: rl.nextAllowedAt }
  }

  const helpEmail = process.env.HELP_EMAIL_AZANO
  if (!helpEmail) return { success: false, error: 'Help email not configured.' }

  const accountEmail = session.user.email ?? '(no email in session)'
  const userId       = session.user.id

  const html = `
    <div style="font-family:monospace;max-width:600px;margin:0 auto;padding:24px;background:#0a0a0f;color:#e2e8f0;border-radius:8px;">
      <h2 style="color:#6366f1;margin-bottom:16px;">📬 Cartum CMS — Help Report</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr><td style="padding:6px 0;color:#94a3b8;width:120px;">Account email:</td><td style="color:#6366f1;font-weight:bold;">${accountEmail}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Contact email:</td><td style="color:#e2e8f0;">${input.email}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">User ID:</td><td style="color:#e2e8f0;">${userId}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Subject:</td><td style="color:#e2e8f0;font-weight:bold;">${input.subject}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Sent at:</td><td style="color:#e2e8f0;">${new Date().toISOString()}</td></tr>
      </table>
      <div style="background:#111118;border:1px solid #2a2a38;border-radius:6px;padding:16px;white-space:pre-wrap;color:#e2e8f0;line-height:1.6;">
${input.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
      ${input.attachments.length > 0 ? `<p style="color:#64748b;margin-top:12px;font-size:12px;">${input.attachments.length} image(s) attached.</p>` : ''}
    </div>
  `

  try {
    const { sendEmailViaProvider, resolveActiveProvider } = await import('@/lib/email/mailer')
    const activeProvider = await resolveActiveProvider(null)
    const result = await sendEmailViaProvider(
      { to: helpEmail, subject: `[Cartum Help] ${input.subject}`, html, attachments: input.attachments },
      activeProvider as 'resend' | 'ses',
    )
    if (!result.sent) return { success: false, error: result.error ?? 'Failed to send.' }

    const nextAllowedAt = new Date(Date.now() + RL.windowSecs * 1000).toISOString()
    return { success: true, nextAllowedAt }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function getHelpRateStatus(): Promise<{ canSend: boolean; nextAllowedAt?: string }> {
  const status = await getRateLimitStatus(RL.key, RL.windowSecs, RL.maxRequests)
  return { canSend: status.canProceed, nextAllowedAt: status.nextAllowedAt }
}
