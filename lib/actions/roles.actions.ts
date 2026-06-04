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
import {
  ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER, ROLE_RESTRICTED, BUILT_IN_ROLE_NAMES,
  DEFAULT_GALLERY_PERMS_EDITOR, DEFAULT_GALLERY_PERMS_VIEWER,
  DEFAULT_SCHEMA_PERMS_WRITE, DEFAULT_SCHEMA_PERMS_READONLY,
} from '@/types/roles'
import type { GalleryPermissions, SchemaPermissions } from '@/types/roles'

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
    const { session, projectId } = await requireAdminAccess()
    const role = await rolesService.createRole(input)
    // Register the new role as belonging to this project
    if (projectId) {
      await registerRoleForProject(role.id, projectId, session.user.id)
    }
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

    if (projectId) {
      const raw = await getSetting(`role_sections:${roleId}:${projectId}`)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<Record<SectionKey, { view: boolean; actions: boolean } | boolean>>
          const data: SectionPermission[] = Object.entries(parsed).map(([section, v]) => {
            if (typeof v === 'boolean') return { section: section as SectionKey, canAccess: v, canActions: v }
            return { section: section as SectionKey, canAccess: v?.view ?? false, canActions: v?.actions ?? false }
          })
          return { success: true, data }
        } catch { /* fall through */ }
      }
    }

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
      const permsMap = Object.fromEntries(
        permissions.map((p) => [p.section, { view: p.canAccess, actions: p.canActions }])
      )
      await setSetting(`role_sections:${roleId}:${projectId}`, JSON.stringify(permsMap), session.user.id)
    } else {
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

// ── Gallery permissions per role per project ──────────────────────────────────

function defaultGalleryPermsForRole(roleName: string): GalleryPermissions {
  if (roleName === ROLE_VIEWER) return { ...DEFAULT_GALLERY_PERMS_VIEWER }
  return { ...DEFAULT_GALLERY_PERMS_EDITOR }  // admin, editor, custom → full access
}

export async function getGalleryPermissionsAction(
  roleId: string,
): Promise<ActionResult<GalleryPermissions>> {
  try {
    const { projectId } = await requireAdminAccess()
    if (projectId) {
      const raw = await getSetting(`role_gallery:${roleId}:${projectId}`)
      if (raw) return { success: true, data: JSON.parse(raw) as GalleryPermissions }
    }
    // Fall back to defaults based on role name
    const role = await rolesRepository.findById(roleId)
    return { success: true, data: defaultGalleryPermsForRole(role?.name ?? '') }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateGalleryPermissionsAction(
  roleId:      string,
  permissions: GalleryPermissions,
): Promise<ActionResult<void>> {
  try {
    const { session, projectId, isSuperAdmin } = await requireAdminAccess()
    if (!isSuperAdmin) {
      const role = await rolesRepository.findById(roleId)
      if (role?.name === ROLE_ADMIN) return { success: false, error: 'FORBIDDEN' }
    }
    if (projectId) {
      await setSetting(`role_gallery:${roleId}:${projectId}`, JSON.stringify(permissions), session.user.id)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/** Resolve effective gallery permissions for a user in a project (used in content page). */
export async function resolveGalleryPermissions(
  userId:    string,
  projectId: string,
): Promise<GalleryPermissions> {
  // SuperAdmin → full access always
  const { auth } = await import('@/auth')
  const session = await auth()
  if (session?.user?.isSuperAdmin) return { ...DEFAULT_GALLERY_PERMS_EDITOR }

  const projectRole = await (await import('@/db/repositories/project-memberships.repository'))
    .projectMembershipsRepository.getUserProjectRole(userId, projectId)

  if (!projectRole) return { ...DEFAULT_GALLERY_PERMS_VIEWER }  // unknown → minimal

  // Check project-specific override
  const raw = await getSetting(`role_gallery:${projectRole.roleId}:${projectId}`)
  if (raw) return JSON.parse(raw) as GalleryPermissions

  // Fall back to built-in defaults
  return defaultGalleryPermsForRole(projectRole.roleName)
}

// ── Schema / Board permissions per role per project ──────────────────────────

/**
 * Default schema permissions based on role name.
 * Used ONLY as fallback when no app_settings override exists.
 * Admins/editors/custom roles default to full write; viewer/restricted default to read-only.
 */
function defaultSchemaPermsForRole(roleName: string): SchemaPermissions {
  if (roleName === ROLE_VIEWER || roleName === ROLE_RESTRICTED)
    return { ...DEFAULT_SCHEMA_PERMS_READONLY }
  return { ...DEFAULT_SCHEMA_PERMS_WRITE }
}

export async function getSchemaPermissionsAction(
  roleId: string,
): Promise<ActionResult<SchemaPermissions>> {
  try {
    const { projectId } = await requireAdminAccess()
    if (projectId) {
      const raw = await getSetting(`role_schema:${roleId}:${projectId}`)
      if (raw) return { success: true, data: JSON.parse(raw) as SchemaPermissions }
    }
    const role = await rolesRepository.findById(roleId)
    return { success: true, data: defaultSchemaPermsForRole(role?.name ?? '') }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateSchemaPermissionsAction(
  roleId:      string,
  permissions: SchemaPermissions,
): Promise<ActionResult<void>> {
  try {
    const { session, projectId, isSuperAdmin } = await requireAdminAccess()
    if (!isSuperAdmin) {
      const role = await rolesRepository.findById(roleId)
      if (role?.name === ROLE_ADMIN) return { success: false, error: 'FORBIDDEN' }
    }
    if (projectId) {
      await setSetting(`role_schema:${roleId}:${projectId}`, JSON.stringify(permissions), session.user.id)
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/** Resolve effective schema permissions for a user in a project. */
export async function resolveSchemaPermissions(
  userId:    string,
  projectId: string,
): Promise<SchemaPermissions> {
  const { auth } = await import('@/auth')
  const session = await auth()
  if (session?.user?.isSuperAdmin) return { ...DEFAULT_SCHEMA_PERMS_WRITE }

  const projectRole = await (await import('@/db/repositories/project-memberships.repository'))
    .projectMembershipsRepository.getUserProjectRole(userId, projectId)

  if (!projectRole) return { ...DEFAULT_SCHEMA_PERMS_READONLY }

  // Project-specific override takes precedence
  const raw = await getSetting(`role_schema:${projectRole.roleId}:${projectId}`)
  if (raw) return JSON.parse(raw) as SchemaPermissions

  // Fall back to defaults by role name
  return defaultSchemaPermsForRole(projectRole.roleName)
}

// ── Per-project role scoping via app_settings ─────────────────────────────────

const PROJECT_ROLES_KEY = (projectId: string) => `project_custom_roles:${projectId}`

async function registerRoleForProject(roleId: string, projectId: string, userId: string) {
  const raw = await getSetting(PROJECT_ROLES_KEY(projectId))
  const existing: string[] = raw ? JSON.parse(raw) : []
  if (!existing.includes(roleId)) {
    await setSetting(PROJECT_ROLES_KEY(projectId), JSON.stringify([...existing, roleId]), userId)
  }
}

export async function getProjectCustomRoleIds(projectId: string): Promise<string[]> {
  const raw = await getSetting(PROJECT_ROLES_KEY(projectId))
  return raw ? JSON.parse(raw) : []
}

async function unregisterRoleFromProject(roleId: string, projectId: string, userId: string) {
  const raw = await getSetting(PROJECT_ROLES_KEY(projectId))
  const existing: string[] = raw ? JSON.parse(raw) : []
  await setSetting(PROJECT_ROLES_KEY(projectId), JSON.stringify(existing.filter((id) => id !== roleId)), userId)
}

export async function getProjectMembersWithRole(
  roleId: string,
): Promise<ActionResult<Array<{ userId: string; email: string }>>> {
  try {
    const { db } = await import('@/db')
    const { eq, and } = await import('drizzle-orm')
    const { projectMemberships, users } = await import('@/db/schema')
    const { projectId } = await requireAdminAccess()
    if (!projectId) return { success: true, data: [] }

    const rows = await db
      .select({ userId: projectMemberships.userId, email: users.email })
      .from(projectMemberships)
      .innerJoin(users, eq(users.id, projectMemberships.userId))
      .where(and(eq(projectMemberships.projectId, projectId), eq(projectMemberships.roleId, roleId)))

    return { success: true, data: rows }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function reassignAndDeleteRole(
  roleId:    string,
  newRoleId: string,
): Promise<ActionResult<void>> {
  try {
    const { session, projectId, isSuperAdmin } = await requireAdminAccess()
    if (!projectId) throw new Error('NO_PROJECT_CONTEXT')

    const { db } = await import('@/db')
    const { eq, and } = await import('drizzle-orm')
    const { projectMemberships } = await import('@/db/schema')

    await db.update(projectMemberships)
      .set({ roleId: newRoleId })
      .where(and(eq(projectMemberships.projectId, projectId), eq(projectMemberships.roleId, roleId)))

    const customIds = await getProjectCustomRoleIds(projectId)
    if (customIds.includes(roleId)) {
      await unregisterRoleFromProject(roleId, projectId, session.user.id)
      if (isSuperAdmin) {
        await rolesService.deleteRole(roleId)
      }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
