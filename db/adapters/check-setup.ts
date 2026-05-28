import { db } from '@/db'
import { users, project, roles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export type SetupState = 'complete' | 'no_superadmin' | 'no_project'

export async function checkSetupComplete(): Promise<SetupState> {
  try {
    const [adminRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isSuperAdmin, true))
      .limit(1)
    if (!adminRow) return 'no_superadmin'

    const [projectRow] = await db
      .select({ id: project.id })
      .from(project)
      .limit(1)
    if (!projectRow) return 'no_project'

    const [roleRow] = await db
      .select({ id: roles.id })
      .from(roles)
      .limit(1)
    return roleRow != null ? 'complete' : 'no_superadmin'
  } catch {
    return 'no_superadmin'
  }
}
