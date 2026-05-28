# SUB-02 — Database Reset Tiers

## Goal

Define two distinct reset operations with different blast radii:

| Reset | Who | What survives | What dies |
|---|---|---|---|
| **Project Reset** | Admin (non-super_admin) | users, roles, email registry | project data + config |
| **Full Reset** | super_admin only | nothing | everything (including email registry) |

After a **Project Reset**, the app detects "super_admin exists but no project" and routes the still-authenticated admin through an abbreviated setup wizard (locale → project config) — skipping system check and credentials steps. The user's session and trial time are fully preserved.

After a **Full Reset**, behavior is identical to today: no super_admin → `/setup` full wizard from Step 0.

---

## Prerequisites

- SUB-01 (subscription columns + delete trigger + user_email_registry)
- Foundation auth + setup wizard (parts 03, 04)
- `db.actions.ts` `resetCmsAction()` implemented

---

## Architecture: Setup State Machine

`checkSetupComplete()` currently returns `boolean`. Needs to return a **state enum** so middleware can route to the correct entry point.

```
SetupState
  'complete'        → super_admin ✅  project ✅  roles ✅
  'no_superadmin'   → super_admin ❌                         → /setup (full wizard)
  'no_project'      → super_admin ✅  project ❌             → /setup/locale (abbreviated)
```

The `roles` check becomes secondary: if super_admin exists but roles are gone, treat as `no_project` (roles will be re-seeded during `/setup/initializing` or at project setup completion).

---

## Delete Trigger — Bypass for Full Reset

SUB-01 adds a Postgres trigger that blocks `DELETE FROM users`. The super_admin full reset needs to delete users. Solution: **`SET LOCAL` transaction variable** — Postgres-native, transaction-scoped, auto-reverts on commit/rollback.

### Updated trigger function (replaces SUB-01 version)

```sql
CREATE OR REPLACE FUNCTION prevent_users_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Escape hatch for authorized full resets (transaction-scoped only)
  IF current_setting('cartum.allow_user_delete', true) = 'true' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'Users cannot be deleted from cartum. Use cartum_suscriptor = false to revoke access.'
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
```

`current_setting('cartum.allow_user_delete', true)` — the second arg `true` means "return empty string if missing" (no exception). So by default the guard is active. The `SET LOCAL` call sets it only within the current transaction.

---

## 1. Project Reset (`resetProjectAction`)

### What it deletes

```
DELETES:
  media               (storage files + DB rows)
  emailOtpCodes
  passwordResetTokens
  apiTokens
  nodeRelations
  records
  fieldMeta
  nodes
  rolePermissions
  roleSectionPermissions
  appSettings
  project             ← KEY: triggers "no_project" state in middleware

PRESERVES (never touched):
  users               ← session stays alive
  roles               ← usersRoles intact
  usersRoles
  user_email_registry ← trial data survives
```

### Auth requirement

Any authenticated user with `admin` role or higher (NOT restricted to super_admin).

> **Rationale:** This is scoped to project data only. The admin built the project and should be able to wipe it. Super_admin has the full reset for a complete wipe.

### Server action

**File:** `lib/actions/db.actions.ts` — add alongside `resetCmsAction`:

```typescript
export async function resetProjectAction(): Promise<ActionResult<{ storagePurge: StoragePurgeResult } | null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  // Must have at least admin role (not viewer/editor)
  const isAdmin = session.user.isSuperAdmin ||
    (session.user.roles ?? []).includes('admin')
  if (!isAdmin) return { success: false, error: 'Unauthorized' }

  try {
    // Purge storage BEFORE wiping DB rows
    const storagePurge = await purgeAllMediaStorage()

    // FK-safe deletion order — preserves users, roles, usersRoles, email registry
    await safeDelete(media)
    await safeDelete(emailOtpCodes)
    await safeDelete(passwordResetTokens)
    await safeDelete(apiTokens)
    await safeDelete(nodeRelations)
    await safeDelete(records)
    await safeDelete(fieldMeta)
    await safeDelete(nodes)
    await safeDelete(rolePermissions)
    await safeDelete(roleSectionPermissions)
    await safeDelete(appSettings)
    await safeDelete(project)        // ← triggers "no_project" detection

    // DO NOT clear cookies — session stays valid (user still exists)
    // Middleware will detect no project row → redirect to /setup/locale

    return { success: true, data: { storagePurge } }
  } catch {
    return { success: false, error: 'db_error' }
  }
}
```

