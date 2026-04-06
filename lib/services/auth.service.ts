import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'crypto'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { passwordResetTokens, users } from '@/db/schema'
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

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await usersRepository.findByEmail(email)
  // Always resolve — never reveal whether the email exists
  if (!user) return

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

  // Email delivery is handled by the caller (Server Action) so it can
  // check RESEND_API_KEY and show the appropriate warning.
  // We return void; the raw token would be passed to the mailer there.
  // For now, token generation only.
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
