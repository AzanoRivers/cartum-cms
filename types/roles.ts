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
  | 'project' | 'subscription' | 'appearance' | 'account' | 'email' | 'storage'
  | 'users' | 'roles' | 'api' | 'db' | 'webMigration' | 'info' | 'members'
  | 'cartumProjects' | 'variables' | 'defaults' | 'help' | 'superDb'

export interface SectionPermission {
  section:    SectionKey
  canAccess:  boolean   // canView — can see this section in the nav
  canActions: boolean   // can perform actions within the section (edit/save/delete)
}

/** Resolved section access for a user in a project. */
export interface SectionAccess {
  canView:    boolean
  canActions: boolean
}

export interface GalleryMediaPermissions {
  canView:   boolean
  canUpload: boolean
  canDelete: boolean
}

export interface GalleryPermissions {
  images: GalleryMediaPermissions
  videos: GalleryMediaPermissions
}

export const DEFAULT_GALLERY_PERMS_EDITOR: GalleryPermissions = {
  images: { canView: true, canUpload: true,  canDelete: true  },
  videos: { canView: true, canUpload: true,  canDelete: true  },
}

export const DEFAULT_GALLERY_PERMS_VIEWER: GalleryPermissions = {
  images: { canView: true, canUpload: false, canDelete: false },
  videos: { canView: true, canUpload: false, canDelete: false },
}

// ── Schema / Board permissions ────────────────────────────────────────────────
// Controls who can modify the node graph structure (not record data).
// Stored per role per project in app_settings as `role_schema:{roleId}:{projectId}`.

export interface SchemaPermissions {
  canCreate:  boolean   // create container or field nodes
  canUpdate:  boolean   // rename, move, update field meta
  canDelete:  boolean   // delete nodes
  canConnect: boolean   // create or delete connections
}

/** Full write — default for admin/editor and custom roles */
export const DEFAULT_SCHEMA_PERMS_WRITE: SchemaPermissions = {
  canCreate: true, canUpdate: true, canDelete: true, canConnect: true,
}

/** Read-only — default for viewer/restricted */
export const DEFAULT_SCHEMA_PERMS_READONLY: SchemaPermissions = {
  canCreate: false, canUpdate: false, canDelete: false, canConnect: false,
}
