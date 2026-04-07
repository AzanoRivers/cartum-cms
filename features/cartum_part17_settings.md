# Part 17 — Settings Panel

## Goal
Build the Settings panel as a floating overlay — not a page. It opens over the canvas when the user clicks the gear icon on the dock. It has 6 sections navigated via a vertical tab list. All sections use forms backed by Server Actions. Role permission matrix is the most complex section.

## Prerequisites
- Part 04 (session, super_admin only sections)
- Part 05 (role/permission types)
- Part 13 (API tokens section)
- Part 14 (storage section)
- Part 15 (translation keys)
- Part 16 (alert.success/error on save)

---

## Panel Architecture

Settings is NOT a route. It is a floating panel rendered in the root layout using a portal:

```
RootLayout
└── AppShell
    ├── DockBar (⚙️ icon → opens settings)
    └── SettingsPanel (renders when open, fixed overlay)
```

State for open/close lives in the **Zustand 5 `useUIStore`** defined in Part 08 (`lib/stores/uiStore.ts`). Do not create a separate store.

```ts
// Using the shared UI store (defined in Part 08)
import { useUIStore } from '@/lib/stores/uiStore'

// Open settings to a specific section:
useUIStore.getState().openSettings('storage')

// In a component:
const { settingsOpen, settingsSection, closeSettings } = useUIStore()
```

---

## `SettingsPanel` Organism Layout

```tsx
// components/ui/organisms/SettingsPanel.tsx
'use client'
// Full-screen semi-transparent backdrop
// Centered floating card (max-w-4xl, min-h-[70vh])
// Left: vertical section tabs (140px fixed)
// Right: active section content (scrollable)
// Close button top-right
// VHSTransition wraps the card content on open
```

### Visual Structure
```
┌─────────────────────────────────────────────────┐
│  Settings                                    [✕] │
├──────────────┬──────────────────────────────────┤
│  ● Project   │  Project                          │
│    Storage   │  ─────────────────────────────── │
│    Email     │  Project name                     │
│    API       │  [_____________________]          │
│    Users     │                                   │
│    Roles     │  Default locale                   │
│              │  [EN ▼]                           │
│              │                                   │
│              │                 [Save changes]    │
└──────────────┴──────────────────────────────────┘
```

---

## Section: Project

Fields: `projectName`, `defaultLocale` (select: en | es).

```ts
// lib/actions/settings.actions.ts
export async function updateProjectSettings(input: UpdateProjectInput): Promise<ActionResult>
// Updates the single row in the `project` table
```

---

## Section: Storage (R2 Config)

Fields: `r2BucketUrl`, `r2PublicUrl`, `mediaVpsUrl` (optional), `mediaVpsKey` (optional).

Includes a **Test Storage** button that calls a Server Action to perform a lightweight ping (PUT a 1-byte test object, then delete it):

```ts
export async function testStorageConnection(): Promise<ActionResult<{ ok: boolean; latencyMs: number }>>
```

The `mediaVpsKey` input renders as a password field. On focus, it unmasks briefly (standard text field behavior).

---

## Section: Email

Field: `resendApiKey`.

**Test Email** button sends a test email to the session user's address:

```ts
export async function testEmailConnection(): Promise<ActionResult<{ sent: boolean }>>
```

Optional section — if empty, password recovery is disabled and a notice is shown.

---

## Section: API Tokens

Lists all active tokens in a table:

| Name | Role | Last used | Expires | Actions |
|---|---|---|---|---|
| Frontend App | viewer | 2 min ago | Never | [Revoke] |
| CI Pipeline | admin | 3 days ago | Jan 2025 | [Revoke] |

**New token form** at the bottom:
- Token name (required)
- Role (select from existing roles)
- Expiry (optional date picker)

On create: show a one-time raw token modal. Close button is disabled until the user checks "I have copied this token".

Actions:
```ts
export async function createApiToken(input: CreateApiTokenInput): Promise<ActionResult<{ rawToken: string; meta: ApiToken }>>
export async function revokeApiToken(tokenId: string): Promise<ActionResult>
```

---

## Section: Users

Shows all users with their roles. Only `super_admin` sees this in full; `admin` can invite but not remove.

### User row
```
[Avatar] Jane Doe    jane@example.com    [admin ▼]    [Remove]
```

