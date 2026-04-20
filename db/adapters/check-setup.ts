import { db } from '@/db'
import { users, project, roles } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Returns true only when super admin, project, AND default roles all exist.
 * Roles are seeded in /setup/initializing — this prevents the middleware from
 * redirecting away from that page before initializeSchema() has a chance to run.
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
  if (!projectRow) return false

  const [roleRow] = await db
    .select({ id: roles.id })
    .from(roles)
    .limit(1)
  return roleRow != null
}
