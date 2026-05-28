# MP-03 — Multi-Project: User Invitations & Project Memberships

## Goal

Allow project admins to invite external users to their project capsule via email. Invited users receive a link, confirm their identity (or create an account if new to the platform), and land on the project board as a member. The Settings panel gains a **Members** section where admins can view current members, manage their roles, and revoke access.

---

## Prerequisites

- MP-01 database capsule architecture in place (`project_invitations`, `project_memberships` tables exist)
- MP-02 project management UI in place (project selector, session carries `currentProjectId`)
- Resend email service working (`resend_api_key` + `resend_from_email` in app_settings)
- Roles system: admin, editor, viewer, restricted defined in `roles` table
- Auth.js session working; `requireProjectId()` + `assertProjectAccess()` available

---

## Architecture Overview

```
Admin sends invite               Token emailed          Recipient accepts
──────────────────────────  →  ──────────────────  →  ──────────────────────────────
/settings → Members              /invite/[token]         If user exists:
Email + role + project (*)       link in email           → "Join project" confirm page
                                 sent in project locale  → createMembership()
                                                         → redirect /cms/board

                                                         If user is new:
                                                         → Registration form (name, pass)
                                                         → createUser() + createMembership()
                                                         → auto login → /cms/board
```

> (*) **Project must be explicitly selected** in the invitation form — it is NOT silently derived from the current session. The UI shows a project selector + role selector side by side. This guarantees the admin consciously chooses WHERE the user is being invited, preventing accidental cross-project invitations.

### Email Locale Rule

Invitation emails are sent in the **language configured for the target project** (`project.default_locale`). If the project locale is `es`, the email body is in Spanish. If `en`, in English. The email template system must support both languages via a locale map (not separate template files — single template with locale-keyed strings).

---

## Invitation Token Design

- **Token:** 32-byte random, URL-safe base64 → stored as **SHA-256 hash** in DB
- **Expiry:** 7 days from creation
- **One-use:** `accepted_at` timestamp set on accept; subsequent visits show "already used" error
- **Re-invite:** If an invite for the same email + project exists and hasn't been accepted, admin can resend the same token (bump expiry) or revoke and create a new one
- **No auth required to view `/invite/[token]`** — token itself is the credential

---

## Settings UI — Members Section

### Location

`/cms/settings` → new tab/section: **Members**

Visible only to admins (role: `admin`) and super admins. Hidden from editors, viewers, and restricted users via `role_section_permissions`.

Add `'members'` to the `section` check column in `role_section_permissions`:

```sql
-- Migration addition to 0020 or a new migration:
ALTER TABLE "role_section_permissions"
  DROP CONSTRAINT IF EXISTS role_section_permissions_section_check;

ALTER TABLE "role_section_permissions"
  ADD CONSTRAINT role_section_permissions_section_check
  CHECK (section IN (
    'project','appearance','account','email','storage',
    'users','roles','api','db','webMigration','info','members'
  ));

-- Grant admin access to 'members'
INSERT INTO role_section_permissions (role_id, section, can_access)
SELECT r.id, 'members', true FROM roles r WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
```

### Visual Design

```
Settings › Members
─────────────────────────────────────────────────────────────────
  Invite a member
  ┌──────────────────────────────┐ ┌──────────────┐ ┌──────────┐ ┌────────┐
  │ colleague@company.com        │ │ My Project ▾ │ │ Editor ▾ │ │ Invite │
  └──────────────────────────────┘ └──────────────┘ └──────────┘ └────────┘
  ↑ email                          ↑ project (explicit)  ↑ role    ↑ send

  Current members                                      2 members
  ┌──────────────────────────────────────────────────────────────┐
  │  👤 Jane Doe          jane@example.com       Admin      ···  │
  │  ─────────────────────────────────────────────────────────── │
  │  👤 Carlos López      carlos@company.com    Editor      ···  │
  └──────────────────────────────────────────────────────────────┘

  Pending invitations                                  1 pending
  ┌──────────────────────────────────────────────────────────────┐
  │  📨 maria@agency.com                        Viewer   Resend  │
  │                                                    Revoke    │
  └──────────────────────────────────────────────────────────────┘
```

