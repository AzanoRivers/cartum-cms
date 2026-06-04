import { auth } from '@/auth'
import { rolesService } from '@/lib/services/roles.service'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { resolveSchemaPermissions } from '@/lib/actions/roles.actions'
import { getSetting } from '@/lib/settings/get-setting'
import { ROLE_ADMIN } from '@/types/roles'
import type { PermissionOperation, SchemaPermissions, SectionKey } from '@/types/roles'

/**
 * Server Action guard — node/record level.
 * Throws 'UNAUTHORIZED' if no session, 'FORBIDDEN' if insufficient permissions.
 * Super admins bypass all checks.
 */
export async function requirePermission(
  nodeId: string,
  operation: PermissionOperation,
): Promise<void> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  if (session.user.isSuperAdmin) return

  const allowed = await rolesService.canPerform(session.user.id, nodeId, operation)
  if (!allowed) throw new Error('FORBIDDEN')
}

/**
 * Server Action guard — schema level.
 * Resolves the role's schema permissions from app_settings (DB), not hardcoded names.
 * op: which specific schema operation to check.
 */
export async function requireSchemaPermission(
  projectId: string,
  op: keyof SchemaPermissions,
): Promise<void> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  if (session.user.isSuperAdmin) return

  const perms = await resolveSchemaPermissions(session.user.id, projectId)
  if (!perms[op]) throw new Error('FORBIDDEN')
}

/**
 * Server Action guard — admin level (invitation management, member role changes).
 * Only project admins and super admins pass.
 */
export async function requireProjectAdmin(projectId: string): Promise<void> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  if (session.user.isSuperAdmin) return

  const isAdmin = await projectMembershipsRepository.isMemberWithRole(session.user.id, projectId, ROLE_ADMIN)
  if (!isAdmin) throw new Error('FORBIDDEN')
}

/**
 * Server Action guard — settings section actions.
 * Resolves canActions for a settings section from app_settings (DB), not hardcoded names.
 * Super admins and project admins always pass.
 */
export async function requireSectionActions(
  projectId: string,
  section:   SectionKey,
): Promise<void> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  if (session.user.isSuperAdmin) return

  const isAdmin = await projectMembershipsRepository.isMemberWithRole(session.user.id, projectId, ROLE_ADMIN)
  if (isAdmin) return

  const projectRole = await projectMembershipsRepository.getUserProjectRole(session.user.id, projectId)
  if (!projectRole) throw new Error('FORBIDDEN')

  const raw = await getSetting(`role_sections:${projectRole.roleId}:${projectId}`)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, { view?: boolean; actions?: boolean } | boolean>
      const entry = parsed[section]
      const canActions = typeof entry === 'boolean' ? entry : (entry?.actions ?? false)
      if (!canActions) throw new Error('FORBIDDEN')
      return
    } catch (e) {
      if (e instanceof Error && e.message === 'FORBIDDEN') throw e
    }
  }

  // No project override — read from global DB table
  const { db } = await import('@/db')
  const { roleSectionPermissions } = await import('@/db/schema')
  const { and, eq } = await import('drizzle-orm')
  const rows = await db
    .select({ canActions: roleSectionPermissions.canActions })
    .from(roleSectionPermissions)
    .where(and(eq(roleSectionPermissions.roleId, projectRole.roleId), eq(roleSectionPermissions.section, section)))
    .limit(1)

  if (rows.length === 0) {
    // No DB entry yet (seed pending) — apply open-access default for universal sections
    const OPEN_ACCESS_SECTIONS = ['help'] as string[]
    if (OPEN_ACCESS_SECTIONS.includes(section)) return
    throw new Error('FORBIDDEN')
  }

  if (!rows[0]?.canActions) throw new Error('FORBIDDEN')
}

/**
 * API Route guard. Returns an AccessResult instead of throwing.
 * Use in Route Handlers where you control the response.
 */
export async function checkPermission(
  nodeId: string,
  operation: PermissionOperation,
  userId: string,
  isSuperAdmin: boolean,
): Promise<{ allowed: boolean; reason?: string }> {
  if (isSuperAdmin) return { allowed: true }

  const allowed = await rolesService.canPerform(userId, nodeId, operation)
  if (!allowed) return { allowed: false, reason: 'FORBIDDEN' }

  return { allowed: true }
}
