# MP-01 — Multi-Project: Database Capsule Architecture

## Goal

Transform the single-project (singleton) database into a **multi-project capsule system**. Each project is a fully isolated capsule containing its own nodes, records, field metadata, node relations, role permissions, and media assets. Global infrastructure (users, roles, env-level API keys) remains shared across all projects. A project-level settings override layer allows each project to have its own storage endpoints, theme, and locale without touching the global env.

This document covers **only schema, repositories, query patterns, and session context**. UI and invitation logic are in MP-02 and MP-03.

---

## Prerequisites

- Part 01–17 (foundation, auth, RBAC, nodes, media) fully implemented
- Drizzle ORM + Neon adapter in place
- Auth.js v5 JWT session working

---

## Architecture Decision: Capsule Model

```
┌─────────────────────────────────────────────────────────────┐
│  GLOBAL LAYER  (shared across all projects)                 │
│  users · roles · app_settings (infra keys) ·                │
│  password_reset_tokens · email_otp_codes                    │
└────────────────────────┬────────────────────────────────────┘
                         │  1:N
         ┌───────────────▼───────────────┐
         │  PROJECT CAPSULE              │
         │  project (row)                │
         │  project_settings (KV store)  │
         │  project_memberships          │
         │  project_invitations          │
         │                               │
         │  ┌─────────────────────────┐  │
         │  │  DATA CAPSULE           │  │
         │  │  nodes                  │  │
         │  │  field_meta             │  │
         │  │  node_relations         │  │
         │  │  records                │  │
         │  │  role_permissions       │  │
         │  │  media                  │  │
         │  └─────────────────────────┘  │
         └───────────────────────────────┘
```

### Capsule Contents (Mandatory Per Project)

Each project capsule MUST encapsulate the following independently:

| Capsule Property | Where stored | Description |
|-----------------|--------------|-------------|
| **Language** | `project.default_locale` | Default locale for the project UI and invitation emails (`en` \| `es`) |
| **Theme** | `project_settings['theme']` | Visual theme override per project; falls back to global `app_settings['theme']` |
| **Members** | `project_memberships` | Users explicitly invited/assigned to this project with a role |
| **APIs (storage)** | `project_settings['storage_provider']`, `['r2_bucket_name']`, `['r2_public_url']`, `['blob_token']` | Per-project storage overrides |
| **APIs (media VPS)** | `project_settings['media_vps_url']`, `['media_vps_key']` | Per-project Optimus VPS endpoint |
| **APIs (email)** | `project_settings['resend_api_key']`, `['resend_from_email']` | Per-project email sender override |
| **APIs (scraper)** | `project_settings['scraper_api_url']`, `['scraper_api_key']` | Per-project web migration scraper override |
| **Data** | `nodes`, `records`, `field_meta`, `node_relations`, `role_permissions`, `media` | All CMS content |

### Capsule Isolation Rules

| Rule | Detail |
|------|--------|
| Strict isolation | Project A can NEVER query Project B's capsule data |
| Super admin override | `isSuperAdmin=true` users can access any project |
| Infra keys global by default | R2, Blob, Optimus, Resend credentials come from `app_settings` / env if no project override |
| Project key override | `project_settings` overrides any key for that specific project |
| Roles are templates | Global roles (admin, editor, viewer, restricted) are shared templates; membership assigns them per-project |
| Session carries project context | JWT contains `currentProjectId`; all server actions derive project scope from it |
| API key visibility | **No role (including admin) can view actual API key values in the UI.** Fields always render as masked (`••••••••`). Only `super_admin` can reveal actual values. See "API Key Visibility Policy" below. |

### Settings Priority (per project query)

```
project_settings[key] → app_settings[key] → process.env[KEY] → undefined
```

---

## Schema Changes

### 1. `project` table — ALREADY EXISTS, promote to multi-row

No column changes needed. Remove any singleton enforcement code.

**Add `owner_id` FK** to track who created the project:

```typescript
// db/schema/project.schema.ts  (ADD column)
owner_id: uuid('owner_id')
  .references(() => users.id, { onDelete: 'restrict' })
  .notNull(),
```

### 2. `nodes` table — ADD `project_id`

```typescript
// db/schema/nodes.schema.ts
project_id: uuid('project_id')
  .references(() => project.id, { onDelete: 'cascade' })
  .notNull(),
```

Migration strategy (zero-downtime):
1. Add column as nullable
2. `UPDATE nodes SET project_id = (SELECT id FROM project LIMIT 1)`
3. Add NOT NULL constraint + index

### 3. `media` table — ADD `project_id`

```typescript
// db/schema/media.schema.ts
project_id: uuid('project_id')
  .references(() => project.id, { onDelete: 'cascade' })
  .notNull(),
```

Same migration pattern as nodes.

### 4. NEW — `project_memberships` table

Replaces the flat `users_roles` table for project-level access. `users_roles` can remain for CMS-global roles if needed (super admin bootstrapping), but project access is governed exclusively by memberships.

```typescript
// db/schema/project_memberships.schema.ts
import { pgTable, uuid, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { project } from './project.schema'
import { users } from './users.schema'
import { roles } from './roles.schema'

export const projectMemberships = pgTable(
  'project_memberships',
  {
    user_id:    uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    project_id: uuid('project_id').references(() => project.id, { onDelete: 'cascade' }).notNull(),
    role_id:    uuid('role_id').references(() => roles.id, { onDelete: 'restrict' }).notNull(),
    joined_at:  timestamp('joined_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.user_id, t.project_id] }),
  }),
)

export type ProjectMembership = typeof projectMemberships.$inferSelect
export type NewProjectMembership = typeof projectMemberships.$inferInsert
```

### 5. NEW — `project_settings` table

Per-project key-value overrides. Keys are the same as `app_settings` (e.g. `storage_provider`, `r2_bucket_name`, `theme`). A project setting silently overrides the global one for that project's operations.

```typescript
// db/schema/project_settings.schema.ts
import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'
import { project } from './project.schema'
import { users } from './users.schema'

export const projectSettings = pgTable('project_settings', {
  project_id:  uuid('project_id').references(() => project.id, { onDelete: 'cascade' }).notNull(),
  key:         text('key').notNull(),
  value:       text('value').notNull(),
  updated_at:  timestamp('updated_at').defaultNow().notNull(),
  updated_by:  uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.project_id, t.key] }),
}))

export type ProjectSetting = typeof projectSettings.$inferSelect
```

### 6. NEW — `project_invitations` table

```typescript
// db/schema/project_invitations.schema.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { project } from './project.schema'
import { roles } from './roles.schema'
import { users } from './users.schema'

export const projectInvitations = pgTable('project_invitations', {
  id:           uuid('id').defaultRandom().primaryKey(),
  project_id:   uuid('project_id').references(() => project.id, { onDelete: 'cascade' }).notNull(),
  invited_email: text('invited_email').notNull(),
  role_id:      uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  invited_by:   uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
  token_hash:   text('token_hash').notNull().unique(),
  expires_at:   timestamp('expires_at', { withTimezone: true }).notNull(),
  accepted_at:  timestamp('accepted_at', { withTimezone: true }),
  created_at:   timestamp('created_at').defaultNow().notNull(),
})

export type ProjectInvitation = typeof projectInvitations.$inferSelect
export type NewProjectInvitation = typeof projectInvitations.$inferInsert
```

---

## Drizzle Migration File