**Aesthetic rules:**
- Matches existing settings panel style (surface-2, border-border, font-mono)
- Invite form: same input + select + button pattern as other settings forms
- Member rows: flex with gap, avatar placeholder (initials), role badge (same `<Badge>` component), context menu (`···`) for role change / remove
- Pending rows: slightly muted, with "Resend" and "Revoke" actions as text buttons
- "···" context menu: same popup pattern as `MultiSelectionContextMenu`
- Role change: inline select that calls `updateMemberRole()` on change
- Remove: confirmation dialog before calling `removeMember()`

### Role Badge Colors

| Role | Badge variant |
|------|--------------|
| admin | `primary` |
| editor | `muted` with accent border |
| viewer | `muted` |
| restricted | `warning` (disabled visually) |

---

## New Server Actions — `lib/actions/invitations.actions.ts`

```typescript
'use server'

import { auth } from '@/auth'
import { assertProjectAccess } from '@/lib/auth/get-project-id'
import { invitationsService } from '@/lib/services/invitations.service'
import { projectMembershipsRepository } from '@/db/repositories/project_memberships.repository'
import { InviteSchema, AcceptInviteSchema } from './invitations.schemas'
import { revalidatePath } from 'next/cache'

/**
 * Send an invitation to an email address.
 * projectId is EXPLICIT in the form — not derived from session.
 * Only admins of the target project or super admins can call this.
 */
export async function sendInvitation(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')

  const parsed = InviteSchema.safeParse({
    email:     formData.get('email'),
    roleId:    formData.get('roleId'),
    projectId: formData.get('projectId'),   // ← explicit, required
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { email, roleId, projectId } = parsed.data

  // Verify caller has access to the target project
  await assertProjectAccess(projectId)

  // Require admin role in the target project
  const isAdmin = await projectMembershipsRepository.isMemberWithRole(
    session.user.id, projectId, 'admin'
  )
  if (!isAdmin && !session.user.isSuperAdmin) throw new Error('FORBIDDEN')

  await invitationsService.sendInvite({
    projectId,
    invitedEmail: email,
    roleId,
    invitedBy: session.user.id,
  })

  revalidatePath('/cms/settings')
  return { success: true }
}

/**
 * Accept an invitation by token.
 * If the user is already logged in → just add membership.
 * If not logged in → handled by the /invite/[token] page server-side.
 */
export async function acceptInvitation(token: string, newUser?: { name: string; email: string; password: string }) {
  await invitationsService.acceptInvite(token, newUser)
  revalidatePath('/cms/board')
}

/**
 * Revoke a pending invitation.
 */
export async function revokeInvitation(invitationId: string) {
  const session   = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const projectId = await requireProjectId()
  await assertProjectAccess(projectId)
  await invitationsService.revokeInvite(invitationId, projectId)
  revalidatePath('/cms/settings')
}

/**
 * Resend an invitation email (resets expiry).
 */
export async function resendInvitation(invitationId: string) {
  const session   = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const projectId = await requireProjectId()
  await assertProjectAccess(projectId)
  await invitationsService.resendInvite(invitationId, projectId)
  revalidatePath('/cms/settings')
}

/**
 * Change a member's role within the project.
 */
export async function updateMemberRole(userId: string, newRoleId: string) {
  const session   = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const projectId = await requireProjectId()
  await assertProjectAccess(projectId)
  await projectMembershipsRepository.addMember(userId, projectId, newRoleId)
  revalidatePath('/cms/settings')
}

/**
 * Remove a member from the project.
 * Cannot remove the last admin.
 */
export async function removeMember(userId: string) {
  const session   = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const projectId = await requireProjectId()
  await assertProjectAccess(projectId)

  // Safety: cannot remove last admin
  const admins = await projectMembershipsRepository.getMembersByRole(projectId, 'admin')
  const isTarget = admins.some(a => a.userId === userId)
  if (isTarget && admins.length === 1) {
    return { error: 'Cannot remove the only project admin.' }
  }

  await projectMembershipsRepository.removeMember(userId, projectId)
  revalidatePath('/cms/settings')
}
```

### Zod Schemas: `lib/actions/invitations.schemas.ts`

```typescript
import { z } from 'zod'

export const InviteSchema = z.object({
  email:     z.string().email('Invalid email address'),
  roleId:    z.string().uuid('Invalid role'),
  projectId: z.string().uuid('Invalid project'),  // ← always explicit
})

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
})

export const RegisterAndAcceptSchema = z.object({
  token:    z.string().min(1),
  name:     z.string().min(1, 'Name is required').max(80),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
```

