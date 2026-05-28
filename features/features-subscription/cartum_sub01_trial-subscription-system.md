# SUB-01 — Trial Subscription System

## Goal

Add a **7-day trial subscription system** to Cartum. Every new user (except `super_admin`) gets a trial that starts at account creation. When the trial expires — or is manually revoked — Tier 2 features (VPS Optimus image optimization, web scraper) are blocked for that user. A permanent email registry prevents trial resets via delete + re-register abuse.

---

## Prerequisites

- Foundation auth (users table, usersRepository) implemented
- MP-01 multi-project capsule architecture in place
- `isSuperAdmin` column on `users` table

---

## Architecture Decision

### Options Evaluated

| Approach | Notes | Decision |
|---|---|---|
| **Cron job flips boolean** | Requires external scheduler; serverless-hostile | ❌ Rejected |
| **Postgres trigger on login** | Writes on every auth; expensive at scale | ❌ Rejected |
| **Computed column (always SQL)** | No manual override possible | ❌ Rejected |
| **`cartum_suscriptor_time` + arithmetic on access** | Zero infra, serverless-perfect, pure math | ✅ Selected |

### Two-Column Design

```
cartum_suscriptor       BOOLEAN  — manual admin flag (false = force-block regardless of time)
cartum_suscriptor_time  BIGINT   — unix seconds, immutable after first set, = account creation time
```

**Effective access formula:**

```
hasAccess = isSuperAdmin
            || (cartum_suscriptor === true && now_unix < cartum_suscriptor_time + 7 * 86400)
```

- `cartum_suscriptor = false` → blocked regardless of time (admin revoke or manual block)
- `cartum_suscriptor = true` + time < 7 days → trial active
- `cartum_suscriptor = true` + time ≥ 7 days → trial expired → blocked
- `super_admin` → always bypasses (column ignored)

> This design intentionally leaves `cartum_suscriptor = true` even after 7 days. The boolean alone means nothing — the time column is authoritative. The boolean is only a manual kill-switch.

---

## Schema Changes

### 1. Modify `users` table

**File:** `db/schema/users.schema.ts`

```typescript
import { boolean, pgTable, text, timestamp, uuid, bigint } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  email:                  text('email').notNull().unique(),
  passwordHash:           text('password_hash').notNull(),
  isSuperAdmin:           boolean('is_super_admin').notNull().default(false),
  // --- Subscription ---
  cartumSuscriptor:       boolean('cartum_suscriptor').notNull().default(true),
  cartumSuscriptorTime:   bigint('cartum_suscriptor_time', { mode: 'number' }).notNull().default(0),
  // default(0) is placeholder; actual value is set in usersRepository.create() via Math.floor(Date.now()/1000)
  createdAt:              timestamp('created_at').defaultNow().notNull(),
})
```

> **Note:** `default(0)` on `cartumSuscriptorTime` is only a Drizzle schema declaration fallback. All actual inserts go through `usersRepository.create()` which always passes the real unix timestamp. A value of `0` would mean "trial expired since epoch" — safe behavior if somehow bypassed.

### 2. New table: `user_email_registry`

**File:** `db/schema/user-email-registry.schema.ts`

Persistent audit table. Survives any attempt to delete + recreate a user. Never deleted, never updated after first insert.

```typescript
import { pgTable, text, bigint, integer } from 'drizzle-orm/pg-core'

export const userEmailRegistry = pgTable('user_email_registry', {
  email:        text('email').primaryKey(),
  firstSeenAt:  bigint('first_seen_at', { mode: 'number' }).notNull(),
  trialStartAt: bigint('trial_start_at', { mode: 'number' }).notNull(),
  trialDays:    integer('trial_days').notNull().default(7),
})
```

**Invariants:**
- `trialStartAt` is set ONCE on first registration and never updated
- `email` is the PK — no duplicates possible
- No FK to `users` — this table is intentionally orphan-safe

### 3. Export registry in schema index

**File:** `db/schema/index.ts` — add:

```typescript
export * from './user-email-registry.schema'
```

---

## Database-Level Delete Prevention

