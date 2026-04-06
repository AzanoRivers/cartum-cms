'use server'

import { auth } from '@/auth'
import { rolesService } from '@/lib/services/roles.service'
import { rolesRepository } from '@/db/repositories/roles.repository'
import type { ActionResult } from '@/types/actions'
import type {
  Role,
  NodePermissions,
  RoleWithPermissions,
  CreateRoleInput,
} from '@/types/roles'

function requireSuperAdmin(isSuperAdmin: boolean): void {
  if (!isSuperAdmin) throw new Error('FORBIDDEN')
}

export async function createRole(
  input: CreateRoleInput,
): Promise<ActionResult<Role>> {
  const session = await auth()
  if (!session) return { success: false, error: 'UNAUTHORIZED' }
  requireSuperAdmin(session.user.isSuperAdmin)

  try {
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
  const session = await auth()
  if (!session) return { success: false, error: 'UNAUTHORIZED' }
  requireSuperAdmin(session.user.isSuperAdmin)

  const result = await rolesService.deleteRole(roleId)
  if (!result.success) return { success: false, error: result.error! }

  return { success: true }
}

export async function setNodePermissions(
  roleId: string,
  nodeId: string,
  perms: NodePermissions,
): Promise<ActionResult<void>> {
  const session = await auth()
  if (!session) return { success: false, error: 'UNAUTHORIZED' }
  requireSuperAdmin(session.user.isSuperAdmin)

  await rolesService.setPermissions(roleId, nodeId, perms)
  return { success: true }
}

export async function assignRoleToUser(
  userId: string,
  roleId: string,
): Promise<ActionResult<void>> {
  const session = await auth()
  if (!session) return { success: false, error: 'UNAUTHORIZED' }
  requireSuperAdmin(session.user.isSuperAdmin)

  await rolesService.assignToUser(userId, roleId)
  return { success: true }
}

export async function removeRoleFromUser(
  userId: string,
  roleId: string,
): Promise<ActionResult<void>> {
  const session = await auth()
  if (!session) return { success: false, error: 'UNAUTHORIZED' }
  requireSuperAdmin(session.user.isSuperAdmin)

  await rolesService.removeFromUser(userId, roleId)
  return { success: true }
}

export async function getRolesWithPermissions(): Promise<ActionResult<RoleWithPermissions[]>> {
  const session = await auth()
  if (!session) return { success: false, error: 'UNAUTHORIZED' }

  const data = await rolesService.getAllWithPermissions()
  return { success: true, data }
}
