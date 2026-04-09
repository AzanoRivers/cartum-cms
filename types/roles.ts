export const ROLE_ADMIN      = 'admin'      as const
export const ROLE_EDITOR     = 'editor'     as const
export const ROLE_VIEWER     = 'viewer'     as const
export const ROLE_RESTRICTED = 'restricted' as const

export const BUILT_IN_ROLE_NAMES = [ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER, ROLE_RESTRICTED] as const

export type PermissionOperation = 'read' | 'create' | 'update' | 'delete'

export interface NodePermissions {
  canRead:   boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export interface Role {
  id:          string
  name:        string
  description: string | null
  createdAt:   Date
}

export interface RolePermission {
  roleId:    string
  nodeId:    string
  canRead:   boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export interface RoleWithPermissions extends Role {
  permissions: RolePermission[]
}

export interface AccessResult {
  allowed: boolean
  reason?: string
}

export interface CreateRoleInput {
  name:        string
  description?: string
}

export type SectionKey =
  | 'project' | 'appearance' | 'account' | 'email' | 'storage'
  | 'users' | 'roles' | 'api' | 'db' | 'info'

export interface SectionPermission {
  section:   SectionKey
  canAccess: boolean
}
