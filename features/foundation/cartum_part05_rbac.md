# Part 05 — RBAC: Roles & Permissions

## Goal
Implement the full role-based access control system. Roles control which nodes a user can see and what operations they can perform. RBAC is enforced at **both** the UI layer and the API layer — UI hiding is not a security boundary.

## Prerequisites
- Part 02 (roles, role_permissions, users_roles tables)
- Part 03 (default roles created: admin, editor, viewer)
- Part 04 (session with user.id and user.roles available)

---

## Permission Model

Every non-super-admin user has:
- One or more **roles**
- Each role has **per-node permissions**: `can_read`, `can_create`, `can_update`, `can_delete`

A user can perform an operation on a node if **at least one** of their roles grants that permission for that node.

Super admin (`is_super_admin = true`) bypasses all permission checks — they always have full access.

```
User
 └── roles: ['editor']
      └── role: 'editor'
           └── permissions:
                ├── node: 'Blog Posts'    → read ✓, create ✓, update ✓, delete ✗
                ├── node: 'Media'         → read ✓, create ✓, update ✗, delete ✗
                └── node: 'Users'         → (no entry = no access at all)
```

---

## Permission Resolution Service

### `/lib/services/roles.service.ts`

```ts
/**
 * Resolves the effective permissions a user has for a given node.
 * Returns null-object (all false) if no permissions found.
 */
resolvePermissions(userId: string, nodeId: string): Promise<NodePermissions>

/**
 * Returns all node IDs accessible (can_read = true) for a user.
 * Used by Content Mode to build the navigation.
 */
getAccessibleNodes(userId: string): Promise<string[]>

/**
 * Checks a single operation. Throws or returns false based on context.
 */
canPerform(userId: string, nodeId: string, operation: PermissionOperation): Promise<boolean>
```

### `/types/roles.ts`
```ts
export type PermissionOperation = 'read' | 'create' | 'update' | 'delete'

export interface NodePermissions {
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export interface Role {
  id: string
  name: string
  description: string | null
  createdAt: Date
}

export interface RolePermission {
  roleId: string
  nodeId: string
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export interface AccessResult {
  allowed: boolean
  reason?: string
}
```

---

## RBAC Guard — Server Action Layer

Every Server Action that mutates data must call the RBAC guard before executing:

```ts
// lib/rbac/guard.ts
import { auth } from '@/auth'
import { rolesService } from '@/lib/services/roles.service'

export async function requirePermission(
  nodeId: string,
  operation: PermissionOperation
): Promise<void> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  if (session.user.isSuperAdmin) return  // super admin bypasses all

  const allowed = await rolesService.canPerform(session.user.id, nodeId, operation)
  if (!allowed) throw new Error('FORBIDDEN')
}
```

Usage in any Server Action:
```ts
export async function createRecord(nodeId: string, data: RecordInput) {
  await requirePermission(nodeId, 'create')   // ← throws if not allowed
  return recordService.create(nodeId, data)
}
```

---

## RBAC Guard — API Route Handler Layer

All `/api/v1/[nodeName]` handlers check permissions before responding:

```ts
// Middleware-style check in each route handler
const resolved = await requireApiPermission(nodeName, operation, request)
if (!resolved.allowed) {
  return Response.json({ error: 'FORBIDDEN' }, { status: 403 })
}
```

API routes accept a bearer token (Part 13 — API token management) or the session cookie. Both paths resolve to a user ID and go through the same RBAC logic.

---

## Default Roles Behavior

Created automatically in Part 03 `initializeSchema()`. They start with **no node permissions**. Permissions are added by the super admin from the Settings → Roles panel.

| Role | Initial node permissions |
|---|---|
| `admin` | None (must be configured) |
| `editor` | None (must be configured) |
| `viewer` | None (must be configured) |

This is intentional: the system should not assume which nodes matter until the schema is built.

---

## Settings: Role Management UI (backend only in this part)

The actual UI is in Part 17 (Settings). This part delivers the service and action layer:

### `/lib/actions/roles.actions.ts`
```ts
createRole(input: CreateRoleInput): Promise<ActionResult<Role>>
deleteRole(roleId: string): Promise<ActionResult>
setNodePermissions(roleId: string, nodeId: string, perms: NodePermissions): Promise<ActionResult>
assignRoleToUser(userId: string, roleId: string): Promise<ActionResult>
removeRoleFromUser(userId: string, roleId: string): Promise<ActionResult>
getRolesWithPermissions(): Promise<ActionResult<RoleWithPermissions[]>>
```

### `/lib/services/roles.service.ts` (extended)
```ts
createRole(input)
deleteRole(roleId)           // cannot delete if users are assigned
setPermissions(roleId, nodeId, perms)
assignToUser(userId, roleId)
removeFromUser(userId, roleId)
getAllWithPermissions()
```

---

## Content Mode Node Visibility

When a non-super-admin user loads Content Mode, the node list is **filtered** to only nodes where `can_read = true` for their roles:

```ts
// In the page server component for Content Mode
const session = await auth()
const accessibleNodeIds = await rolesService.getAccessibleNodes(session.user.id)
const nodes = await nodesRepository.findByIds(accessibleNodeIds)
```

If a user has zero accessible nodes: Content Mode shows an empty state — "No content areas have been assigned to your account yet."

---

## Acceptance Criteria

- [x] `requirePermission()` throws `FORBIDDEN` when user lacks access
- [x] Super admin bypasses all permission checks
- [x] `createRecord` Server Action returns 403-equivalent error for unauthorized user
- [x] API route handler returns `{ error: 'FORBIDDEN' }` with status 403 for unauthorized
- [x] `getAccessibleNodes()` returns only node IDs where the user has `can_read`
- [x] Content Mode shows empty state for users with no permissions assigned
- [x] `createRole()` succeeds and role shows in DB
- [x] `deleteRole()` fails if users are still assigned to that role (returns error, does not throw)
- [x] `setNodePermissions()` updates the `role_permissions` table correctly

---

## Post-Part-05 Wizard Robustness Additions

These items were identified after Part 05 completion and hardened the setup wizard:

- [x] Wizard locale stored in HTTP-only cookie `cartum-setup-locale` (not in-memory module variable) — survives server restarts and concurrent requests
- [x] `/setup/credentials` Server Component guard: redirects to `/setup/locale` if cookie is missing
- [x] `/setup/project` Server Component guard: queries DB for super admin, redirects to `/setup/credentials` if none exists
- [x] `/setup/initializing` Server Component guard: queries DB for project, redirects to `/setup/project` if none exists
- [x] `createSuperAdmin` service is idempotent — skips creation if a super admin already exists
- [x] `createProject` service is idempotent — skips creation if a project already exists
- [x] All wizard step pages are Server Components that enforce sequential completion before rendering their client