### Session after project reset

The admin's session cookie is still valid. Their `users` row still exists. On the next navigation, middleware calls `/api/internal/setup-status` → detects `no_project` → redirects to `/setup/locale`. The admin is still "logged in" from Auth.js perspective and will skip the credentials step naturally.

---

## 2. Full Reset (`resetCmsAction`) — Updated

### New: delete `user_email_registry`

The existing `resetCmsAction` must explicitly delete `user_email_registry` after the new table is created (SUB-01 migration). Super_admin deletes everything — no exceptions.

```typescript
// In resetCmsAction, after safeDelete(users):
await safeDelete(userEmailRegistry)   // ← NEW: super_admin wipes the email audit trail too
```

### New: bypass delete trigger for `users`

```typescript
// In resetCmsAction, wrap user deletion in a transaction with the bypass:
import { sql } from 'drizzle-orm'

// Replace: await safeDelete(users)
// With:
await db.transaction(async (tx) => {
  await tx.execute(sql`SET LOCAL "cartum.allow_user_delete" = 'true'`)
  await tx.delete(users)
})
await safeDelete(userEmailRegistry)
```

> **Why outside the transaction for registry?** `userEmailRegistry` has no delete trigger — no bypass needed. Keeping it outside is simpler.

### Full updated deletion sequence in `resetCmsAction`

```typescript
await safeDelete(media)
await safeDelete(emailOtpCodes)
await safeDelete(passwordResetTokens)
await safeDelete(apiTokens)
await safeDelete(nodeRelations)
await safeDelete(records)
await safeDelete(fieldMeta)
await safeDelete(nodes)
await safeDelete(usersRoles)
await safeDelete(rolePermissions)
await safeDelete(roleSectionPermissions)
await safeDelete(appSettings)
await safeDelete(project)
await safeDelete(roles)

// Users require trigger bypass
await db.transaction(async (tx) => {
  await tx.execute(sql`SET LOCAL "cartum.allow_user_delete" = 'true'`)
  await tx.delete(users)
})

// Email registry: no trigger, delete freely
await safeDelete(userEmailRegistry)

// Clear cookies (session invalid — no users table)
// ... existing cookie clearing code
```

---

## 3. `checkSetupComplete` — Updated Return Type

**File:** `db/adapters/check-setup.ts`

```typescript
export type SetupState = 'complete' | 'no_superadmin' | 'no_project'

export async function checkSetupComplete(): Promise<SetupState> {
  try {
    const [adminRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isSuperAdmin, true))
      .limit(1)

    if (!adminRow) return 'no_superadmin'

    const [projectRow] = await db
      .select({ id: project.id })
      .from(project)
      .limit(1)

    if (!projectRow) return 'no_project'

    return 'complete'
  } catch {
    return 'no_superadmin'  // safe fallback: treat unknown state as unconfigured
  }
}
```

> Roles check removed. If super_admin and project exist, treat as complete — roles are auto-seeded if missing.

---

## 4. `/api/internal/setup-status` — Updated

**File:** `app/api/internal/setup-status/route.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkSetupComplete } from '@/db/adapters/check-setup'

export async function GET(req: NextRequest) {
  if (req.headers.get('x-internal') !== '1') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const state = await checkSetupComplete()
    return NextResponse.json({
      complete: state === 'complete',
      state,
    })
  } catch {
    return NextResponse.json({ complete: false, state: 'no_superadmin' })
  }
}
```

---

## 5. `proxy.ts` — Updated Routing

**File:** `proxy.ts`

