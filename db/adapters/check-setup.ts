import { db } from '@/db'
import { users, project } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Returns true if both a super admin AND a project row exist.
 * After the credentials step, a super admin exists but no project yet —
 * so setup is NOT considered complete until the project step also runs.
 */
export async function checkSetupComplete(): Promise<boolean> {
  const [adminRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isSuperAdmin, true))
    .limit(1)
  if (!adminRow) return false

  const [projectRow] = await db
    .select({ id: project.id })
    .from(project)
    .limit(1)
  return projectRow != null
}