### Postgres Trigger (enforced at DB level, not just app)

Added to migration SQL. Prevents any `DELETE FROM users` — even direct SQL from the Drizzle client or Neon console.

```sql
CREATE OR REPLACE FUNCTION prevent_users_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'Users cannot be deleted from the cartum system. Use cartum_suscriptor = false to revoke access.'
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_delete_users
BEFORE DELETE ON users
FOR EACH ROW EXECUTE FUNCTION prevent_users_delete();
```

> **Why trigger and not RULE?** A Postgres RULE with `DO INSTEAD NOTHING` silently swallows deletes — hard to debug. A trigger raises an explicit exception that surfaces in logs and app errors.

---

## Drizzle Migration

**File:** `db/migrations/0021_subscription_trial.sql`

```sql
-- Add subscription columns to users
ALTER TABLE users
  ADD COLUMN cartum_suscriptor       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN cartum_suscriptor_time  BIGINT  NOT NULL DEFAULT 0;

-- Backfill existing users: use created_at converted to unix ts
UPDATE users
SET cartum_suscriptor_time = EXTRACT(EPOCH FROM created_at)::BIGINT
WHERE cartum_suscriptor_time = 0;

-- Email registry table
CREATE TABLE user_email_registry (
  email          TEXT    PRIMARY KEY,
  first_seen_at  BIGINT  NOT NULL,
  trial_start_at BIGINT  NOT NULL,
  trial_days     INTEGER NOT NULL DEFAULT 7
);

-- Populate registry from existing users (one-time migration)
INSERT INTO user_email_registry (email, first_seen_at, trial_start_at, trial_days)
SELECT
  email,
  EXTRACT(EPOCH FROM created_at)::BIGINT,
  EXTRACT(EPOCH FROM created_at)::BIGINT,
  7
FROM users
ON CONFLICT (email) DO NOTHING;

-- Delete prevention trigger
CREATE OR REPLACE FUNCTION prevent_users_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'Users cannot be deleted from the cartum system. Use cartum_suscriptor = false to revoke access.'
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_delete_users
BEFORE DELETE ON users
FOR EACH ROW EXECUTE FUNCTION prevent_users_delete();
```

---

## Repository Changes

### `usersRepository` — updated `create()`

**File:** `db/repositories/users.repository.ts`

```typescript
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users, usersRoles, userEmailRegistry } from '@/db/schema'

type UserRow = typeof users.$inferSelect

// ... existing findById, findByEmail, updatePassword, assignRole, removeRole, isSuperAdmin unchanged

async function create(input: {
  email: string
  passwordHash: string
  isSuperAdmin?: boolean
}): Promise<UserRow> {
  const nowUnix = Math.floor(Date.now() / 1000)

  // Check registry for pre-existing trial info (anti-abuse)
  const [existing] = await db
    .select()
    .from(userEmailRegistry)
    .where(eq(userEmailRegistry.email, input.email))
    .limit(1)

  const trialStart = existing?.trialStartAt ?? nowUnix

  // Upsert registry — if first time, create entry; if returning user, DO NOTHING (preserve original)
  await db
    .insert(userEmailRegistry)
    .values({
      email:        input.email,
      firstSeenAt:  nowUnix,
      trialStartAt: trialStart, // uses original if exists
      trialDays:    7,
    })
    .onConflictDoNothing() // email already in registry → keep original trialStartAt

  const [row] = await db
    .insert(users)
    .values({
      ...input,
      cartumSuscriptor:     true,
      cartumSuscriptorTime: trialStart, // original trial start, not reset
    })
    .returning()

  return row
}

// New: admin set suscriptor manually
async function setSubscription(userId: string, active: boolean): Promise<void> {
  await db.update(users)
    .set({ cartumSuscriptor: active })
    .where(eq(users.id, userId))
}

export const usersRepository = {
  findById,
  findByEmail,
  create,
  updatePassword,
  assignRole,
  removeRole,
  isSuperAdmin,
  setSubscription, // new
}
```

---

## Subscription Check Helper

**File:** `lib/subscription.ts`

