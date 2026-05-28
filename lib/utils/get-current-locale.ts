import { auth } from '@/auth'
import { db } from '@/db'
import { project } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { SupportedLocale } from '@/types/project'

/**
 * Returns the defaultLocale of the project currently active in the session.
 * Falls back to the first project if no currentProjectId is set, then to 'en'.
 */
export async function getCurrentLocale(): Promise<SupportedLocale> {
  const session = await auth()
  const projectId = session?.user?.currentProjectId ?? null

  const [proj] = await db
    .select({ defaultLocale: project.defaultLocale })
    .from(project)
    .where(projectId ? eq(project.id, projectId) : undefined)
    .limit(1)

  return (proj?.defaultLocale ?? 'en') as SupportedLocale
}
