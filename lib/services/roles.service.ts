import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { nodes, rolePermissions, roleSectionPermissions, usersRoles } from '@/db/schema'
import { getSetting } from '@/lib/settings/get-setting'
import { rolesRepository } from '@/db/repositories/roles.repository'
import { usersRepository } from '@/db/repositories/users.repository'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER, ROLE_RESTRICTED } from '@/types/roles'
import type {
  NodePermissions,
  PermissionOperation,
  RoleWithPermissions,
  CreateRoleInput,
  SectionKey,
  SectionPermission,
  SectionAccess,
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

type PermsOverrideEntry = { read: boolean; create: boolean; update: boolean; delete: boolean }

/**
 * Resolves the effective permissions a user has for a given node.
 *
 * Priority order:
 * 1. Project-specific node override in app_settings (`role_perms:{roleId}:{projectId}`)
 *    → if the node has an explicit entry, use it exactly.
 * 2. Built-in role defaults (no hardcoded names as gates — only as fallback defaults):
 *    admin/editor → full access, viewer → read-only, restricted → none.
 * 3. Custom roles → global `rolePermissions` DB table.
 */
async function resolvePermissions(
  userId:     string,
  nodeId:     string,
  projectId?: string | null,
): Promise<NodePermissions> {
  if (projectId) {
    const projectRole = await projectMembershipsRepository.getUserProjectRole(userId, projectId)
    if (projectRole) {
      // 1. Check project-specific node override
      const raw = await getSetting(`role_perms:${projectRole.roleId}:${projectId}`)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, PermsOverrideEntry>
          const entry = parsed[nodeId]
          if (entry !== undefined) {
            return {
              canRead:   entry.read   ?? false,
              canCreate: entry.create ?? false,
              canUpdate: entry.update ?? false,
              canDelete: entry.delete ?? false,
            }
          }
          // Node not in override map — fall through to role defaults below
        } catch { /* ignore malformed */ }
      }

      // 2. Built-in role defaults (used when no project override exists, or node not in override)
      if (projectRole.roleName === ROLE_ADMIN || projectRole.roleName === ROLE_EDITOR) {
        return { ...EDITOR_PERMISSIONS }
      }
      if (projectRole.roleName === ROLE_VIEWER) return { ...VIEWER_PERMISSIONS }
      if (projectRole.roleName === ROLE_RESTRICTED) return { ...NULL_PERMISSIONS }

      // Custom role with no project override → fall through to global DB table
    }
  }

  // 3. Global DB table fallback (custom roles without project override, or no projectId)
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
  if (projectId) {
    const projectRole = await projectMembershipsRepository.getUserProjectRole(userId, projectId)

    if (projectRole?.roleName === ROLE_RESTRICTED) return []

    // If there's a project-specific override, use it (respects per-node config for ALL roles)
    const raw = await getSetting(`role_perms:${projectRole?.roleId}:${projectId}`)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, { read?: boolean }>
        return Object.entries(parsed).filter(([, p]) => p.read).map(([id]) => id)
      } catch { /* ignore malformed — fall through to defaults */ }
    }

    // No project override → built-in defaults: admin/editor/viewer see all nodes
    if (
      projectRole?.roleName === ROLE_ADMIN ||
      projectRole?.roleName === ROLE_EDITOR ||
      projectRole?.roleName === ROLE_VIEWER
    ) {
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

  return rows.map((r) => ({
    section:    r.section as SectionKey,
    canAccess:  r.canAccess,
    canActions: r.canActions,
  }))
}

async function setSectionPermissions(
  roleId: string,
  permissions: SectionPermission[],
): Promise<void> {
  if (permissions.length === 0) return
  await db
    .insert(roleSectionPermissions)
    .values(permissions.map(({ section, canAccess, canActions }) => ({ roleId, section, canAccess, canActions })))
    .onConflictDoUpdate({
      target: [roleSectionPermissions.roleId, roleSectionPermissions.section],
      set: {
        canAccess:  sql`excluded.can_access`,
        canActions: sql`excluded.can_actions`,
      },
    })
}

type SectionOverrideEntry = { view: boolean; actions: boolean } | boolean

/**
 * Parses a raw section override entry — handles both legacy boolean format
 * and the new { view, actions } object format.
 *
 * Old boolean format predates canActions — canActions is derived from role defaults:
 * viewer/restricted → false, everyone else → same as canView.
 */
function parseSectionEntry(raw: SectionOverrideEntry, roleName?: string): SectionAccess {
  if (typeof raw === 'boolean') {
    const readOnlyRole = roleName === ROLE_VIEWER || roleName === ROLE_RESTRICTED
    return { canView: raw, canActions: raw && !readOnlyRole }
  }
  return { canView: raw.view ?? false, canActions: raw.actions ?? false }
}

/**
 * Returns a map of section → SectionAccess for a given user.
 * Project-specific overrides (stored in app_settings) take precedence over global table.
 * SuperAdmin callers bypass this — handle at the callsite.
 */
async function getSectionPermissionsForUser(
  userId:    string,
  projectId?: string | null,
): Promise<Partial<Record<SectionKey, SectionAccess>>> {
  const roleIds = await collectRoleIds(userId, projectId)
  if (roleIds.length === 0) return {}

  const result: Partial<Record<SectionKey, SectionAccess>> = {}
  const globalFallbackRoleIds: string[] = []

  if (projectId) {
    const projectRole = await projectMembershipsRepository.getUserProjectRole(userId, projectId)
    const projectRoleName = projectRole?.roleName

    for (const roleId of roleIds) {
      const raw = await getSetting(`role_sections:${roleId}:${projectId}`)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<Record<SectionKey, SectionOverrideEntry>>
          for (const [k, v] of Object.entries(parsed)) {
            const key = k as SectionKey
            const access = parseSectionEntry(v as SectionOverrideEntry, projectRoleName)
            const existing = result[key]
            result[key] = {
              canView:    (existing?.canView    ?? false) || access.canView,
              canActions: (existing?.canActions ?? false) || access.canActions,
            }
          }
        } catch { /* ignore malformed */ }
      } else {
        globalFallbackRoleIds.push(roleId)
      }
    }
  } else {
    globalFallbackRoleIds.push(...roleIds)
  }

  if (globalFallbackRoleIds.length > 0) {
    const rows = await db
      .select({
        section:    roleSectionPermissions.section,
        canAccess:  roleSectionPermissions.canAccess,
        canActions: roleSectionPermissions.canActions,
      })
      .from(roleSectionPermissions)
      .where(inArray(roleSectionPermissions.roleId, globalFallbackRoleIds))
    for (const row of rows) {
      const key = row.section as SectionKey
      const existing = result[key]
      result[key] = {
        canView:    (existing?.canView    ?? false) || row.canAccess,
        canActions: (existing?.canActions ?? false) || row.canActions,
      }
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