```typescript
// Replace the existing setup-status fetch + redirect block:

const checkUrl = new URL('/api/internal/setup-status', req.url)
let setupComplete = false
let setupState: 'complete' | 'no_superadmin' | 'no_project' = 'no_superadmin'

try {
  const res = await fetch(checkUrl, { headers: { 'x-internal': '1' } })
  if (res.ok) {
    const json = (await res.json()) as { complete: boolean; state: typeof setupState }
    setupComplete = json.complete
    setupState    = json.state ?? 'no_superadmin'
  }
} catch {
  setupComplete = false
  setupState    = 'no_superadmin'
}

if (!setupComplete && !isSetupRoute) {
  // Route to correct entry point based on what's missing
  const target = setupState === 'no_project' ? '/setup/locale' : '/setup'
  return NextResponse.redirect(new URL(target, req.url))
}

if (setupComplete && isSetupRoute) {
  return NextResponse.redirect(new URL('/cms/board', req.url))
}
```

---

## 6. `/setup/credentials` — Skip if Super Admin Exists

When an admin does a project reset and navigates the abbreviated wizard, they reach `/setup/locale` → then would normally go to `/setup/credentials`. But credentials already exist.

**File:** `app/setup/credentials/page.tsx` — add server-side guard at top:

```typescript
import { checkSetupComplete } from '@/db/adapters/check-setup'
import { redirect } from 'next/navigation'

export default async function CredentialsPage() {
  const state = await checkSetupComplete()

  // Super admin already exists — skip credentials, go straight to project config
  if (state === 'no_project') {
    redirect('/setup/project')
  }

  // If fully complete, don't show setup at all
  if (state === 'complete') {
    redirect('/cms/board')
  }

  // ... rest of page (normal full-wizard flow)
}
```

---

## 7. `/setup/project` — Handle Both Entry Modes

The project setup page is already reachable in two ways:
1. **Full wizard**: step 3, coming from `/setup/credentials` → super_admin was just created
2. **Admin reset**: entry via redirect from middleware (`no_project` state) → super_admin already existed

Both modes use the same form and `createProject()` server action. No changes needed to the page itself — the server action just inserts a project row and seeds `appSettings` defaults. After success it redirects to `/setup/initializing` or directly to `/cms/board` (TBD by Part 03 implementation).

The key difference is the back button:
- Full wizard mode: back → `/setup/credentials`
- Admin reset mode: no back button (nowhere to go back to)

Detect mode via query param or by checking `checkSetupComplete()` state inside the page:

```typescript
const state = await checkSetupComplete()
const isAbbreviatedWizard = state === 'no_project'
// isAbbreviatedWizard === true → hide back button, show different subtitle
```

---

## 8. Settings UI — Two Reset Buttons

In Settings → Danger Zone:

```
┌──────────────────────────────────────────────────────┐
│ ZONA DE PELIGRO                                      │
│                                                      │
│ Reiniciar proyecto                                   │
│ Elimina todos los nodos, registros, media y          │
│ configuración del proyecto. Tu cuenta y los datos    │
│ de suscripción se conservan. El CMS pedirá           │
│ reconfigurarse.                                      │
│ [Reiniciar proyecto]    ← admin role minimum         │
│                                                      │
│ ───────────────────── (solo super_admin) ─────────── │
│                                                      │
│ Restaurar sistema completo                           │
│ Elimina ABSOLUTAMENTE TODO incluyendo usuarios,      │
│ correos registrados y datos de suscripción.          │
│ Esta operación es irreversible.                      │
│ [Restaurar sistema completo]  ← super_admin only     │
└──────────────────────────────────────────────────────┘
```

Locale keys:

```typescript
// locales/en.ts — settings.danger
resetProject:         'Reset project',
resetProjectDesc:     'Deletes all nodes, records, media and project config. Your account and subscription data are preserved. The CMS will ask to be reconfigured.',
resetProjectBtn:      'Reset project',
resetSystem:          'Full system restore',
resetSystemDesc:      'Deletes EVERYTHING including users, registered emails and subscription data. This action is irreversible.',
resetSystemBtn:       'Full system restore',
```

---

## Flow Diagrams

### Admin Project Reset