---

## Invitation Service — `lib/services/invitations.service.ts`

```typescript
// lib/services/invitations.service.ts
import crypto from 'node:crypto'
import { db } from '@/db'
import { projectInvitations, project, users } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { projectMembershipsRepository } from '@/db/repositories/project_memberships.repository'
import { projectInvitationsRepository } from '@/db/repositories/project_invitations.repository'
import { sendInvitationEmail } from '@/lib/email/templates/invitation'
import { hashPassword } from '@/lib/auth/password'
import { usersRepository } from '@/db/repositories/users.repository'

const INVITE_EXPIRY_DAYS = 7

export const invitationsService = {

  async sendInvite({
    projectId,
    invitedEmail,
    roleId,
    invitedBy,
  }: {
    projectId:    string
    invitedEmail: string
    roleId:       string
    invitedBy:    string
  }): Promise<void> {
    // Check if already a member
    const existingMember = await projectMembershipsRepository.findByEmail(projectId, invitedEmail)
    if (existingMember) throw new Error('USER_ALREADY_MEMBER')

    // Generate token
    const rawToken    = crypto.randomBytes(32).toString('base64url')
    const tokenHash   = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt   = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86_400_000)

    // Upsert invitation (one pending invite per email per project)
    await projectInvitationsRepository.upsert({
      projectId,
      invitedEmail,
      roleId,
      invitedBy,
      tokenHash,
      expiresAt,
    })

    // Get project name + locale for email
    const [proj] = await db.select({ name: project.name, locale: project.defaultLocale })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)

    // Send email in the project's configured language
    await sendInvitationEmail({
      to:          invitedEmail,
      projectName: proj?.name ?? 'a project',
      inviteUrl:   `${process.env.NEXTAUTH_URL}/invite/${rawToken}`,
      expiryDays:  INVITE_EXPIRY_DAYS,
      locale:      (proj?.locale ?? 'en') as 'en' | 'es',  // ← project locale
    })
  },

  async acceptInvite(
    rawToken: string,
    newUser?: { name: string; email: string; password: string }
  ): Promise<{ projectId: string }> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const invite    = await projectInvitationsRepository.findByTokenHash(tokenHash)

    if (!invite)                    throw new Error('INVITE_NOT_FOUND')
    if (invite.acceptedAt)          throw new Error('INVITE_ALREADY_USED')
    if (invite.expiresAt < new Date()) throw new Error('INVITE_EXPIRED')

    // Resolve or create user
    let userId: string
    const existing = await usersRepository.findByEmail(invite.invitedEmail)

    if (existing) {
      userId = existing.id
    } else {
      if (!newUser) throw new Error('REGISTRATION_REQUIRED')
      const passwordHash = await hashPassword(newUser.password)
      const created = await usersRepository.create({
        email:        invite.invitedEmail,
        passwordHash,
        isSuperAdmin: false,
      })
      userId = created.id
    }

    // Add membership
    await projectMembershipsRepository.addMember(userId, invite.projectId, invite.roleId)

    // Mark invite as accepted
    await projectInvitationsRepository.markAccepted(invite.id)

    return { projectId: invite.projectId }
  },

  async revokeInvite(invitationId: string, projectId: string): Promise<void> {
    await projectInvitationsRepository.delete(invitationId, projectId)
  },

  async resendInvite(invitationId: string, projectId: string): Promise<void> {
    const invite = await projectInvitationsRepository.findById(invitationId, projectId)
    if (!invite || invite.acceptedAt) throw new Error('INVITE_NOT_RESENDABLE')

    // Regenerate token + extend expiry
    const rawToken  = crypto.randomBytes(32).toString('base64url')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86_400_000)

    await projectInvitationsRepository.refreshToken(invitationId, tokenHash, expiresAt)

    const [proj] = await db.select({ name: project.name })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)

    await sendInvitationEmail({
      to:          invite.invitedEmail,
      projectName: proj?.name ?? 'a project',
      inviteUrl:   `${process.env.NEXTAUTH_URL}/invite/${rawToken}`,
      expiryDays:  INVITE_EXPIRY_DAYS,
    })
  },
}
```

---

## Invitation Accept Page — `app/invite/[token]/page.tsx`

This page is **public** (no session required). It reads the token from the URL, validates it, and shows the appropriate form.

