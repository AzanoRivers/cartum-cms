import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { rolePermissions, roleSectionPermissions, usersRoles } from '@/db/schema'
import { getSetting } from '@/lib/settings/get-setting'
import { rolesRepository } from '@/db/repositories/roles.repository'
import { usersRepository } from '@/db/repositories/users.repository'
import type {
  NodePermissions,
  PermissionOperation,
  RoleWithPermissions,
  CreateRoleInput,
  SectionKey,
  SectionPermission,
} from '@/types/roles'

const NULL_PERMISSIONS: NodePermissions = {
  canRead:   false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}

/**
 * Resolves the effective permissions a user has for a given node.
 * Merges all role permissions — a single role granting an operation is enough.
 * Returns all-false if no permissions found.
 */
async function resolvePermissions(
  userId: string,
  nodeId: string,
): Promise<NodePermissions> {
  const userRoles = await rolesRepository.findByUserId(userId)
  if (userRoles.length === 0) return { ...NULL_PERMISSIONS }

  const roleIds = userRoles.map((r) => r.id)

  const perms = await db
    .select()
    .from(rolePermissions)
    .where(
      eq(rolePermissions.nodeId, nodeId),
    )
    .then((rows) => rows.filter((r) => roleIds.includes(r.roleId)))

  if (perms.length === 0) return { ...NULL_PERMISSIONS }

  return {
    canRead:   perms.some((p) => p.canRead),
    canCreate: perms.some((p) => p.canCreate),
    canUpdate: perms.some((p) => p.canUpdate),
    canDelete: perms.some((p) => p.canDelete),
  }
}

/**
 * Returns all node IDs where the user has can_read = true across any of their roles.
 */
async function getAccessibleNodes(userId: string): Promise<string[]> {
  const userRoles = await rolesRepository.findByUserId(userId)
  if (userRoles.length === 0) return []

  const roleIds = userRoles.map((r) => r.id)

  const rows = await db
    .select({ nodeId: rolePermissions.nodeId })
    .from(rolePermissions)
    .where(
      and(
        inArray(rolePermissions.roleId, roleIds),
        eq(rolePermissions.canRead, true),
      ),
    )

  return Array.from(new Set(rows.map((r) => r.nodeId).filter(Boolean) as string[]))
}

/**
 * Checks a single operation for a user on a node.
 */
async function canPerform(
  userId: string,
  nodeId: string,
  operation: PermissionOperation,
): Promise<boolean> {
  const perms = await resolvePermissions(userId, nodeId)
  const map: Record<PermissionOperation, boolean> = {
    read:   perms.canRead,
    create: perms.canCreate,
    update: perms.canUpdate,
    delete: perms.canDelete,
  }
  return map[operation]
}

/**
 * Checks a single operation using a role ID directly (for API token auth).
 */
async function canPerformByRole(
  roleId:    string,
  nodeId:    string,
  operation: PermissionOperation,
): Promise<boolean> {
  // Check wildcard permissions stored in app_settings
  const wildcardRaw = await getSetting(`role_${roleId}_wildcard`)
  if (wildcardRaw) {
    try {
      const wc = JSON.parse(wildcardRaw) as Record<string, boolean>
      if (wc[operation]) return true
    } catch { /* ignore malformed */ }
  }

  const perms = await db
    .select()
    .from(rolePermissions)
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.nodeId, nodeId)))
    .limit(1)

  if (perms.length === 0) return false

  const p   = perms[0]
  const map: Record<PermissionOperation, boolean> = {
    read:   p.canRead,
    create: p.canCreate,
    update: p.canUpdate,
    delete: p.canDelete,
  }
  return map[operation]
}

async function createRole(input: CreateRoleInput) {
  return rolesRepository.create(input)
}

async function deleteRole(roleId: string): Promise<{ success: boolean; error?: string }> {
  // Check if any users are assigned
  const assigned = await db
    .select({ userId: usersRoles.userId })
    .from(usersRoles)
    .where(eq(usersRoles.roleId, roleId))
    .limit(1)

  if (assigned.length > 0) {
    return { success: false, error: 'Cannot delete a role that has users assigned.' }
  }

  await rolesRepository.delete(roleId)
  return { success: true }
}

async function setPermissions(
  roleId: string,
  nodeId: string,
  perms: NodePermissions,
): Promise<void> {
  await rolesRepository.setPermissions({ roleId, nodeId, ...perms })
}

async function assignToUser(userId: string, roleId: string): Promise<void> {
  await usersRepository.assignRole(userId, roleId)
}

async function removeFromUser(userId: string, roleId: string): Promise<void> {
  await usersRepository.removeRole(userId, roleId)
}

async function getAllWithPermissions(): Promise<RoleWithPermissions[]> {
  const allRoles = await rolesRepository.findAll()

  return Promise.all(
    allRoles.map(async (role) => {
      const perms = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, role.id))

      return {
        ...role,
        permissions: perms.map((p) => ({
          roleId:    p.roleId,
          nodeId:    p.nodeId,
          canRead:   p.canRead,
          canCreate: p.canCreate,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete,
        })),
      }
    }),
  )
}

async function getSectionPermissions(roleId: string): Promise<SectionPermission[]> {
  const rows = await db
    .select()
    .from(roleSectionPermissions)
    .where(eq(roleSectionPermissions.roleId, roleId))

  return rows.map((r) => ({ section: r.section as SectionKey, canAccess: r.canAccess }))
}

async function setSectionPermissions(
  roleId: string,
  permissions: SectionPermission[],
): Promise<void> {
  if (permissions.length === 0) return
  await db
    .insert(roleSectionPermissions)
    .values(permissions.map(({ section, canAccess }) => ({ roleId, section, canAccess })))
    .onConflictDoUpdate({
      target: [roleSectionPermissions.roleId, roleSectionPermissions.section],
      set:    { canAccess: sql`excluded.can_access` },
    })
}

/**
 * Returns a map of section → canAccess for a given user.
 * SuperAdmin callers bypass this — handle at the callsite.
 */
async function getSectionPermissionsForUser(
  userId: string,
): Promise<Partial<Record<SectionKey, boolean>>> {
  const rows = await db
    .select({
      section:   roleSectionPermissions.section,
      canAccess: roleSectionPermissions.canAccess,
    })
    .from(roleSectionPermissions)
    .innerJoin(usersRoles, eq(usersRoles.roleId, roleSectionPermissions.roleId))
    .where(eq(usersRoles.userId, userId))

  const result: Partial<Record<SectionKey, boolean>> = {}
  for (const row of rows) {
    const key = row.section as SectionKey
    result[key] = result[key] || row.canAccess
  }
  return result
}

export const rolesService = {
  resolvePermissions,
  getAccessibleNodes,
  canPerform,
  canPerformByRole,
  createRole,
  deleteRole,
  setPermissions,
  assignToUser,
  removeFromUser,
  getAllWithPermissions,
  getSectionPermissions,
  setSectionPermissions,
  getSectionPermissionsForUser,
}
