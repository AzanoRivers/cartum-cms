# Part 14.5 — Additionals

## Goal
Implement features that extend Parts 04, 14, and 17 before the Settings panel itself is built.  
Grouped into three areas: **email change with OTP**, **Settings panel shell + Account section**, and **UI polish**.

## Prerequisites
- Part 04 (session, auth.service, email mailer)
- Part 14 (Resend configured, `getSetting`, email templates)
- Part 17 (SettingsPanel design reference)

---

## Feature 1 — Email Change with 4-Digit OTP

The signed-in user can request a change to their email address. A 4-digit numeric OTP is sent to the **new** email for verification. The old address is never emailed — only the new one receives the code.

### Flow

```
User                          Server                        New email inbox
 │                               │                               │
 │ 1. Enter new email            │                               │
 │──────────────────────────────>│                               │
 │                               │ generate 4-digit OTP          │
 │                               │ SHA-256 hash → DB             │
 │                               │ sendEmailOtp(newEmail, code)──>│
 │ 2. "Code sent" state          │                               │
 │                               │                               │
 │ 3. Enter 4 digits             │                               │
 │──────────────────────────────>│                               │
 │                               │ hash input, query DB          │
 │                               │ UPDATE users SET email        │
 │                               │ mark OTP used_at              │
 │ 4. Success — re-login prompt  │                               │
```

### Security design
- Code stored as `SHA-256(code)` — raw value never persisted
- TTL: **10 minutes**
- Previous OTP for same user is deleted on each new request (one active OTP per user)
- Existing email is checked before generating OTP — returns `email_taken` if already used
- Same-email guard: returns `same_email` if new equals current
- After confirmation: session JWT still holds old email until user re-authenticates; success message explicitly informs the user to log in again

---

## DB Schema Addition

### `/db/schema/email-otp.schema.ts`
```ts
export const emailOtpCodes = pgTable('email_otp_codes', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash:     text('code_hash').notNull(),
  pendingEmail: text('pending_email').notNull(),
  expiresAt:    timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt:       timestamp('used_at', { withTimezone: true }),
})
```

Migration: `db/migrations/0004_email_otp_codes.sql`

---

## Auth Service Extensions

### `/lib/services/auth.service.ts` additions
```ts
requestEmailChange(userId: string, newEmail: string): Promise<{ success: boolean; error?: string; code?: string }>
// - Validates newEmail is not taken
// - Deletes any previous OTP for userId
// - Generates 4-digit code via crypto.randomInt(1000, 9999)
// - Stores SHA-256 hash + pendingEmail + 10-min TTL
// - Returns raw code to the caller (never stored)

confirmEmailChange(userId: string, code: string): Promise<{ success: boolean; error?: string; newEmail?: string }>
// - Hashes input code, queries emailOtpCodes
// - Validates expiry and usedAt IS NULL
// - Atomically: UPDATE users SET email, UPDATE emailOtpCodes SET used_at
```

---

## Email Template — OTP Verification

### `/lib/email/templates/email-verification.ts`
```ts
export type VerifyEmailStrings = Dictionary['email']['verifyEmail'] & { poweredBy: string }

export interface VerifyEmailTemplateInput {
  code:    string
  strings: VerifyEmailStrings
}

export function verifyEmailHtml({ code, strings }: VerifyEmailTemplateInput): string
```

**Design**: Each of the 4 digits is rendered in its own cell — `52×64px` box, `#0a0a0f` background, `#6366f1` (primary) border and text color. Indigo accent to differentiate from reset (cyan) and welcome (mixed).

Localized via `strings` — template has zero hardcoded text.

---

## Mailer Extension

### `/lib/email/mailer.ts` addition
```ts
sendEmailOtp(input: { to: string; code: string; locale: SupportedLocale }): Promise<{ sent: boolean }>
// Uses project.defaultLocale resolved by the calling action
// Subject pattern: strings.subject.replace('{code}', code)  e.g. "Your Cartum verification code: 1234"
```

---

## Server Actions

### `/lib/actions/account.actions.ts`
```ts
'use server'

requestEmailChangeAction(input: unknown): Promise<ActionResult<{ pendingEmail: string }>>
// Validates session → validates email (Zod) → same-email guard →
// requestEmailChange() → sendEmailOtp() → returns pendingEmail

confirmEmailChangeAction(input: unknown): Promise<ActionResult<{ newEmail: string }>>
// Validates session → validates 4-digit code (Zod /^\d{4}$/) →
// confirmEmailChange() → returns newEmail
```

Error codes surfaced to the UI:
| Code | Meaning |
|---|---|
| `email_invalid` | Zod parse failed |
| `email_taken` | Email already belongs to another user |
| `same_email` | New email equals current |
| `invalid_code` | OTP hash mismatch or expired |

---

## Feature 2 — Settings Panel Shell

A floating overlay (not a route) following the design spec in Part 17. Implemented as a **skeleton** — only the Account tab is functional; all other tabs show a "Coming in Part 17" placeholder.

### `/components/ui/organisms/SettingsPanel.tsx`
```tsx
'use client'
// Props: { userEmail: string; settingsDict: Dictionary['settings'] }
// - Full-screen backdrop (bg-black/60 + backdrop-blur-sm)
// - Centered card: max-w-3xl, max-h-[82vh], rounded-xl
// - Left nav: 140px, tabs for account / project / storage / email / api / users / roles
// - Right: scrollable content area
// - VHSTransition duration="fast" on card content
// - Closes on: Esc key, backdrop click, close button
```

