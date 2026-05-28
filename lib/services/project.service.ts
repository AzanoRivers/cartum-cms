import { asc, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { project } from '@/db/schema'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { rolesRepository } from '@/db/repositories/roles.repository'

export async function createProjectService({
  name,
  description,
  locale,
  creatorId,
}: {
  name:        string
  description: string
  locale:      string
  creatorId:   string
}): Promise<{ projectId: string }> {
  const [proj] = await db
    .insert(project)
    .values({ name, description, defaultLocale: locale, ownerId: creatorId })
    .returning()

  const adminRole = await rolesRepository.findByName('admin')
  if (!adminRole) throw new Error('ROLES_NOT_INITIALIZED')

  await projectMembershipsRepository.addMember(creatorId, proj.id, adminRole.id)

  return { projectId: proj.id }
}

export async function getUserProjectsService(userId: string) {
  const memberships = await projectMembershipsRepository.getUserProjects(userId)
  if (!memberships.length) return []
  const ids  = memberships.map((m) => m.projectId)
  const rows = await db.select().from(project).where(inArray(project.id, ids))
  return rows
}

export async function getAllProjectsService() {
  return db.select().from(project).orderBy(asc(project.createdAt))
}