```sql
-- drizzle/migrations/0020_multiproject_capsule.sql

-- 1. Add owner_id to project
ALTER TABLE "project" ADD COLUMN "owner_id" uuid REFERENCES "users"("id") ON DELETE RESTRICT;

-- 2. Add project_id to nodes (nullable first)
ALTER TABLE "nodes" ADD COLUMN "project_id" uuid REFERENCES "project"("id") ON DELETE CASCADE;

-- 3. Backfill nodes from the single existing project
UPDATE "nodes" SET "project_id" = (SELECT "id" FROM "project" LIMIT 1) WHERE "project_id" IS NULL;

-- 4. Make project_id NOT NULL on nodes
ALTER TABLE "nodes" ALTER COLUMN "project_id" SET NOT NULL;
CREATE INDEX "nodes_project_id_idx" ON "nodes"("project_id");

-- 5. Add project_id to media
ALTER TABLE "media" ADD COLUMN "project_id" uuid REFERENCES "project"("id") ON DELETE CASCADE;
UPDATE "media" SET "project_id" = (SELECT "id" FROM "project" LIMIT 1) WHERE "project_id" IS NULL;
ALTER TABLE "media" ALTER COLUMN "project_id" SET NOT NULL;
CREATE INDEX "media_project_id_idx" ON "media"("project_id");

-- 6. Create project_memberships
CREATE TABLE "project_memberships" (
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "role_id"    uuid NOT NULL REFERENCES "roles"("id") ON DELETE RESTRICT,
  "joined_at"  timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "project_id")
);

-- 7. Backfill memberships: existing users → existing project, assign their current role
INSERT INTO "project_memberships" ("user_id", "project_id", "role_id", "joined_at")
SELECT ur.user_id, (SELECT id FROM project LIMIT 1), ur.role_id, now()
FROM users_roles ur
ON CONFLICT DO NOTHING;

-- 8. Create project_settings
CREATE TABLE "project_settings" (
  "project_id"  uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "key"         text NOT NULL,
  "value"       text NOT NULL,
  "updated_at"  timestamp DEFAULT now() NOT NULL,
  "updated_by"  uuid REFERENCES "users"("id") ON DELETE SET NULL,
  PRIMARY KEY ("project_id", "key")
);

-- 9. Create project_invitations
CREATE TABLE "project_invitations" (
  "id"            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "project_id"    uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "invited_email" text NOT NULL,
  "role_id"       uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "invited_by"    uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "token_hash"    text NOT NULL UNIQUE,
  "expires_at"    timestamptz NOT NULL,
  "accepted_at"   timestamptz,
  "created_at"    timestamp DEFAULT now() NOT NULL
);
```

---

## Session Changes

### auth.ts — Add `currentProjectId` to JWT

```typescript
// auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id            = user.id
        token.isSuperAdmin  = user.isSuperAdmin
        token.roles         = user.roles
        // Set currentProjectId to user's first project membership
        token.currentProjectId = user.currentProjectId ?? null
      }
      return token
    },
    async session({ session, token }) {
      session.user.id               = token.id as string
      session.user.isSuperAdmin     = token.isSuperAdmin as boolean
      session.user.roles            = token.roles as string[]
      session.user.currentProjectId = token.currentProjectId as string | null
      return session
    },
  },
  // ...
})

// types/next-auth.d.ts — extend session type
declare module 'next-auth' {
  interface Session {
    user: {
      id:               string
      isSuperAdmin:     boolean
      roles:            string[]
      currentProjectId: string | null
    } & DefaultSession['user']
  }
}
```

### lib/auth/get-project-id.ts — Helper used in all server actions

```typescript
// lib/auth/get-project-id.ts
import { auth } from '@/auth'

/**
 * Returns the currentProjectId from session.
 * Throws if no session or no project context.
 * Super admins: must still have a currentProjectId set (they pick a project to operate in).
 */
export async function requireProjectId(): Promise<string> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const id = session.user.currentProjectId
  if (!id) throw new Error('NO_PROJECT_CONTEXT')
  return id
}

/**
 * Verify that the calling user is a member of the given projectId.
 * Super admins bypass the membership check.
 */
export async function assertProjectAccess(projectId: string): Promise<void> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  if (session.user.isSuperAdmin) return
  const isMember = await projectMembershipsRepository.isMember(session.user.id, projectId)
  if (!isMember) throw new Error('FORBIDDEN')
}
```