State ownership: `useUIStore` — `settingsOpen`, `settingsSection`, `openSettings(section)`, `closeSettings()` — already defined in Part 08, no changes needed.

### AccountSection — `/components/ui/organisms/settings/AccountSection.tsx`
```tsx
'use client'
// Props: { currentEmail: string; d: Dictionary['settings']['account'] }
```

**Three-step UI within the same component:**

1. **Form step** — new email input + "Send verification code" button
2. **Verify step** — 4 individual `<input>` boxes (one per digit):
   - Auto-advances focus on input
   - Backspace moves to previous digit
   - Full 4-char paste is handled (splits into boxes)
   - Resend + Cancel (✕) controls
3. **Success step** — green confirmation banner with re-login notice

---

## Feature 3 — Navigation wiring

### `DesktopLayout` props added
```ts
userEmail:    string
settingsDict: Dictionary['settings']
```
`<SettingsPanel>` rendered inside the layout (after `<BrandFooter />`).

### `TopBar` dropdown extended
Avatar dropdown now has two items:
1. **Account** → `openSettings('account')`
2. **Log out** (existing)

Locale key added: `cms.topBar.account` (`'Account'` / `'Mi cuenta'`).

### `app/(cms)/layout.tsx` changes
- `getDictionary(locale)` called once instead of `.cms` directly
- Passes `settingsDict={dict.settings}` and `userEmail={session.user.email}` to `DesktopLayout`

---

## Feature 4 — UI Polish

### BrandFooter — `/components/ui/atoms/BrandFooter.tsx`
- Font size: `text-[10px]` → `text-[11px] md:text-xs` (responsive: 11px mobile, 12px desktop)
- Link base color: `text-muted/70` → `text-muted` (visible without hover)
- "by" text: `text-muted/60` → `text-muted/80`
- Separator `·`: `text-border/60` → `text-muted/50`
- Pill border/bg: `/40` → `/50`, `/60` → `/70`
- Hover effects unchanged (`hover:text-accent` / `hover:text-primary`)

### TopBar project name
- `text-muted` → `text-text/70` (more readable, still visually secondary to the `◈` icon)

---

## Locale Keys Added

### `en.ts` / `es.ts`

**`settings.account`**
```
title, emailSection, currentEmail, newEmail, newEmailPlaceholder,
sendCode, sending, codeSentTo, codeLabel, codePlaceholder,
confirmChange, confirming, resend, emailUpdated,
errors: { emailInvalid, emailTaken, sameEmail, invalidCode, unknown }
```

**`email.verifyEmail`**
```
subject, heading, intro, expiry, ignore
```

**`cms.topBar.account`** — new key in existing `topBar` section.

---

## Files Created

| File | Description |
|---|---|
| `db/schema/email-otp.schema.ts` | `email_otp_codes` table schema |
| `db/migrations/0004_email_otp_codes.sql` | Migration SQL |
| `lib/email/templates/email-verification.ts` | OTP email HTML template |
| `lib/actions/account.actions.ts` | Server Actions for email change |
| `components/ui/organisms/settings/AccountSection.tsx` | Email change UI (3-step) |
| `components/ui/organisms/SettingsPanel.tsx` | Settings panel shell |

## Files Modified

| File | Change |
|---|---|
| `db/schema/index.ts` | Export `email-otp.schema` |
| `lib/services/auth.service.ts` | Added `requestEmailChange`, `confirmEmailChange` |
| `lib/email/mailer.ts` | Added `sendEmailOtp`, imported OTP template |
| `locales/en.ts` | Added `settings.account`, `email.verifyEmail`, `cms.topBar.account` (values + Dictionary type) |
| `locales/es.ts` | Same keys, Spanish values |
| `components/ui/layouts/DesktopLayout.tsx` | Added `userEmail`, `settingsDict` props; renders `<SettingsPanel>` |
| `components/ui/organisms/TopBar.tsx` | Account entry in user dropdown |
| `app/(cms)/layout.tsx` | Passes email + settingsDict to DesktopLayout |
| `components/ui/atoms/BrandFooter.tsx` | Improved text visibility + responsive size |

---

## Acceptance Criteria

- [x] Entering a new email that is already taken returns `email_taken` error immediately (no OTP sent)
- [x] OTP is sent to the **new** email address, not the current one
- [x] Code expires after 10 minutes — attempting to use it after expiry returns `invalid_code`
- [x] Only one active OTP per user — requesting again invalidates the previous
- [x] Each of the 4 digit boxes auto-advances focus on input
- [x] Pasting a 4-digit string fills all boxes at once
- [x] Settings panel opens when clicking the ⚙ gear icon (dock) or "Account" in the TopBar avatar dropdown
- [x] Panel closes on Esc or backdrop click
- [x] VHSTransition `duration="fast"` plays on panel open
- [x] All UI text uses locale dictionary keys — no hardcoded strings
- [x] Success state tells the user to log in again (session still holds old email)
- [x] BrandFooter text is legible without hover on desktop
- [x] TopBar project name is more readable (no excessive opacity)
