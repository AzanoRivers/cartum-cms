'use server'

import { z } from 'zod'
import type { ActionResult } from '@/types/actions'
import { requestPasswordReset, resetPassword } from '@/lib/services/auth.service'

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

  await requestPasswordReset(parsed.data.email)
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