---

## Repository Changes

### nodes.repository.ts — All queries gain project_id filter

```typescript
// Pattern applied to EVERY node query:
async findAll(projectId: string): Promise<AnyNode[]> {
  return db.select().from(nodes)
    .where(eq(nodes.projectId, projectId))
    // ...
}

async findById(id: string, projectId: string): Promise<AnyNode | null> {
  const [row] = await db.select().from(nodes)
    .where(and(eq(nodes.id, id), eq(nodes.projectId, projectId)))
    .limit(1)
  return row ?? null
}

async create(data: NewNode & { projectId: string }): Promise<AnyNode> {
  const [row] = await db.insert(nodes).values(data).returning()
  return row
}
```

### NEW — project_memberships.repository.ts

```typescript
// db/repositories/project_memberships.repository.ts
import { db } from '@/db'
import { projectMemberships, roles } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export const projectMembershipsRepository = {

  async isMember(userId: string, projectId: string): Promise<boolean> {
    const [row] = await db.select()
      .from(projectMemberships)
      .where(and(
        eq(projectMemberships.userId, userId),
        eq(projectMemberships.projectId, projectId),
      ))
      .limit(1)
    return !!row
  },

  async getUserProjects(userId: string) {
    return db.select({
      projectId: projectMemberships.projectId,
      roleId:    projectMemberships.roleId,
      joinedAt:  projectMemberships.joinedAt,
    })
    .from(projectMemberships)
    .where(eq(projectMemberships.userId, userId))
  },

  async addMember(userId: string, projectId: string, roleId: string): Promise<void> {
    await db.insert(projectMemberships)
      .values({ userId, projectId, roleId })
      .onConflictDoUpdate({
        target: [projectMemberships.userId, projectMemberships.projectId],
        set: { roleId },
      })
  },

  async removeMember(userId: string, projectId: string): Promise<void> {
    await db.delete(projectMemberships)
      .where(and(
        eq(projectMemberships.userId, userId),
        eq(projectMemberships.projectId, projectId),
      ))
  },

  async listMembers(projectId: string) {
    return db.select({
      userId:   projectMemberships.userId,
      roleId:   projectMemberships.roleId,
      joinedAt: projectMemberships.joinedAt,
      email:    users.email,
      roleName: roles.name,
    })
    .from(projectMemberships)
    .innerJoin(users, eq(users.id, projectMemberships.userId))
    .innerJoin(roles, eq(roles.id, projectMemberships.roleId))
    .where(eq(projectMemberships.projectId, projectId))
  },
}
```

### NEW — project_settings.repository.ts

```typescript
// db/repositories/project_settings.repository.ts
import { db } from '@/db'
import { projectSettings, appSettings } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export const projectSettingsRepository = {

  /**
   * Get a setting for a project.
   * Priority: project_settings → app_settings → env var
   */
  async get(projectId: string, key: string, envFallback?: string): Promise<string | undefined> {
    // 1. Project-specific override
    const [projectRow] = await db.select()
      .from(projectSettings)
      .where(and(eq(projectSettings.projectId, projectId), eq(projectSettings.key, key)))
      .limit(1)
    if (projectRow) return projectRow.value

    // 2. Global app_settings
    const [globalRow] = await db.select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .limit(1)
    if (globalRow) return globalRow.value

    // 3. Env var fallback
    return envFallback ? (process.env[envFallback] ?? undefined) : undefined
  },

  async set(projectId: string, key: string, value: string | undefined, updatedBy: string): Promise<void> {
    if (!value) {
      await db.delete(projectSettings)
        .where(and(eq(projectSettings.projectId, projectId), eq(projectSettings.key, key)))
      return
    }
    await db.insert(projectSettings)
      .values({ projectId, key, value, updatedBy })
      .onConflictDoUpdate({
        target: [projectSettings.projectId, projectSettings.key],
        set: { value, updatedAt: new Date(), updatedBy },
      })
  },

  async getAll(projectId: string): Promise<Record<string, string>> {
    const rows = await db.select()
      .from(projectSettings)
      .where(eq(projectSettings.projectId, projectId))
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  },
}
```

