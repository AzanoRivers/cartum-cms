import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { projectMemberships, roles, users } from '@/db/schema'

async function isMember(userId: string, projectId: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(projectMemberships)
    .where(and(eq(projectMemberships.userId, userId), eq(projectMemberships.projectId, projectId)))
    .limit(1)
  return !!row
}

async function getUserProjects(userId: string) {
  return db
    .select({
      projectId: projectMemberships.projectId,
      roleId:    projectMemberships.roleId,
      joinedAt:  projectMemberships.joinedAt,
    })
    .from(projectMemberships)
    .where(eq(projectMemberships.userId, userId))
}

async function addMember(userId: string, projectId: string, roleId: string): Promise<void> {
  await db
    .insert(projectMemberships)
    .values({ userId, projectId, roleId })
    .onConflictDoUpdate({
      target: [projectMemberships.userId, projectMemberships.projectId],
      set:    { roleId },
    })
}

async function removeMember(userId: string, projectId: string): Promise<void> {
  await db
    .delete(projectMemberships)
    .where(and(eq(projectMemberships.userId, userId), eq(projectMemberships.projectId, projectId)))
}

async function listMembers(projectId: string) {
  return db
    .select({
      userId:       projectMemberships.userId,
      roleId:       projectMemberships.roleId,
      joinedAt:     projectMemberships.joinedAt,
      email:        users.email,
      roleName:     roles.name,
      isSuperAdmin: users.isSuperAdmin,
    })
    .from(projectMemberships)
    .innerJoin(users, eq(users.id, projectMemberships.userId))
    .innerJoin(roles, eq(roles.id, projectMemberships.roleId))
    .where(eq(projectMemberships.projectId, projectId))
}

async function findByEmail(projectId: string, email: string) {
  const [row] = await db
    .select({ userId: projectMemberships.userId, projectId: projectMemberships.projectId })
    .from(projectMemberships)
    .innerJoin(users, eq(users.id, projectMemberships.userId))
    .where(and(eq(projectMemberships.projectId, projectId), eq(users.email, email)))
    .limit(1)
  return row ?? null
}

async function isMemberWithRole(userId: string, projectId: string, roleName: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: projectMemberships.userId })
    .from(projectMemberships)
    .innerJoin(roles, eq(roles.id, projectMemberships.roleId))
    .where(and(
      eq(projectMemberships.userId, userId),
      eq(projectMemberships.projectId, projectId),
      eq(roles.name, roleName),
    ))
    .limit(1)
  return !!row
}

async function getMembersByRole(projectId: string, roleName: string) {
  return db
    .select({ userId: projectMemberships.userId })
    .from(projectMemberships)
    .innerJoin(roles, eq(roles.id, projectMemberships.roleId))
    .where(and(eq(projectMemberships.projectId, projectId), eq(roles.name, roleName)))
}

async function listAdminProjectIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ projectId: projectMemberships.projectId })
    .from(projectMemberships)
    .innerJoin(roles, eq(roles.id, projectMemberships.roleId))
    .where(and(eq(projectMemberships.userId, userId), eq(roles.name, 'admin')))
  return rows.map((r) => r.projectId)
}

async function getUserProjectRole(
  userId:    string,
  projectId: string,
): Promise<{ roleId: string; roleName: string } | null> {
  const [row] = await db
    .select({ roleId: projectMemberships.roleId, roleName: roles.name })
    .from(projectMemberships)
    .innerJoin(roles, eq(roles.id, projectMemberships.roleId))
    .where(and(eq(projectMemberships.userId, userId), eq(projectMemberships.projectId, projectId)))
    .limit(1)
  return row ?? null
}

export const projectMembershipsRepository = {
  isMember,
  getUserProjects,
  getUserProjectRole,
  addMember,
  removeMember,
  listMembers,
  findByEmail,
  isMemberWithRole,
  getMembersByRole,
  listAdminProjectIds,
}