### Flow Decision Tree

```
GET /invite/[token]
        │
        ▼
  Lookup token in DB
        │
   ┌────┴────────────────────┐
   │ Invalid / expired?      │
   └──── → Error page ───────┘
        │
        ▼
  Is user currently logged in?
        │
   ┌────┴──────────────────────────────────────┐
   │ YES                                       │ NO
   │ Does session user email = invitedEmail?   │
   │   YES → "Join [Project]" confirm button   │ → Is invitedEmail in users table?
   │   NO  → "Wrong account" error             │     YES → "Sign in to accept" page
   └───────────────────────────────────────────┘     NO  → Registration form
```

### Visual Design — Accept Page

```
┌────────────────────────────────────────────┐
│           ◈ CARTUM                         │
│                                            │
│  You've been invited                       │
│  to join ❝My Awesome Project❞             │
│  as an Editor.                             │
│                                            │
├────────────────────────────────────────────┤

Case A — logged in, same email:
│  Signed in as jane@example.com             │
│  [ Accept invitation ]                     │

Case B — not logged in, email exists in DB:
│  Sign in to accept this invitation         │
│  Email: jane@example.com                   │
│  Password: [ ••••••••• ]                   │
│  [ Sign in and join ]                      │

Case C — new user (email not in DB):
│  Create your account to join               │
│  Your name: [ Jane Doe    ]                │
│  Password:  [ •••••••••• ]                │
│  [ Create account and join ]               │

Error states:
│  ⚠ This invitation has expired.            │
│  ⚠ This invitation has already been used. │
│  ⚠ Invalid invitation link.               │
└────────────────────────────────────────────┘
```

**Aesthetic rules:**
- Same card design as `/cartum-player` and login
- VHS transition on mount
- Error states: `border-danger/30 bg-danger/10 text-danger` banner
- Project name in quotes with `text-primary`
- Role in `<Badge>` component

### Route Implementation

```tsx
// app/invite/[token]/page.tsx
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { projectInvitationsRepository } from '@/db/repositories/project_invitations.repository'
import { usersRepository } from '@/db/repositories/users.repository'
import { AcceptInviteCard } from '@/components/ui/organisms/AcceptInviteCard'
import crypto from 'node:crypto'

type Props = { params: Promise<{ token: string }> }

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const invite = await projectInvitationsRepository.findByTokenHash(tokenHash)

  if (!invite) return notFound()

  const now = new Date()
  const expired  = invite.expiresAt < now
  const consumed = !!invite.acceptedAt

  const session      = await auth()
  const existingUser = await usersRepository.findByEmail(invite.invitedEmail)
  const projectInfo  = await projectRepository.findById(invite.projectId)

  return (
    <AcceptInviteCard
      token={token}
      invite={{
        invitedEmail: invite.invitedEmail,
        projectName:  projectInfo?.name ?? 'Unknown Project',
        roleName:     invite.roleName, // joined in repository query
        expired,
        consumed,
      }}
      sessionEmail={session?.user?.email ?? null}
      existingUser={!!existingUser}
    />
  )
}
```

### Component: `components/ui/organisms/AcceptInviteCard.tsx`

Client component that renders the correct case (A/B/C or error) based on props.

```tsx
'use client'
// Handles 4 visual states:
// 1. Error (expired/consumed/invalid)
// 2. Case A — logged in + matching email → confirm button
// 3. Case B — not logged in + known email → sign in form
// 4. Case C — not logged in + new email → register form
// All states in one component, controlled by props, using useActionState for forms.
```

---

## Email Template — `lib/email/templates/invitation.ts`

The template is **locale-aware**: all visible strings are keyed by the project's `default_locale`. Add more locales to the `INVITE_COPY` map as needed.

