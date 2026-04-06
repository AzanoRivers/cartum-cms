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
