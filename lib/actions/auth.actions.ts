'use server'

import { z } from 'zod'
import { db } from '@/db'
import { project } from '@/db/schema'
import type { ActionResult } from '@/types/actions'
import type { SupportedLocale } from '@/types/project'
import { requestPasswordReset, resetPassword } from '@/lib/services/auth.service'
import { sendPasswordResetEmail } from '@/lib/email/mailer'

const RequestSchema = z.object({
  email: z.string().email(),
})

const ResetSchema = z.object({
  token:       z.string().min(1),
  password:    z.string().min(12),
  confirm:     z.string(),
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

  const rawToken = await requestPasswordReset(parsed.data.email)

  if (rawToken) {
    const rows    = await db.select({ locale: project.defaultLocale }).from(project).limit(1)
    const locale  = (rows[0]?.locale ?? 'en') as SupportedLocale
    const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`
    await sendPasswordResetEmail({ to: parsed.data.email, resetUrl, locale })
  }

  // Always succeed — never reveal whether email exists
  return { success: true }
}

export async function resetPasswordAction(
  input: unknown,
): Promise<ActionResult<void>> {
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
}