**Invite user** form at top:
- Email address
- Role assignment

```ts
export async function inviteUser(input: InviteUserInput): Promise<ActionResult>
// Creates a user record with temporary password and sends invite email if Resend is configured
// If no email: shows a generated temporary password in a modal
```

### Role assignment change
```ts
export async function updateUserRole(userId: string, roleId: string): Promise<ActionResult>
```

---

## Section: Roles

The most complex section. Shows a list of custom roles + a permission matrix.

### Role list

```
[super_admin]  built-in — cannot be edited
[admin]        built-in — cannot be edited
[editor]       custom ✏️
[viewer]       custom ✏️
[+ New role]
```

### Permission matrix (for selected custom role)

Displayed as a table:

```
Node               | read | create | update | delete
─────────────────────────────────────────────────────
Blog Posts         |  ✓   |   ✓    |   ✓    |        
Authors            |  ✓   |        |        |        
* (all other nodes)|  ✓   |        |        |        
```

Each cell is a checkbox. The last row `*` is a wildcard for any nodes not explicitly listed.

```ts
// types/rbac.ts (from Part 05, extended)
export interface RolePermissionMatrix {
  roleId: string
  nodePermissions: Array<{
    nodeId: string | '*'
    actions: Array<'read' | 'create' | 'update' | 'delete'>
  }>
}
```

```ts
export async function saveRolePermissions(matrix: RolePermissionMatrix): Promise<ActionResult>
export async function createRole(input: CreateRoleInput): Promise<ActionResult<Role>>
export async function deleteRole(roleId: string): Promise<ActionResult>
// deleteRole reassigns affected users to 'viewer' role
```

### Role deletion guard

If a role assigned to ≥1 user is deleted:
- A confirmation modal lists the affected users
- On confirm: users are reassigned to `viewer`
- This is shown clearly before confirming

---

## Access Restrictions

| Section | Who can access |
|---|---|
| Project | super_admin only |
| Storage | super_admin only |
| Email | super_admin only |
| API Tokens | super_admin, admin |
| Users | super_admin (full), admin (invite only) |
| Roles | super_admin only |

Sections not accessible to the current user are hidden from the tab list entirely.

---

## Types

```ts
// types/settings.ts
export interface ProjectSettings {
  projectName: string
  defaultLocale: 'en' | 'es'
}

export interface StorageSettings {
  r2BucketUrl: string
  r2PublicUrl: string
  mediaVpsUrl?: string
  mediaVpsKey?: string
}

export interface UpdateProjectInput extends ProjectSettings {}

export interface InviteUserInput {
  email: string
  roleId: string
}

export interface CreateRoleInput {
  name: string
  permissions?: RolePermissionMatrix['nodePermissions']
}

export interface CreateApiTokenInput {
  name: string
  roleId: string
  expiresAt?: Date
}
```

---

## Acceptance Criteria

- [x] Settings panel opens as a floating overlay (not a page navigation)
- [x] VHSTransition runs on the panel card when it opens
- [x] Clicking backdrop or pressing `Esc` closes the panel
- [x] Project section saves and shows `alert.success` on success
- [x] Storage test returns latency on success, `alert.error` on fail
- [x] Email section shows notice if `RESEND_API_KEY` is not configured
- [x] API token create shows raw token once in a modal with copy gate
- [x] Revoked tokens disappear from the list immediately
- [x] Users section lists all users with their roles
- [x] Role assignment dropdown updates immediately on change
- [x] Role permission matrix saves per-node + wildcard permissions
- [x] Deleting a role with active users shows affected user list before confirming
- [x] Sections restricted by role are hidden from the tab list
- [x] All form inputs use translation keys (no hardcoded English labels)
- [x] Storage section shows `r2_bucket_name`, `r2_public_url`, `media_vps_url`, `media_vps_key` *(from Part 14)*
- [x] VPS key field is masked; has show/hide toggle *(from Part 14)*
- [x] VPS section shows an "API Docs ↗" link to `https://optimus.azanolabs.com/guide` (opens in new tab) *(from Part 14)*
- [x] Saving empty value removes DB row (env fallback resumes) *(from Part 14)*
- [x] Only `super_admin` can modify storage settings *(from Part 14)*
