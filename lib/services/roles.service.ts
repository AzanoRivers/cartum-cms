import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { rolePermissions, usersRoles } from '@/db/schema'
import { rolesRepository } from '@/db/repositories/roles.repository'
import { usersRepository } from '@/db/repositories/users.repository'
import type {
  NodePermissions,
  PermissionOperation,
  RoleWithPermissions,
  CreateRoleInput,
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
    .where(inArray(rolePermissions.roleId, roleIds))
    .then((rs) => rs.filter((r) => r.nodeId))

  // Deduplicate and resolve canRead per node (merging across roles)
  const uniqueNodeIds = Array.from(new Set(rows.map((r) => r.nodeId)))

  const result: string[] = []
  for (const nodeId of uniqueNodeIds) {
    const perms = await resolvePermissions(userId, nodeId)
    if (perms.canRead) result.push(nodeId)
  }

  return result
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

export const rolesService = {
  resolvePermissions,
  getAccessibleNodes,
  canPerform,
  createRole,
  deleteRole,
  setPermissions,
  assignToUser,
  removeFromUser,
  getAllWithPermissions,
}
