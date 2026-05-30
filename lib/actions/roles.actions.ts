'use server'

import { auth } from '@/auth'
import { rolesService } from '@/lib/services/roles.service'
import { rolesRepository } from '@/db/repositories/roles.repository'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { getSetting, setSetting } from '@/lib/settings/get-setting'
import { requireProjectId } from '@/lib/auth/get-project-id'
import type { ActionResult } from '@/types/actions'
import type {
  Role,
  NodePermissions,
  RoleWithPermissions,
  CreateRoleInput,
  SectionPermission,
  SectionKey,
} from '@/types/roles'
import { ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER, ROLE_RESTRICTED, BUILT_IN_ROLE_NAMES } from '@/types/roles'

async function requireAdminAccess() {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const projectId = await requireProjectId().catch(() => null)

  const isOk = session.user.isSuperAdmin
    || (session.user.roles ?? []).includes(ROLE_ADMIN)
    || (projectId
      ? await projectMembershipsRepository.isMemberWithRole(session.user.id, projectId, 'admin')
      : false)

  if (!isOk) throw new Error('FORBIDDEN')
  return { session, projectId, isSuperAdmin: session.user.isSuperAdmin }
}

export async function createRole(
  input: CreateRoleInput,
): Promise<ActionResult<Role>> {
  try {
    const { } = await requireAdminAccess()
    const role = await rolesService.createRole(input)
    return {
      success: true,
      data: {
        id:          role.id,
        name:        role.name,
        description: role.description ?? null,
        createdAt:   role.createdAt,
      },
    }
  } catch {
    return { success: false, error: 'A role with that name may already exist.' }
  }
}

export async function deleteRole(
  roleId: string,
): Promise<ActionResult<void>> {
  try {
    await requireAdminAccess()
    const result = await rolesService.deleteRole(roleId)
    if (!result.success) return { success: false, error: result.error! }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function setNodePermissions(
  roleId: string,
  nodeId: string,
  perms: NodePermissions,
): Promise<ActionResult<void>> {
  try {
    const { session, isSuperAdmin } = await requireAdminAccess()
    if (!isSuperAdmin) {
      const role = await rolesRepository.findById(roleId)
      if (role?.name === ROLE_ADMIN) return { success: false, error: 'FORBIDDEN' }
    }
    await rolesService.setPermissions(roleId, nodeId, perms)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getSectionPermissionsAction(
  roleId: string,
): Promise<ActionResult<SectionPermission[]>> {
  try {
    const { projectId } = await requireAdminAccess()

    // Check project-specific override first
    if (projectId) {
      const raw = await getSetting(`role_sections:${roleId}:${projectId}`)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<Record<SectionKey, boolean>>
          const data: SectionPermission[] = Object.entries(parsed).map(([section, canAccess]) => ({
            section:   section as SectionKey,
            canAccess: canAccess ?? false,
          }))
          return { success: true, data }
        } catch { /* ignore malformed, fall through */ }
      }
    }

    // Fall back to global table
    const data = await rolesService.getSectionPermissions(roleId)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateSectionPermissionsAction(
  roleId:      string,
  permissions: SectionPermission[],
): Promise<ActionResult<void>> {
  try {
    const { session, projectId, isSuperAdmin } = await requireAdminAccess()

    if (!isSuperAdmin) {
      const role = await rolesRepository.findById(roleId)
      if (role?.name === ROLE_ADMIN) return { success: false, error: 'FORBIDDEN' }
    }

    if (projectId) {
      // Save project-scoped override in app_settings
      const permsMap = Object.fromEntries(permissions.map((p) => [p.section, p.canAccess]))
      await setSetting(`role_sections:${roleId}:${projectId}`, JSON.stringify(permsMap), session.user.id)
    } else {
      // Global save (no project context)
      await rolesService.setSectionPermissions(roleId, permissions)
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function assignRoleToUser(
  userId: string,
  roleId: string,
): Promise<ActionResult<void>> {
  try {
    const { isSuperAdmin } = await requireAdminAccess()
    if (!isSuperAdmin) return { success: false, error: 'FORBIDDEN' }
    await rolesService.assignToUser(userId, roleId)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function removeRoleFromUser(
  userId: string,
  roleId: string,
): Promise<ActionResult<void>> {
  try {
    const { isSuperAdmin } = await requireAdminAccess()
    if (!isSuperAdmin) return { success: false, error: 'FORBIDDEN' }
    await rolesService.removeFromUser(userId, roleId)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getRolesWithPermissions(): Promise<ActionResult<RoleWithPermissions[]>> {
  try {
    await requireAdminAccess()
    const data = await rolesService.getAllWithPermissions()
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