```typescript
// lib/email/templates/invitation.ts
import { Resend } from 'resend'
import { projectSettingsRepository } from '@/db/repositories/project_settings.repository'
import { getSetting } from '@/lib/settings/get-setting'

// ── Locale copy map ──────────────────────────────────────────────────────────
const INVITE_COPY = {
  en: {
    subject:  (p: string) => `You've been invited to join ${p} on Cartum`,
    heading:  "You're invited",
    body:     (p: string) => `You've been invited to join <strong style="color: #e2e8f0;">${p}</strong> on Cartum.`,
    cta:      'Accept invitation →',
    expiry:   (d: number) => `This invitation expires in ${d} days.`,
    ignore:   "If you didn't expect this email, you can safely ignore it.",
  },
  es: {
    subject:  (p: string) => `Has sido invitado a unirte a ${p} en Cartum`,
    heading:  'Tienes una invitación',
    body:     (p: string) => `Has sido invitado a unirte a <strong style="color: #e2e8f0;">${p}</strong> en Cartum.`,
    cta:      'Aceptar invitación →',
    expiry:   (d: number) => `Esta invitación expira en ${d} días.`,
    ignore:   'Si no esperabas este correo, puedes ignorarlo sin problema.',
  },
} as const

type SupportedLocale = keyof typeof INVITE_COPY

export async function sendInvitationEmail({
  to,
  projectName,
  inviteUrl,
  expiryDays,
  locale = 'en',
  projectId,
}: {
  to:          string
  projectName: string
  inviteUrl:   string
  expiryDays:  number
  locale:      SupportedLocale
  projectId?:  string          // if provided, uses project-specific Resend keys
}): Promise<void> {
  // Resolve API keys: project override → global → env
  const apiKey = projectId
    ? await projectSettingsRepository.get(projectId, 'resend_api_key', 'RESEND_API_KEY')
    : await getSetting('resend_api_key', 'RESEND_API_KEY')

  const fromAddr = projectId
    ? await projectSettingsRepository.get(projectId, 'resend_from_email', 'RESEND_FROM_EMAIL')
    : await getSetting('resend_from_email', 'RESEND_FROM_EMAIL')

  if (!apiKey || !fromAddr) throw new Error('EMAIL_NOT_CONFIGURED')

  const copy   = INVITE_COPY[locale] ?? INVITE_COPY.en
  const resend = new Resend(apiKey)

  await resend.emails.send({
    from:    fromAddr,
    to,
    subject: copy.subject(projectName),
    html: `
      <div style="font-family: monospace; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #111118; color: #e2e8f0; border-radius: 12px; border: 1px solid #2a2a38;">
        <p style="font-size: 11px; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 24px;">◈ CARTUM</p>
        <h1 style="font-size: 18px; font-weight: 600; margin: 0 0 12px;">${copy.heading}</h1>
        <p style="font-size: 14px; color: #94a3b8; margin: 0 0 24px;">${copy.body(projectName)}</p>
        <a href="${inviteUrl}"
          style="display: inline-block; background: #6366f1; color: #fff; font-size: 13px; font-weight: 500; padding: 10px 20px; border-radius: 8px; text-decoration: none; margin-bottom: 24px;">
          ${copy.cta}
        </a>
        <p style="font-size: 12px; color: #64748b; margin: 0;">
          ${copy.expiry(expiryDays)}<br/>
          ${copy.ignore}
        </p>
      </div>
    `,
  })
}
```

---

## Repository: `db/repositories/project_invitations.repository.ts`

```typescript
// db/repositories/project_invitations.repository.ts
import { db } from '@/db'
import { projectInvitations, roles } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export const projectInvitationsRepository = {

  async findByTokenHash(tokenHash: string) {
    const [row] = await db
      .select({
        id:           projectInvitations.id,
        projectId:    projectInvitations.projectId,
        invitedEmail: projectInvitations.invitedEmail,
        roleId:       projectInvitations.roleId,
        roleName:     roles.name,
        expiresAt:    projectInvitations.expiresAt,
        acceptedAt:   projectInvitations.acceptedAt,
      })
      .from(projectInvitations)
      .innerJoin(roles, eq(roles.id, projectInvitations.roleId))
      .where(eq(projectInvitations.tokenHash, tokenHash))
      .limit(1)
    return row ?? null
  },

  async findById(id: string, projectId: string) {
    const [row] = await db.select()
      .from(projectInvitations)
      .where(and(eq(projectInvitations.id, id), eq(projectInvitations.projectId, projectId)))
      .limit(1)
    return row ?? null
  },

  async listPending(projectId: string) {
    return db.select({
      id:           projectInvitations.id,
      invitedEmail: projectInvitations.invitedEmail,
      roleId:       projectInvitations.roleId,
      roleName:     roles.name,
      expiresAt:    projectInvitations.expiresAt,
      createdAt:    projectInvitations.createdAt,
    })
    .from(projectInvitations)
    .innerJoin(roles, eq(roles.id, projectInvitations.roleId))
    .where(
      and(
        eq(projectInvitations.projectId, projectId),
        isNull(projectInvitations.acceptedAt),
      )
    )
  },

  async upsert(data: {
    projectId:    string
    invitedEmail: string
    roleId:       string
    invitedBy:    string
    tokenHash:    string
    expiresAt:    Date
  }) {
    await db.insert(projectInvitations)
      .values(data)
      .onConflictDoUpdate({
        target: [projectInvitations.projectId, projectInvitations.invitedEmail],
        set: {
          roleId:    data.roleId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
        },
      })
  },

  async markAccepted(id: string) {
    await db.update(projectInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(projectInvitations.id, id))
  },

  async refreshToken(id: string, tokenHash: string, expiresAt: Date) {
    await db.update(projectInvitations)
      .set({ tokenHash, expiresAt })
      .where(eq(projectInvitations.id, id))
  },

  async delete(id: string, projectId: string) {
    await db.delete(projectInvitations)
      .where(and(eq(projectInvitations.id, id), eq(projectInvitations.projectId, projectId)))
  },
}
```

---

## projectMembershipsRepository — Additional Methods

```typescript
// Additions to project_memberships.repository.ts