```
Admin clicks "Reiniciar proyecto"
        ↓
Confirm dialog (double confirm: type "REINICIAR")
        ↓
resetProjectAction()
  - purge storage
  - delete content + project config
  - PRESERVE users, roles, user_email_registry
        ↓
redirect() NOT called — client reloads
        ↓
Next request → proxy calls /api/internal/setup-status
        ↓
checkSetupComplete() → 'no_project'
        ↓
proxy redirects → /setup/locale
        ↓
Admin selects language (still logged in — session valid)
        ↓
/setup/credentials → detects 'no_project' → redirect /setup/project
        ↓
Admin configures project name/description
        ↓
createProject() → inserts project row
        ↓
/setup/initializing → seeds roles/permissions
        ↓
/setup/ready → /cms/board
        ↓
Admin is back, trial time UNCHANGED, project reconfigured
```

### Super Admin Full Reset

```
Super admin clicks "Restaurar sistema completo"
        ↓
Confirm dialog (type "RESTAURAR COMPLETO")
        ↓
resetCmsAction()
  - purge storage
  - delete all tables in FK-safe order
  - SET LOCAL allow_user_delete = 'true' → delete users
  - delete user_email_registry (no trigger)
  - clear cookies
        ↓
redirect → /setup (full wizard from Step 0)
        ↓
New super admin, new project, fresh trial system
```

---

## Acceptance Criteria

- [ ] `resetProjectAction()` exists and requires at least admin role
- [ ] `resetProjectAction()` deletes project, content, settings, media — but NOT users, roles, usersRoles, user_email_registry
- [ ] `resetProjectAction()` does NOT clear cookies (session remains valid)
- [ ] After project reset, middleware detects `no_project` → redirects to `/setup/locale`
- [ ] Admin reaches `/setup/locale` still authenticated (no re-login required)
- [ ] `/setup/credentials` detects `no_project` state → redirects to `/setup/project` automatically
- [ ] `/setup/project` works correctly in both entry modes (full wizard + admin reset)
- [ ] `/setup/project` shows no back button in admin reset mode
- [ ] `checkSetupComplete()` returns `'no_project'` when super_admin exists but project row is missing
- [ ] `checkSetupComplete()` returns `'no_superadmin'` when no super_admin exists
- [ ] `/api/internal/setup-status` returns `{ complete, state }` (not just `{ complete }`)
- [ ] `proxy.ts` routes to `/setup/locale` for `no_project`, `/setup` for `no_superadmin`
- [ ] `resetCmsAction()` (super_admin) wraps user deletion in transaction with `SET LOCAL "cartum.allow_user_delete" = 'true'`
- [ ] `resetCmsAction()` deletes `user_email_registry` explicitly
- [ ] Delete trigger updated with `current_setting('cartum.allow_user_delete', true)` bypass check
- [ ] Settings Danger Zone shows two separate reset buttons with correct role guards
- [ ] Admin's `cartum_suscriptor_time` is unchanged after project reset
- [ ] Admin's entry in `user_email_registry` is unchanged after project reset

---

## Files to Create / Modify

| File | Action |
|---|---|
| `lib/actions/db.actions.ts` | Add `resetProjectAction()`, update `resetCmsAction()` |
| `db/adapters/check-setup.ts` | Return `SetupState` enum instead of `boolean` |
| `app/api/internal/setup-status/route.ts` | Return `{ complete, state }` |
| `proxy.ts` | Route `no_project` → `/setup/locale`, `no_superadmin` → `/setup` |
| `app/setup/credentials/page.tsx` | Add `no_project` guard → redirect to `/setup/project` |
| `app/setup/project/page.tsx` | Detect abbreviated-wizard mode, hide back button |
| `locales/en.ts` | Add `settings.danger.resetProject*` keys |
| `locales/es.ts` | Add same keys in Spanish |
| `db/migrations/0021_subscription_trial.sql` | Update trigger function to include `SET LOCAL` bypass |
| `components/ui/organisms/SettingsPanel.tsx` | Add both reset buttons to Danger Zone |
