# SUB-03 — Trial Badge UI + Storage Provider Restrictions

## Goal

1. **Trial badge in TopBar** — show remaining trial days (⏱ N) or "Free Tier" next to the avatar button. Super_admin sees nothing.
2. **Storage restriction** — non-super_admin users can only configure and use Cloudflare R2. The Vercel Blob accordion and provider selector are hidden for them in Settings → Storage.

---

## Prerequisites

- SUB-01 (`cartumSuscriptor`, `cartumSuscriptorTime` on users table, `hasTier2Access()` helper)
- `TopBar` + `DesktopLayout` + `MobileLayout` implemented
- `StorageSection` component in `components/ui/organisms/settings/StorageSection.tsx`
- Auth.js v5 JWT session

---

## Part 1 — Trial Badge in TopBar

### 1.1 JWT Session Extension

**File:** `auth.ts` (or wherever `jwt` callback is defined)

Add subscription fields to the token so `cms/layout.tsx` doesn't need an extra DB query per request. Subscription data is cosmetic in the header — slight staleness (up to JWT expiry) is acceptable. The actual access gate (`assertTier2Access()`) re-reads from DB on each server action call.

```typescript
// In jwt() callback — when user logs in or token refreshes:
token.cartumSuscriptor     = user.cartumSuscriptor     // boolean
token.cartumSuscriptorTime = user.cartumSuscriptorTime // number (unix seconds)

// In session() callback:
session.user.cartumSuscriptor     = token.cartumSuscriptor     as boolean
session.user.cartumSuscriptorTime = token.cartumSuscriptorTime as number
```

**TypeScript declaration extension** — `types/next-auth.d.ts` (or equivalent):

```typescript
declare module 'next-auth' {
  interface Session {
    user: {
      // ... existing fields
      cartumSuscriptor:     boolean
      cartumSuscriptorTime: number
    }
  }
  interface JWT {
    cartumSuscriptor?:     boolean
    cartumSuscriptorTime?: number
  }
}
```

### 1.2 `cms/layout.tsx` — Read and Pass Subscription Props

**File:** `app/cms/layout.tsx`

```typescript
// After existing session destructuring, add:
const cartumSuscriptor     = session.user.cartumSuscriptor     ?? true
const cartumSuscriptorTime = session.user.cartumSuscriptorTime ?? 0

// Pass to both DesktopLayout and MobileLayout:
<DesktopLayout
  ...existing props...
  cartumSuscriptor={cartumSuscriptor}
  cartumSuscriptorTime={cartumSuscriptorTime}
>
```

### 1.3 `DesktopLayout` + `MobileLayout` — Prop Thread

**File:** `components/ui/layouts/DesktopLayout.tsx`

```typescript
export type DesktopLayoutProps = {
  // ... existing props
  cartumSuscriptor:     boolean   // NEW
  cartumSuscriptorTime: number    // NEW
}

export function DesktopLayout({
  // ... existing
  cartumSuscriptor,
  cartumSuscriptorTime,
}: DesktopLayoutProps) {
  return (
    <div ...>
      <TopBar
        projectName={projectName}
        userInitials={userInitials}
        isSuperAdmin={isSuperAdmin}
        cartumSuscriptor={cartumSuscriptor}
        cartumSuscriptorTime={cartumSuscriptorTime}
      />
      ...
    </div>
  )
}
```

Same changes for `MobileLayout.tsx`.

### 1.4 `TopBar` — Trial Badge

**File:** `components/ui/organisms/TopBar.tsx`

