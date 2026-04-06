import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { roles, rolePermissions, usersRoles } from '@/db/schema'

type RoleRow = typeof roles.$inferSelect
type PermissionRow = typeof rolePermissions.$inferSelect

type NewRole = { name: string; description?: string }
type UpdateRole = { name?: string; description?: string }
type SetPermissionsInput = {
  roleId: string
  nodeId: string
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

async function findAll(): Promise<RoleRow[]> {
  return db.select().from(roles)
}

async function findById(id: string): Promise<RoleRow | null> {
  const rows = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
  return rows[0] ?? null
}

async function findByUserId(userId: string): Promise<RoleRow[]> {
  return db
    .select({ id: roles.id, name: roles.name, description: roles.description, createdAt: roles.createdAt })
    .from(roles)
    .innerJoin(usersRoles, eq(usersRoles.roleId, roles.id))
    .where(eq(usersRoles.userId, userId))
}

async function create(input: NewRole): Promise<RoleRow> {
  const [row] = await db.insert(roles).values(input).returning()
  return row
}

async function update(id: string, input: UpdateRole): Promise<RoleRow | null> {
  const [row] = await db.update(roles).set(input).where(eq(roles.id, id)).returning()
  return row ?? null
}

async function deleteRole(id: string): Promise<void> {
  await db.delete(roles).where(eq(roles.id, id))
}

async function setPermissions(input: SetPermissionsInput): Promise<PermissionRow> {
  const [row] = await db
    .insert(rolePermissions)
    .values(input)
    .onConflictDoUpdate({
      target: [rolePermissions.roleId, rolePermissions.nodeId],
      set: {
        canRead:   input.canRead,
        canCreate: input.canCreate,
        canUpdate: input.canUpdate,
        canDelete: input.canDelete,
      },
    })
    .returning()
  return row
}

async function getPermissionsForNode(nodeId: string): Promise<PermissionRow[]> {
  return db.select().from(rolePermissions).where(eq(rolePermissions.nodeId, nodeId))
}

export const rolesRepository = {
  findAll,
  findById,
  findByUserId,
  create,
  update,
  delete: deleteRole,
  setPermissions,
  getPermissionsForNode,
}
