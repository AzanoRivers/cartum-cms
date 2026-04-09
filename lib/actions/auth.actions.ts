'use server'

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { project, passwordResetRateLimits } from '@/db/schema'
import type { ActionResult } from '@/types/actions'
import type { SupportedLocale } from '@/types/project'
import { requestPasswordReset, resetPassword } from '@/lib/services/auth.service'
import { sendPasswordResetEmail } from '@/lib/email/mailer'
import { verifyCaptcha } from '@/lib/services/captcha.service'
import { hashToken } from '@/lib/api/auth'

const RATE_LIMIT_MS = 15 * 60 * 1000

const RequestSchema = z.object({
  email:         z.string().email().transform(v => v.toLowerCase().trim()),
  captchaToken:  z.string().min(1),
  captchaAnswer: z.number().int(),
})

const ResetSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(12),
  confirm:  z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match.',
  path: ['confirm'],
})

export async function requestPasswordResetAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = RequestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Enter a valid email address.' }
  }

  if (!verifyCaptcha(parsed.data.captchaToken, parsed.data.captchaAnswer)) {
    return { success: false, error: 'captcha_error' }
  }

  const emailHash = hashToken(parsed.data.email)

  const [existing] = await db
    .select({ requestedAt: passwordResetRateLimits.requestedAt })
    .from(passwordResetRateLimits)
    .where(eq(passwordResetRateLimits.emailHash, emailHash))
    .limit(1)

  if (existing && Date.now() - existing.requestedAt.getTime() < RATE_LIMIT_MS) {
    return { success: false, error: 'rate_limited' }
  }

  const now = new Date()
  await db
    .insert(passwordResetRateLimits)
    .values({ emailHash, requestedAt: now })
    .onConflictDoUpdate({
      target: passwordResetRateLimits.emailHash,
      set:    { requestedAt: now },
    })

  const [rawToken, localeRows] = await Promise.all([
    requestPasswordReset(parsed.data.email),
    db.select({ locale: project.defaultLocale }).from(project).limit(1),
  ])

  if (rawToken) {
    const locale   = (localeRows[0]?.locale ?? 'en') as SupportedLocale
    const baseUrl  = process.env.AUTH_URL ?? 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password/${rawToken}`
    await sendPasswordResetEmail({ to: parsed.data.email, resetUrl, locale })
  }

  return { success: true }
}

export async function resetPasswordAction(
  input: unknown,
): Promise<ActionResult<void>> {
  try {
    const parsed = ResetSchema.safeParse(input)
    if (!parsed.success) {
      const first = parsed.error.errors[0]?.message ?? 'Invalid input.'
      return { success: false, error: first }
    }

    const result = await resetPassword(parsed.data.token, parsed.data.password)
    if (!result.success) {
      return { success: false, error: result.error ?? 'Reset failed.' }
    }

    return { success: true }
  } catch (err) {
    console.error('[resetPasswordAction]', err)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}
