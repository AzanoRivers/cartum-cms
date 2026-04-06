import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Returns true if a super admin exists — the canonical "setup complete" signal.
 */
export async function checkSetupComplete(): Promise<boolean> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isSuperAdmin, true))
    .limit(1)
  return rows.length > 0
}
