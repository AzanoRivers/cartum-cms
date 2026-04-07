import bcrypt from 'bcryptjs'
import { randomBytes, randomInt, createHash } from 'crypto'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { passwordResetTokens, users, emailOtpCodes } from '@/db/schema'
import { usersRepository } from '@/db/repositories/users.repository'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function requestPasswordReset(email: string): Promise<string | null> {
  const user = await usersRepository.findByEmail(email)
  // Always resolve — never reveal whether the email exists
  if (!user) return null

  // Invalidate previous tokens
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, user.id))

  const raw = generateResetToken()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.insert(passwordResetTokens).values({
    userId:    user.id,
    tokenHash: hashToken(raw),
    expiresAt,
  })

  return raw
}

export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const tokenHash = hashToken(rawToken)
  const now = new Date()

  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, now),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1)

  if (rows.length === 0) {
    return { success: false, error: 'Token is invalid or has expired.' }
  }

  const record = rows[0]
  const passwordHash = await hashPassword(newPassword)

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, record.userId))

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, record.id))
  })

  return { success: true }
}

// ─── Email change with OTP ───────────────────────────────────────────────────

export async function requestEmailChange(
  userId: string,
  newEmail: string,
): Promise<{ success: boolean; error?: string; code?: string }> {
  const existing = await usersRepository.findByEmail(newEmail)
  if (existing) return { success: false, error: 'email_taken' }

  // Invalidate any previous OTP for this user
  await db.delete(emailOtpCodes).where(eq(emailOtpCodes.userId, userId))

  const code = String(randomInt(1000, 9999))
  const codeHash = hashToken(code)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await db.insert(emailOtpCodes).values({ userId, codeHash, pendingEmail: newEmail, expiresAt })

  return { success: true, code }
}

export async function confirmEmailChange(
  userId: string,
  code: string,
): Promise<{ success: boolean; error?: string; newEmail?: string }> {
  const codeHash = hashToken(code)
  const now = new Date()

  const rows = await db
    .select()
    .from(emailOtpCodes)
    .where(and(
      eq(emailOtpCodes.userId, userId),
      eq(emailOtpCodes.codeHash, codeHash),
      gt(emailOtpCodes.expiresAt, now),
      isNull(emailOtpCodes.usedAt),
    ))
    .limit(1)

  if (rows.length === 0) return { success: false, error: 'invalid_code' }

  const record = rows[0]

  await db.transaction(async (tx) => {
    await tx.update(users).set({ email: record.pendingEmail }).where(eq(users.id, userId))
    await tx.update(emailOtpCodes).set({ usedAt: now }).where(eq(emailOtpCodes.id, record.id))
  })

  return { success: true, newEmail: record.pendingEmail }
}