async findByEmail(projectId: string, email: string): Promise<ProjectMembership | null> {
  const [row] = await db.select({
    userId:    projectMemberships.userId,
    projectId: projectMemberships.projectId,
  })
  .from(projectMemberships)
  .innerJoin(users, eq(users.id, projectMemberships.userId))
  .where(and(
    eq(projectMemberships.projectId, projectId),
    eq(users.email, email),
  ))
  .limit(1)
  return row ?? null
},

async getMembersByRole(projectId: string, roleName: string) {
  return db.select({ userId: projectMemberships.userId })
    .from(projectMemberships)
    .innerJoin(roles, eq(roles.id, projectMemberships.roleId))
    .where(and(
      eq(projectMemberships.projectId, projectId),
      eq(roles.name, roleName),
    ))
},

async isMemberWithRole(userId: string, projectId: string, roleName: string): Promise<boolean> {
  const [row] = await db.select({ userId: projectMemberships.userId })
    .from(projectMemberships)
    .innerJoin(roles, eq(roles.id, projectMemberships.roleId))
    .where(and(
      eq(projectMemberships.userId, userId),
      eq(projectMemberships.projectId, projectId),
      eq(roles.name, roleName),
    ))
    .limit(1)
  return !!row
},
```

---

## Locale Additions (en.ts + es.ts)

```typescript
// en.ts — add to cms section
members: {
  title:           'Members',
  inviteTitle:     'Invite a member',
  emailPlaceholder:'colleague@company.com',
  rolePlaceholder: 'Select role',
  inviteButton:    'Invite',
  inviting:        'Inviting…',
  currentMembers:  'Current members',
  pending:         'Pending invitations',
  noPending:       'No pending invitations.',
  resend:          'Resend',
  revoke:          'Revoke',
  removeConfirm:   'Remove this member from the project?',
  roles: {
    admin:       'Admin',
    editor:      'Editor',
    viewer:      'Viewer',
    restricted:  'Restricted',
  },
  errors: {
    alreadyMember: 'This user is already a member of this project.',
    lastAdmin:     'Cannot remove the only project admin.',
    notFound:      'Member not found.',
  },
},

// en.ts — add to cms.invite (new top-level key under cms)
invite: {
  title:      "You've been invited",
  subtitle:   'to join',
  asRole:     'as',
  expired:    'This invitation has expired.',
  consumed:   'This invitation has already been used.',
  invalid:    'Invalid invitation link.',
  acceptBtn:  'Accept invitation',
  accepting:  'Joining…',
  signInTitle:'Sign in to accept',
  registerTitle: 'Create your account to join',
  name:       'Your name',
  password:   'Password',
  signInBtn:  'Sign in and join',
  registerBtn:'Create account and join',
},
```

---

## Folder Skeleton

```
app/
  invite/
    [token]/
      page.tsx                              ← NEW (public, no auth required)

components/
  ui/
    organisms/
      AcceptInviteCard.tsx                  ← NEW
    molecules/
      InviteMemberForm.tsx                  ← NEW (invite form in settings)
      MemberList.tsx                        ← NEW (list + role change + remove)
      PendingInvitationList.tsx             ← NEW (pending invites + resend/revoke)

