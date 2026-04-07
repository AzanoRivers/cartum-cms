'use server'

import { z } from 'zod'
import { auth } from '@/auth'
import { db } from '@/db'
import { project } from '@/db/schema'
import { requestEmailChange, confirmEmailChange, verifyPassword, hashPassword } from '@/lib/services/auth.service'
import { usersRepository } from '@/db/repositories/users.repository'
import { sendEmailOtp } from '@/lib/email/mailer'
import type { ActionResult } from '@/types/actions'
import type { SupportedLocale } from '@/types/project'

const EmailSchema = z.object({
  email: z.string().email(),
})

const CodeSchema = z.object({
  code: z.string().regex(/^\d{4}$/),
})

export async function requestEmailChangeAction(
  input: unknown,
): Promise<ActionResult<{ pendingEmail: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthenticated' }

  const parsed = EmailSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'email_invalid' }

  const newEmail = parsed.data.email.toLowerCase()

  if (newEmail === session.user.email?.toLowerCase()) {
    return { success: false, error: 'same_email' }
  }

  const result = await requestEmailChange(session.user.id, newEmail)
  if (!result.success) return { success: false, error: result.error ?? 'unknown' }

  const rows = await db.select({ locale: project.defaultLocale }).from(project).limit(1)
  const locale = (rows[0]?.locale ?? 'en') as SupportedLocale

  await sendEmailOtp({ to: newEmail, code: result.code!, locale })

  return { success: true, data: { pendingEmail: newEmail } }
}

export async function confirmEmailChangeAction(
  input: unknown,
): Promise<ActionResult<{ newEmail: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthenticated' }

  const parsed = CodeSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'invalid_code' }

  const result = await confirmEmailChange(session.user.id, parsed.data.code)
  if (!result.success) return { success: false, error: result.error ?? 'invalid_code' }

  return { success: true, data: { newEmail: result.newEmail! } }
}

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(12),
})

export async function changePasswordAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthenticated' }

  const parsed = ChangePasswordSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'validation_error' }

  const user = await usersRepository.findById(session.user.id)
  if (!user) return { success: false, error: 'not_found' }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash)
  if (!valid) return { success: false, error: 'wrong_password' }

  const newHash = await hashPassword(parsed.data.newPassword)
  await usersRepository.updatePassword(session.user.id, newHash)

  return { success: true, data: null }
}
