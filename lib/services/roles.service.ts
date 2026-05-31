import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { nodes, rolePermissions, roleSectionPermissions, usersRoles } from '@/db/schema'
import { getSetting } from '@/lib/settings/get-setting'
import { rolesRepository } from '@/db/repositories/roles.repository'
import { usersRepository } from '@/db/repositories/users.repository'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { ROLE_EDITOR, ROLE_VIEWER } from '@/types/roles'
import type {
  NodePermissions,
  PermissionOperation,
  RoleWithPermissions,
  CreateRoleInput,
  SectionKey,
  SectionPermission,
} from '@/types/roles'

// Full read+write permissions for built-in editor role
const EDITOR_PERMISSIONS: NodePermissions = { canRead: true, canCreate: true, canUpdate: true, canDelete: true }
// Read-only permissions for built-in viewer role
const VIEWER_PERMISSIONS: NodePermissions = { canRead: true, canCreate: false, canUpdate: false, canDelete: false }

const NULL_PERMISSIONS: NodePermissions = {
  canRead:   false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
}

/**
 * Collects all role IDs for a user: global (usersRoles) + project membership.
 * Project membership role takes precedence; both sources are unioned.
 */
async function collectRoleIds(userId: string, projectId?: string | null): Promise<string[]> {
  const [globalRoles, projectRole] = await Promise.all([
    rolesRepository.findByUserId(userId),
    projectId ? projectMembershipsRepository.getUserProjectRole(userId, projectId) : Promise.resolve(null),
  ])
  const ids = new Set([
    ...globalRoles.map((r) => r.id),
    ...(projectRole ? [projectRole.roleId] : []),
  ])
  return [...ids]
}

/**
 * Resolves the effective permissions a user has for a given node.
 * Built-in editor/viewer roles in the project get implicit access without needing
 * explicit role_permissions entries.
 */
async function resolvePermissions(
  userId:    string,
  nodeId:    string,
  projectId?: string | null,
): Promise<NodePermissions> {
  // Built-in role shortcut: editor/viewer get implicit project-wide access
  if (projectId) {
    const projectRole = await projectMembershipsRepository.getUserProjectRole(userId, projectId)
    if (projectRole?.roleName === ROLE_EDITOR) return { ...EDITOR_PERMISSIONS }
    if (projectRole?.roleName === ROLE_VIEWER) return { ...VIEWER_PERMISSIONS }
  }

  const roleIds = await collectRoleIds(userId, projectId)
  if (roleIds.length === 0) return { ...NULL_PERMISSIONS }

  const perms = await db
    .select()
    .from(rolePermissions)
    .where(eq(rolePermissions.nodeId, nodeId))
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
 * Returns all node IDs where the user has can_read = true.
 * Built-in editor/viewer roles get implicit access to ALL project nodes.
 * Custom roles or explicit overrides are resolved per-node.
 */
async function getAccessibleNodes(userId: string, projectId?: string | null): Promise<string[]> {
  // Built-in role shortcut: editor and viewer see every container node in their project
  if (projectId) {
    const projectRole = await projectMembershipsRepository.getUserProjectRole(userId, projectId)
    if (projectRole?.roleName === ROLE_EDITOR || projectRole?.roleName === ROLE_VIEWER) {
      const allNodes = await db
        .select({ id: nodes.id })
        .from(nodes)
        .where(and(eq(nodes.projectId, projectId), eq(nodes.type, 'container')))
      return allNodes.map((n) => n.id)
    }
  }

  const roleIds = await collectRoleIds(userId, projectId)
  if (roleIds.length === 0) return []

  const nodeIds = new Set<string>()
  const globalFallbackRoleIds: string[] = []

  if (projectId) {
    for (const roleId of roleIds) {
      const raw = await getSetting(`role_perms:${roleId}:${projectId}`)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, { read?: boolean }>
          for (const [nodeId, p] of Object.entries(parsed)) {
            if (p.read) nodeIds.add(nodeId)
          }
        } catch { /* ignore malformed — treat as no override */ }
      } else {
        // No project override for this role: use global table
        globalFallbackRoleIds.push(roleId)
      }
    }
  } else {
    globalFallbackRoleIds.push(...roleIds)
  }

  // Bulk-query global permissions for roles without project-specific overrides
  if (globalFallbackRoleIds.length > 0) {
    const rows = await db
      .select({ nodeId: rolePermissions.nodeId })
      .from(rolePermissions)
      .where(
        and(
          inArray(rolePermissions.roleId, globalFallbackRoleIds),
          eq(rolePermissions.canRead, true),
        ),
      )
    for (const row of rows) {
      if (row.nodeId) nodeIds.add(row.nodeId)
    }
  }

  return [...nodeIds]
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
 * Project-specific overrides (stored in app_settings) take precedence over global table.
 * SuperAdmin callers bypass this — handle at the callsite.
 */
async function getSectionPermissionsForUser(
  userId:    string,
  projectId?: string | null,
): Promise<Partial<Record<SectionKey, boolean>>> {
  const roleIds = await collectRoleIds(userId, projectId)
  if (roleIds.length === 0) return {}

  const result: Partial<Record<SectionKey, boolean>> = {}
  const globalFallbackRoleIds: string[] = []

  if (projectId) {
    for (const roleId of roleIds) {
      const raw = await getSetting(`role_sections:${roleId}:${projectId}`)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<Record<SectionKey, boolean>>
          for (const [k, v] of Object.entries(parsed)) {
            const key = k as SectionKey
            result[key] = result[key] || (v ?? false)
          }
        } catch { /* ignore malformed — treat as no override */ }
      } else {
        globalFallbackRoleIds.push(roleId)
      }
    }
  } else {
    globalFallbackRoleIds.push(...roleIds)
  }

  // Bulk-query global section permissions for roles without project-specific overrides
  if (globalFallbackRoleIds.length > 0) {
    const rows = await db
      .select({
        section:   roleSectionPermissions.section,
        canAccess: roleSectionPermissions.canAccess,
      })
      .from(roleSectionPermissions)
      .where(inArray(roleSectionPermissions.roleId, globalFallbackRoleIds))
    for (const row of rows) {
      const key = row.section as SectionKey
      result[key] = result[key] || row.canAccess
    }
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