```typescript
import { Clock } from 'lucide-react'
import { trialRemainingDays } from '@/lib/subscription'

export type TopBarProps = {
  projectName:          string
  userInitials:         string
  isSuperAdmin:         boolean    // NEW
  cartumSuscriptor:     boolean    // NEW
  cartumSuscriptorTime: number     // NEW
}

export function TopBar({
  projectName,
  userInitials,
  isSuperAdmin,
  cartumSuscriptor,
  cartumSuscriptorTime,
}: TopBarProps) {
  const d = useUIStore((s) => s.cmsDict)

  // Compute trial status client-side from JWT values
  const daysLeft = isSuperAdmin
    ? null
    : trialRemainingDays({ isSuperAdmin, cartumSuscriptorTime })

  const trialActive = !isSuperAdmin && cartumSuscriptor && daysLeft !== null && daysLeft > 0

  return (
    <header className="relative z-40 flex h-10 items-center justify-between border-b border-border bg-surface px-4 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        ...
      </div>

      {/* Center breadcrumb — unchanged */}

      {/* Right: trial badge + avatar */}
      <div className="flex items-center gap-2">

        {/* Trial badge — hidden for super_admin */}
        {!isSuperAdmin && (
          trialActive ? (
            <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] text-amber-400 select-none">
              <Clock size={10} className="shrink-0" />
              {daysLeft}
            </span>
          ) : (
            <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-muted select-none">
              {d?.topBar.freeTier ?? 'Free Tier'}
            </span>
          )
        )}

        {/* Avatar button — unchanged */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 border border-primary/40 text-primary font-mono text-[13px] cursor-pointer hover:bg-primary/30 transition-colors"
            aria-label={d?.topBar.userMenuAriaLabel ?? 'User menu'}
          >
            {userInitials}
          </button>
          {menuOpen && (
            ...existing dropdown...
          )}
        </div>
      </div>
    </header>
  )
}
```

### 1.5 Badge Visual Spec

```
Trial active (N days left):
  ┌──────────────┐
  │ ⏱ 7          │  amber-500 tint, border amber-500/30, text amber-400
  └──────────────┘

Trial expired OR cartumSuscriptor = false:
  ┌──────────────┐
  │ Free Tier    │  muted border, surface-2 bg, muted text
  └──────────────┘

Super admin:
  (nothing rendered — isSuperAdmin check gates the whole block)
```

**Edge cases:**
- `daysLeft === 0` → last day → still shows `⏱ 0` (still active for the day)
- `daysLeft < 0` → trial truly expired → shows "Free Tier"
- `cartumSuscriptor === false` → manually revoked → shows "Free Tier" regardless of days
- JWT has default `cartumSuscriptorTime = 0` (fallback from SUB-01) → days = negative → "Free Tier" (safe behavior for any edge case)

### 1.6 Locale Additions for TopBar

**`locales/en.ts`** — in `cms.topBar`:

```typescript
topBar: {
  // ... existing keys
  freeTier: 'Free Tier',
  trialDays: '{days}d left',  // for tooltip if added later
}
```

**`locales/es.ts`** — in `cms.topBar`:

```typescript
topBar: {
  // ... existing keys
  freeTier: 'Tier Gratuito',
  trialDays: '{days}d restantes',
}
```

---

## Part 2 — Storage Provider Restrictions

### Design Decision

Non-super_admin users (admins) can **only** use Cloudflare R2. Vercel Blob requires infra-level credentials that are typically shared across projects and should only be managed by the instance owner (super_admin).

| Role | R2 | Vercel Blob |
|---|---|---|
| `super_admin` | ✅ configure + use | ✅ configure + use |
| `admin` (non-super_admin) | ✅ configure + use | ❌ hidden entirely |
| `editor` / `viewer` | ❌ no storage access | ❌ no storage access |

> Blob section is hidden in the UI — not merely disabled. Admins should not know it's an option to avoid confusion.

### 2.1 `StorageSection` — Add `isSuperAdmin` Prop

**File:** `components/ui/organisms/settings/StorageSection.tsx`

```typescript
export type StorageSectionProps = {
  d:            Dictionary['settings']['storage']
  isSuperAdmin: boolean   // NEW
}

export function StorageSection({ d, isSuperAdmin }: StorageSectionProps) {
  // ... existing state

  // Override bothConfigured for non-super_admin:
  // Even if blob is technically configured in DB, admin can't see/use it
  const bothConfigured = isSuperAdmin
    ? !!(status?.r2Configured && status?.blobConfigured)
    : false  // admin never sees the provider selector

  return (
    <div className="space-y-5">
      <h2 ...>{d.title}</h2>

      {/* Provider selector — only shown to super_admin when both configured */}
      {bothConfigured && (
        ...existing provider selector JSX, unchanged...
      )}

      {/* R2 Accordion — always visible to admins */}
      <Accordion ...>
        ...unchanged...
      </Accordion>

      {/* Blob Accordion — ONLY for super_admin */}
      {isSuperAdmin && (
        <Accordion
          open={blobOpen}
          onToggle={() => setBlobOpen((v) => !v)}
          ...
        >
          ...unchanged...
        </Accordion>
      )}

      {/* VPS Accordion — unchanged (visible to admins with storage permission) */}
      <Accordion ...>
        ...unchanged...
      </Accordion>

      {/* Save row — unchanged */}
    </div>
  )
}
```