---

## Server Action Pattern (all existing actions)

Every existing server action that touches nodes/records/media must be updated to:

```typescript
// BEFORE (single project, no scope):
export async function getNodes() {
  await requireSession()
  return nodeService.getAll()
}

// AFTER (multi-project, scoped):
export async function getNodes() {
  const projectId = await requireProjectId()
  await assertProjectAccess(projectId)
  return nodeService.getAll(projectId)
}
```

This pattern applies to **all** actions in:
- `lib/actions/nodes.actions.ts`
- `lib/actions/records.actions.ts`
- `lib/actions/media.actions.ts`
- `lib/actions/relations.actions.ts`
- `lib/actions/settings.actions.ts` (uses project-scoped settings where applicable)

---

## Project Service Changes

### lib/services/project.service.ts — extend for multi-project

```typescript
// Create a new project and assign creator as admin
export async function createProjectService({
  name,
  description,
  locale,
  creatorId,
}: {
  name:        string
  description: string
  locale:      string
  creatorId:   string
}): Promise<{ projectId: string }> {
  // 1. Create project row
  const [proj] = await db.insert(project)
    .values({ name, description, defaultLocale: locale, ownerId: creatorId })
    .returning()

  // 2. Fetch admin role
  const adminRole = await rolesRepository.findByName('admin')
  if (!adminRole) throw new Error('ROLES_NOT_INITIALIZED')

  // 3. Add creator as admin member
  await projectMembershipsRepository.addMember(creatorId, proj.id, adminRole.id)

  return { projectId: proj.id }
}

// Get all projects for a user (returns [] for super admin, use getAllProjects instead)
export async function getUserProjectsService(userId: string) {
  const memberships = await projectMembershipsRepository.getUserProjects(userId)
  if (!memberships.length) return []
  const ids = memberships.map(m => m.projectId)
  const rows = await db.select().from(project).where(inArray(project.id, ids))
  return rows
}

// Super admin: get all projects
export async function getAllProjectsService() {
  return db.select().from(project).orderBy(asc(project.createdAt))
}
```

---

## lib/actions/project.actions.ts — NEW

```typescript
'use server'

import { auth } from '@/auth'
import { requireProjectId } from '@/lib/auth/get-project-id'
import { createProjectService, getUserProjectsService } from '@/lib/services/project.service'
import { updateSessionProject } from '@/lib/auth/session-utils'
import { redirect } from 'next/navigation'

/**
 * Create a new project and switch to it.
 */
export async function createProject(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')

  const name        = formData.get('name') as string
  const description = (formData.get('description') as string) ?? ''
  const locale      = (formData.get('locale') as string) ?? 'en'

  const { projectId } = await createProjectService({
    name, description, locale,
    creatorId: session.user.id,
  })

  // Update session to switch to the new project
  await updateSessionProject(projectId)

  redirect('/cms/board')
}

/**
 * Switch the active project for the current session.
 */
export async function switchProject(projectId: string) {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')

  if (!session.user.isSuperAdmin) {
    const isMember = await projectMembershipsRepository.isMember(session.user.id, projectId)
    if (!isMember) throw new Error('FORBIDDEN')
  }

  await updateSessionProject(projectId)
  redirect('/cms/board')
}

/**
 * Get all projects available to the current user.
 */
export async function getMyProjects() {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')

  if (session.user.isSuperAdmin) return getAllProjectsService()
  return getUserProjectsService(session.user.id)
}
```

---

## lib/auth/session-utils.ts — NEW