```typescript
import { type users } from '@/db/schema'

type UserRow = typeof users.$inferSelect

const TRIAL_DAYS = 7
const TRIAL_SECONDS = TRIAL_DAYS * 86_400

/**
 * Returns true if the user has active Tier2 access.
 * super_admin always returns true.
 * Never throws — safe to call in middleware and server actions.
 */
export function hasTier2Access(user: Pick<UserRow, 'isSuperAdmin' | 'cartumSuscriptor' | 'cartumSuscriptorTime'>): boolean {
  if (user.isSuperAdmin) return true
  if (!user.cartumSuscriptor) return false
  const nowUnix = Math.floor(Date.now() / 1000)
  return nowUnix < user.cartumSuscriptorTime + TRIAL_SECONDS
}

/**
 * Returns remaining trial seconds. Negative = expired.
 * Returns Infinity for super_admin.
 */
export function trialRemainingSeconds(user: Pick<UserRow, 'isSuperAdmin' | 'cartumSuscriptorTime'>): number {
  if (user.isSuperAdmin) return Infinity
  const nowUnix = Math.floor(Date.now() / 1000)
  return user.cartumSuscriptorTime + TRIAL_SECONDS - nowUnix
}

/**
 * Returns days remaining (rounded down). 0 = last day or expired.
 */
export function trialRemainingDays(user: Pick<UserRow, 'isSuperAdmin' | 'cartumSuscriptorTime'>): number {
  const secs = trialRemainingSeconds(user)
  if (secs === Infinity) return Infinity
  return Math.max(0, Math.floor(secs / 86_400))
}
```

---

## Tier2 Access Gate

All Tier 2 server actions must call `assertTier2Access()` before processing.

### Gate helper

**File:** `lib/subscription.ts` (add to same file)

```typescript
import { auth } from '@/lib/auth'
import { usersRepository } from '@/db/repositories/users.repository'

export async function assertTier2Access(): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHENTICATED')

  const user = await usersRepository.findById(session.user.id)
  if (!user) throw new Error('USER_NOT_FOUND')

  if (!hasTier2Access(user)) {
    throw new Error('TIER2_SUBSCRIPTION_REQUIRED')
  }
}
```

### Where to add the gate

**VPS Optimus (image optimization):**

`lib/actions/media.actions.ts` — inside `optimizeImageVps()` and any Tier2 compression action:

```typescript
'use server'

import { assertTier2Access } from '@/lib/subscription'

export async function optimizeImageVps(payload: OptimizePayload) {
  await assertTier2Access()
  // ... existing logic
}
```

**Web scraper:**

`lib/actions/scraper.actions.ts` — inside `scrapeUrl()` and `scrapeAll()`:

```typescript
'use server'

import { assertTier2Access } from '@/lib/subscription'

export async function scrapeUrl(url: string) {
  await assertTier2Access()
  // ... existing logic
}
```

---

## Anti-Abuse: Delete + Re-Register Flow

```
New registration attempt for email X
        │
        ▼
Check user_email_registry WHERE email = X
        │
   ┌────┴────────────────────────────┐
   │ NOT found                       │ FOUND
   │ → fresh user                    │ → returning user
   │ → trialStart = now()            │ → trialStart = registry.trial_start_at (original)
   │ → insert registry               │ → DO NOTHING on registry (onConflictDoNothing)
   └────────────────────────────────┘
        │
        ▼
Insert user with trialStart (original or new)
        │
        ▼
User sees remaining trial time from ORIGINAL registration date
→ delete + re-register does NOT reset the 7-day clock
```

**Result:** A user who registered on Day 1, deleted on Day 3, and re-registered on Day 6 will see 1 day remaining — not a fresh 7 days.

---

## Settings UI — Subscription Management

Super admin can view and manage subscription status for any user.

### Settings > Users table (super_admin only)

Add two columns to the existing users table in Settings:

| Column | Display |
|---|---|
| **Suscripción** | Badge: `Trial activo (N días)` / `Trial vencido` / `Bloqueado` / `Super Admin` |
| **Acción** | Button: `Activar` / `Revocar` (toggle `cartum_suscriptor`) |