### 2.2 `SettingsPanel` — Pass `isSuperAdmin` to StorageSection

**File:** `components/ui/organisms/SettingsPanel.tsx`

Current line (114):
```typescript
<StorageSection d={d.storage} />
```

Updated:
```typescript
<StorageSection d={d.storage} isSuperAdmin={isSuperAdmin} />
```

`isSuperAdmin` is already available in `SettingsPanel` — no prop drilling needed.

### 2.3 Server-Side Enforcement (Defense in Depth)

The UI hides Blob from admins, but server actions must also enforce this. In `settings.actions.ts`, the `updateStorageProvider` action should reject attempts to switch to `'blob'` by non-super_admin:

```typescript
export async function updateStorageProvider(provider: StorageProvider): Promise<ActionResult<null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  // Blob provider restricted to super_admin
  if (provider === 'blob' && !session.user.isSuperAdmin) {
    return { success: false, error: 'Unauthorized' }
  }

  // ... existing logic
}
```

Similarly, `updateStorageSettings` should not allow writing `blobToken` for non-super_admin:

```typescript
export async function updateStorageSettings(input: StorageSettings): Promise<ActionResult<null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  // Strip blob fields for non-super_admin
  const sanitized: StorageSettings = session.user.isSuperAdmin
    ? input
    : { ...input, blobToken: undefined }

  // ... save sanitized
}
```

---

## Files to Create / Modify

| File | Action |
|---|---|
| `auth.ts` | Add `cartumSuscriptor` + `cartumSuscriptorTime` to JWT + session callbacks |
| `types/next-auth.d.ts` | Extend Session + JWT types with subscription fields |
| `app/cms/layout.tsx` | Read subscription from session, pass to layouts |
| `components/ui/layouts/DesktopLayout.tsx` | Add subscription props, thread to TopBar |
| `components/ui/layouts/MobileLayout.tsx` | Same as DesktopLayout |
| `components/ui/organisms/TopBar.tsx` | Add trial badge (clock+days or Free Tier) |
| `components/ui/organisms/settings/StorageSection.tsx` | Add `isSuperAdmin` prop, hide Blob accordion |
| `components/ui/organisms/SettingsPanel.tsx` | Pass `isSuperAdmin` to StorageSection |
| `lib/actions/settings.actions.ts` | Guard `updateStorageProvider` + `updateStorageSettings` against non-super_admin blob access |
| `locales/en.ts` | Add `cms.topBar.freeTier` |
| `locales/es.ts` | Add `cms.topBar.freeTier` → `'Tier Gratuito'` |

---

## Acceptance Criteria

### Trial badge
- [ ] super_admin sees NO badge in TopBar (isSuperAdmin check gates entire badge block)
- [ ] Admin with active trial sees `⏱ N` badge (amber tint) where N = days remaining (integer, floor)
- [ ] Admin on last day sees `⏱ 0` (still amber — still within the trial day)
- [ ] Admin with expired trial sees `Free Tier` badge (muted style)
- [ ] Admin with `cartumSuscriptor = false` sees `Free Tier` badge regardless of days
- [ ] Badge sits to the left of the avatar button, right-aligned
- [ ] Badge uses locale string: `'Free Tier'` (en) / `'Tier Gratuito'` (es)
- [ ] Badge is `select-none` (not selectable by click-drag)
- [ ] Badge renders on both DesktopLayout and MobileLayout

### Storage restrictions
- [ ] Non-super_admin does NOT see the Vercel Blob accordion in Settings → Storage
- [ ] Non-super_admin does NOT see the provider selector (Cloudflare R2 / Vercel Blob)
- [ ] Non-super_admin only sees the R2 accordion (and VPS accordion if permission allows)
- [ ] super_admin sees both accordions unchanged (current behavior preserved)
- [ ] `updateStorageProvider('blob')` server action returns `Unauthorized` for non-super_admin
- [ ] `updateStorageSettings` strips `blobToken` for non-super_admin even if sent in payload