```typescript
// lib/auth/session-utils.ts
// Updates currentProjectId in the JWT cookie without requiring re-login.
// Implemented by setting a short-lived "project-switch" cookie that the
// auth middleware picks up on the next request and encodes into the JWT.

import { cookies } from 'next/headers'

const SWITCH_COOKIE = 'cartum-project-switch'

export async function updateSessionProject(projectId: string): Promise<void> {
  const store = await cookies()
  store.set(SWITCH_COOKIE, projectId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60, // 60 seconds — consumed on next request by middleware/jwt callback
  })
}

// In auth.ts jwt() callback — check for this cookie and update token:
// if (cookies().get('cartum-project-switch')?.value) {
//   token.currentProjectId = cookies().get('cartum-project-switch')!.value
//   // Cookie is consumed — will expire naturally
// }
```

---

## Folder Skeleton

```
db/
  schema/
    project_memberships.schema.ts   ← NEW
    project_settings.schema.ts      ← NEW
    project_invitations.schema.ts   ← NEW (used by MP-03)
  repositories/
    project_memberships.repository.ts  ← NEW
    project_settings.repository.ts     ← NEW
    project_invitations.repository.ts  ← NEW (MP-03)
  migrations/
    0020_multiproject_capsule.sql   ← NEW

lib/
  auth/
    get-project-id.ts     ← NEW
    session-utils.ts      ← NEW
  actions/
    project.actions.ts    ← NEW
  services/
    project.service.ts    ← EXTEND

types/
  next-auth.d.ts          ← EXTEND (add currentProjectId)
```

---

## DB Export Scoping

Database export (dump / schema snapshot) is scoped to the **currently active project only**. A user cannot export all projects at once, nor export a project they are not a member of.

### Rules

- Export action reads `currentProjectId` from session via `requireProjectId()`
- Exported data includes: all nodes, field_meta, node_relations, records, media rows, role_permissions — filtered by `project_id = currentProjectId`
- Export does NOT include: `users`, `roles`, `app_settings`, `project_memberships` (global data) — these are CMS infrastructure, not project content
- Super admins can export any project but must be actively "inside" it (i.e., `currentProjectId` must be set to the target project at time of export)
- The export endpoint / action must enforce this scope server-side; the UI must not offer "export all projects"

### Export Action Pattern

```typescript
// lib/actions/db.actions.ts — EXTEND
export async function exportProjectDatabase() {
  const projectId = await requireProjectId()   // throws if no context
  await assertProjectAccess(projectId)

  // Fetch only data belonging to currentProjectId
  const exportedNodes   = await nodesRepository.findAll(projectId)
  const exportedRecords = await recordsRepository.findByProjectId(projectId)
  const exportedMedia   = await mediaRepository.findByProjectId(projectId)
  // ... etc

  return {
    projectId,
    exportedAt: new Date().toISOString(),
    nodes:       exportedNodes,
    records:     exportedRecords,
    media:       exportedMedia,
  }
}
```

---

## API Key Visibility Policy

**Rule:** API key values are secrets. No user — regardless of role — can see the current value of a sensitive key through the settings UI. Only `super_admin` can reveal and read the actual stored value.

### Sensitive Keys (applies to both `app_settings` and `project_settings`)

```
r2_access_key_id · r2_secret_access_key · blob_token
media_vps_key · resend_api_key · scraper_api_key
```

### Behavior by Role

| Role | Can see key value | Can write/overwrite key |
|------|:-----------------:|:-----------------------:|
| `super_admin` | ✓ (with explicit "reveal" button) | ✓ |
| `admin` | ✗ (always masked `••••••••`) | ✓ |
| `editor` | ✗ | ✗ (no access to settings) |
| `viewer` | ✗ | ✗ |

### UI Implementation

- Sensitive fields always render as `<input type="password" value="••••••••••" />` (display mask, not actual password input)
- A "Reveal" button (👁 icon) appears **only when `isSuperAdmin === true`**; clicking it fetches the actual value via a separate server action and replaces the mask temporarily
- Admins see: greyed-out input with `••••••••` + an "Update" button that opens a separate edit-only field (no read-back of current value)
- Server action `getSettingValue(key)` throws `FORBIDDEN` unless caller is `super_admin`
- Server action `setSetting(key, value)` is allowed for admins on their permitted sections