### Badge logic (client)

```typescript
function getSubscriptionBadge(user: UserRow) {
  if (user.isSuperAdmin) return { label: 'Super Admin', variant: 'special' }
  if (!user.cartumSuscriptor) return { label: 'Bloqueado', variant: 'danger' }
  const days = trialRemainingDays(user)
  if (days <= 0) return { label: 'Trial vencido', variant: 'warning' }
  return { label: `Trial · ${days}d`, variant: 'success' }
}
```

---

## Locale Additions

**`locales/en.ts`** — add to `settings` section:

```typescript
subscription: {
  trialActive:  'Trial · {days}d left',
  trialExpired: 'Trial expired',
  blocked:      'Blocked',
  superAdmin:   'Super Admin',
  activate:     'Activate',
  revoke:       'Revoke',
  tier2Blocked: 'This feature requires an active subscription.',
}
```

**`locales/es.ts`** — add to `settings` section:

```typescript
subscription: {
  trialActive:  'Trial · {days}d restantes',
  trialExpired: 'Trial vencido',
  blocked:      'Bloqueado',
  superAdmin:   'Super Admin',
  activate:     'Activar',
  revoke:       'Revocar',
  tier2Blocked: 'Esta función requiere una suscripción activa.',
}
```

---

## Error Handling in UI

When a Tier2 server action throws `TIER2_SUBSCRIPTION_REQUIRED`, the client should render a dismissible banner using the `tier2Blocked` locale string. No redirect — just inline feedback.

Pattern in any client component that calls a Tier2 action:

```typescript
const result = await optimizeImageVps(payload)
if (result?.error === 'TIER2_SUBSCRIPTION_REQUIRED') {
  toast.error(t.settings.subscription.tier2Blocked)
  return
}
```

---

## Acceptance Criteria

- [ ] `users` table has `cartum_suscriptor (boolean, default true)` and `cartum_suscriptor_time (bigint)` columns
- [ ] All new users created with `cartum_suscriptor_time = Math.floor(Date.now()/1000)`
- [ ] `super_admin` bypasses all subscription checks — no columns needed but columns exist with safe defaults
- [ ] Trial expires after exactly 7 days (604800 seconds) from `cartum_suscriptor_time`
- [ ] `cartum_suscriptor = false` blocks access regardless of time remaining
- [ ] `user_email_registry` table created and populated on migration
- [ ] Re-registering with same email does NOT reset `trial_start_at` in registry
- [ ] Re-registered user gets `cartum_suscriptor_time` from original registry entry (not current time)
- [ ] `DELETE FROM users` throws Postgres exception at DB level (trigger active)
- [ ] `optimizeImageVps()` and all Tier2 VPS actions call `assertTier2Access()` first
- [ ] `scrapeUrl()` and all scraper actions call `assertTier2Access()` first
- [ ] Super admin Settings > Users shows subscription badge per user
- [ ] Super admin can toggle `cartum_suscriptor` via `setSubscription()` action
- [ ] Client shows `tier2Blocked` message (not crash) when subscription gate throws
- [ ] `hasTier2Access()` helper is pure, synchronous, and has no side effects
- [ ] Existing users backfilled with `cartum_suscriptor_time` = unix of `created_at` on migration

---

## Files to Create / Modify

| File | Action |
|---|---|
| `db/schema/users.schema.ts` | Add 2 columns |
| `db/schema/user-email-registry.schema.ts` | **New** |
| `db/schema/index.ts` | Export new schema |
| `db/migrations/0021_subscription_trial.sql` | **New** |
| `db/repositories/users.repository.ts` | Update `create()`, add `setSubscription()` |
| `lib/subscription.ts` | **New** — `hasTier2Access`, `assertTier2Access`, helpers |
| `lib/actions/media.actions.ts` | Add gate to Tier2 actions |
| `lib/actions/scraper.actions.ts` | Add gate to scraper actions |
| `locales/en.ts` | Add subscription keys |
| `locales/es.ts` | Add subscription keys |
| `components/ui/organisms/SettingsPanel.tsx` | Add subscription badge + toggle to users table |