lib/
  actions/
    invitations.actions.ts                  ← NEW
    invitations.schemas.ts                  ← NEW
  services/
    invitations.service.ts                  ← NEW
  email/
    templates/
      invitation.ts                         ← NEW

db/
  repositories/
    project_invitations.repository.ts       ← NEW
```

---

## Security Checklist

| Concern | Mitigation |
|---------|------------|
| Token brute-force | 32-byte random (256-bit entropy); SHA-256 stored |
| Token leakage via email headers | Link sent to intended recipient only; no token logged |
| SSRF via invite URL | `NEXTAUTH_URL` is a trusted env var; not constructed from user input |
| Role escalation | `sendInvitation` enforces caller must be admin in that project |
| Accept by wrong user | Server checks `invite.invitedEmail === session user email` for logged-in flow |
| Re-use of accepted token | `acceptedAt` check before processing |
| Remove last admin | `removeMember` counts admins and rejects if this is the last one |
| Invitation to non-existent project | `assertProjectAccess` + `project_id` FK constraint |

---

## Acceptance Criteria

- [ ] `project_invitations` table: `upsert` creates a new row per (projectId, email); second invite for same email updates token + expiry, not creates duplicate
- [ ] Invitation token is 32-byte random, stored as SHA-256 hash (raw token never saved in DB)
- [ ] Invitation email is sent via Resend with the correct link (`/invite/[rawToken]`)
- [ ] Email matches Cartum dark aesthetic (inline styles, monospace, brand mark)
- [ ] Invitation expires after 7 days; expired token shows clear error page
- [ ] Already-used token shows clear error page
- [ ] Invalid/non-existent token returns 404 (via `notFound()`)
- [ ] Accept flow Case A: logged-in user with matching email sees "Accept invitation" button; click adds membership + redirects to `/cms/board`
- [ ] Accept flow Case B: logged-in user with WRONG email sees "Wrong account" error (no form shown)
- [ ] Accept flow Case C: unlogged user + known email → sign-in form; success adds membership + auto-login + redirect
- [ ] Accept flow Case D: unlogged user + new email → registration form; success creates user + adds membership + auto-login + redirect
- [ ] `InviteSchema` includes `projectId` (UUID, required) — project is always explicitly stated, not derived from session
- [ ] Invite form in Settings › Members shows 3 fields: email + project selector + role selector
- [ ] Project selector in invite form shows only projects the caller is admin of (not all projects)
- [ ] `sendInvitation` action validates `projectId` is a UUID and that caller is admin of that specific project
- [ ] `sendInvitation` action throws `FORBIDDEN` if caller is not admin of the explicitly provided `projectId`
- [ ] `sendInvitation` returns error if email is already a member of the target project
- [ ] Invitation email is sent in the language configured for the target project (`project.default_locale`)
- [ ] `INVITE_COPY` locale map has complete copy for both `en` and `es`
- [ ] Email subject, heading, body, CTA, expiry notice, and ignore note are all localized
- [ ] Email uses project-specific Resend keys from `project_settings` if set; falls back to global/env
- [ ] `revokeInvitation` action deletes the pending invite; verifies invite belongs to caller's current project (no IDOR)
- [ ] `resendInvitation` generates a NEW token (old link invalidated), extends expiry, resends email in project locale
- [ ] `updateMemberRole` changes role in `project_memberships` for the target user in the current project
- [ ] `removeMember` throws error if removing the last admin of the project
- [ ] Settings › Members section is visible only to admin-role users and super admins
- [ ] Members list shows: avatar initials, email, role badge, `···` context menu with "Change role" and "Remove"
- [ ] Pending invitations list shows: email, role badge, "Resend" + "Revoke" text buttons
- [ ] Invite form validates email format, project selection, and role selection before submission
- [ ] All actions revalidate `/cms/settings` on success
- [ ] `/invite/[token]` page has no auth requirement — public route
- [ ] `AcceptInviteCard` handles all 4 cases (A/B/C/error) with appropriate UI
- [ ] TypeScript compiles with zero errors across all new files
- [ ] All new locale keys present in both `en.ts` and `es.ts`
- [ ] No invitation token is ever logged to stdout/console
- [ ] Role section_permissions: `'members'` section added to check constraint + granted to `admin` role
