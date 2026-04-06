import { auth } from '@/auth'
import { rolesService } from '@/lib/services/roles.service'
import type { PermissionOperation } from '@/types/roles'

/**
 * Server Action guard. Call at the top of any mutating Server Action.
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