### Server Action Pattern

```typescript
// lib/actions/settings.actions.ts

// ONLY super_admin can read raw value
export async function getSettingValue(key: string, projectId?: string): Promise<string> {
  const session = await auth()
  if (!session?.user.isSuperAdmin) throw new Error('FORBIDDEN')
  if (projectId) {
    return (await projectSettingsRepository.get(projectId, key)) ?? ''
  }
  return (await getSetting(key)) ?? ''
}

// Admin + super_admin can write; admin cannot read back
export async function updateSetting(key: string, value: string, projectId?: string): Promise<void> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  // Section permission check happens in the existing settings gate
  if (projectId) {
    await projectSettingsRepository.set(projectId, key, value, session.user.id)
  } else {
    await setSetting(key, value, session.user.id)
  }
}
```

---

## Data Isolation Checklist (Pre-Launch Verification)

Before shipping, run the following query on a test DB with 2 projects and cross-verify:

```sql
-- Verify no node is accessible without correct project_id
SELECT count(*) FROM nodes WHERE project_id IS NULL;
-- Must be 0.

-- Verify no media is accessible without correct project_id
SELECT count(*) FROM media WHERE project_id IS NULL;
-- Must be 0.

-- Verify memberships backfill
SELECT count(*) FROM project_memberships;
-- Must equal previous users_roles count.
```

---

## Acceptance Criteria

- [ ] `project` table is no longer treated as a singleton; multiple rows can coexist
- [ ] `project.owner_id` FK exists and is populated for all projects
- [ ] `nodes.project_id` FK exists, is NOT NULL, indexed, and backfilled from existing data
- [ ] `media.project_id` FK exists, is NOT NULL, indexed, and backfilled
- [ ] `project_memberships` table created; existing users migrated via `users_roles` backfill
- [ ] `project_settings` table created with project-scoped key-value override capability
- [ ] `project_invitations` table created (used in MP-03)
- [ ] `Session.user.currentProjectId` is present in JWT and session types
- [ ] `requireProjectId()` helper throws `NO_PROJECT_CONTEXT` if session has no project
- [ ] `assertProjectAccess()` throws `FORBIDDEN` if user is not a member (super admins bypass)
- [ ] All `nodes.*` repository methods accept and filter by `projectId`
- [ ] All `media.*` repository methods accept and filter by `projectId`
- [ ] `projectSettingsRepository.get()` follows priority: project_settings → app_settings → env
- [ ] `createProjectService()` creates project row + admin membership atomically
- [ ] `switchProject()` action verifies membership before updating session
- [ ] `getMyProjects()` returns only projects the current user is a member of (super admin: all)
- [ ] TypeScript compiles with zero errors after all schema/type changes
- [ ] Existing single-project data is 100% preserved and queryable after migration
- [ ] No orphaned nodes/media exist after migration (all have valid project_id)
- [ ] Super admin can access any project regardless of membership
- [ ] Project A data is never returned when session has Project B context (integration test with 2 projects)
- [ ] Each project capsule independently stores: language (`default_locale`), theme, members, and API overrides in `project_settings`
- [ ] DB export action scoped to `currentProjectId`; cannot export all projects in one call
- [ ] DB export excludes global tables (`users`, `roles`, `app_settings`, `project_memberships`)
- [ ] Export action throws `NO_PROJECT_CONTEXT` if session has no active project
- [ ] Sensitive API key fields in settings UI always render masked (`••••••••`) for all roles
- [ ] "Reveal" button on sensitive fields appears ONLY when `isSuperAdmin === true`
- [ ] `getSettingValue()` action throws `FORBIDDEN` for non-super_admin callers
- [ ] Admin can overwrite (write-only) sensitive keys via `updateSetting()` without being able to read current value
- [ ] Policy applies to both global `app_settings` and per-project `project_settings`
