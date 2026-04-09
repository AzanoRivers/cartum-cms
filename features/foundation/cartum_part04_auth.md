# Part 04 — Authentication & Session

## Goal
Implement login/logout and session management using Auth.js v5 (NextAuth). The super admin created in Part 03 authenticates here. The session drives RBAC resolution in subsequent parts.

## Prerequisites
- Part 02 (users table in DB, usersRepository ready)
- Part 03 (super_admin exists in DB after wizard)

---

## Auth.js v5 Setup

### `/auth.ts` (project root)
```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { usersRepository } from '@/db/repositories/users.repository'
import { verifyPassword } from '@/lib/services/auth.service'
import { rolesRepository } from '@/db/repositories/roles.repository'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const user = await usersRepository.findByEmail(credentials.email as string)
        if (!user) return null

        const valid = await verifyPassword(credentials.password as string, user.passwordHash)
        if (!valid) return null

        const roles = await rolesRepository.findByUserId(user.id)

        return {
          id: user.id,
          email: user.email,
          isSuperAdmin: user.isSuperAdmin,
          roles: roles.map(r => r.name),
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isSuperAdmin = user.isSuperAdmin
        token.roles = user.roles
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.isSuperAdmin = token.isSuperAdmin as boolean
      session.user.roles = token.roles as string[]
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
})
```

### `/app/api/auth/[...nextauth]/route.ts`
```ts
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

---

## Session Type Augmentation

### `/types/auth.ts`
```ts
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isSuperAdmin: boolean
      roles: string[]
    } & DefaultSession['user']
  }
}

export interface SessionUser {
  id: string
  email: string
  isSuperAdmin: boolean
  roles: string[]
}
```

---

## Login Page

### `/app/login/page.tsx`
Server Component that renders the login form client component.
Redirect to `/cms/board` if session already exists.

### `/components/ui/organisms/LoginForm.tsx`
Client Component.

**Fields:**
- Email
- Password (show/hide toggle)
- Submit button: "Sign in"

**Behavior:**
- Calls `signIn('credentials', { email, password, redirect: false })`
- On error: shows inline alert (`dict.errors.unauthorized`) — no page reload
- On success: `router.push('/cms/board')` with VHS transition
- Input focus state uses `accent` color border

**Visual:**
```
┌────────────────────────────┐
│  ◈ CARTUM                  │
│                            │
│  Email ________________    │
│  Password _____________    │
│                            │
│  [ Sign in ]               │
│                            │
│  Forgot password?          │
└────────────────────────────┘
```
Centered card on pure black background. Same aesthetic as the setup wizard.

---

## Password Recovery Flow

### `/app/forgot-password/page.tsx`
- Email input form
- Calls `requestPasswordReset(email)` Server Action
- Shows generic success message regardless of whether email exists (security: no email enumeration)

### `/app/reset-password/[token]/page.tsx`
- New password + confirm fields
- Calls `resetPassword(token, newPassword)` Server Action
- Tokens are single-use, expire in 1 hour
- Stored in a `password_reset_tokens` table:
  ```
  Table: password_reset_tokens
  - id         uuid PK
  - user_id    uuid FK → users.id ON DELETE CASCADE
  - token_hash text NOT NULL  (SHA-256 of the raw token)
  - expires_at timestamp NOT NULL
  - used_at    timestamp  (nullable)
  ```

> **Note:** If `RESEND_API_KEY` is not set (`CARTUM_E009` warning), recovery emails will not send. The reset form still exists but the page shows a visible warning banner: "Email delivery is not configured. Contact your administrator."

> **Email sender constraint:** The `from` address for all password recovery emails **must** use the `@azanorivers.com` domain (e.g. `labs@azanorivers.com`). This is because the Resend account is on the free tier with only the `azanorivers.com` domain verified. Sending from any other domain will be rejected by Resend. This address is hardcoded in the mailer — it is **not** configurable via Settings UI.

> **i18n email templates:** Both email templates (`reset-password` and `welcome`) are fully localized. Templates receive a typed `strings` object — they never resolve locale themselves. Locale is resolved upstream:
> - **Password reset email**: uses `project.defaultLocale` from DB (queried in `auth.actions.ts`)
> - **Welcome email** (sent on super-admin creation): uses the `cartum-setup-locale` cookie set during the setup wizard
>
> All localizable strings live under `Dictionary['email']` in `/locales/en.ts` and `/locales/es.ts`. Keys: `email.poweredBy`, `email.reset.*`, `email.welcome.*`. The `{project}` placeholder in subject/title strings is interpolated with `.replace('{project}', projectName)` in the mailer before passing to the template.

### `/lib/services/auth.service.ts`
```ts
hashPassword(plain: string): Promise<string>        // bcrypt, 12 rounds
verifyPassword(plain: string, hash: string): Promise<boolean>
generateResetToken(): string                         // crypto.randomBytes(32).toString('hex')
requestPasswordReset(email: string): Promise<string | null>  // returns raw token or null if email not found
resetPassword(token: string, newPassword: string): Promise<ActionResult>
```

---

## Route Protection (Middleware update from Part 03)

Extend `middleware.ts` to also check for active session on CMS routes:

```ts
// After setup check:
const session = await auth()   // Auth.js v5 — works in middleware

if (!session && isCMSRoute) {
  return NextResponse.redirect(new URL('/login', req.url))
}
```

Protected route prefixes: `/(cms)`, `/api/v1`

---

## DB Schema Addition

### `/db/schema/auth.schema.ts`
Add `password_reset_tokens` table (described above).

---

## Logout

In the CMS dock/settings panel:
```ts
// Server Action
'use server'
import { signOut } from '@/auth'
export async function logout() {
  await signOut({ redirectTo: '/login' })
}
```

---

## Acceptance Criteria

- [x] `/login` renders correctly and accessible without a session
- [x] Correct credentials → session created → redirect to `/cms/board`
- [x] Wrong credentials → inline error, no redirect
- [x] Accessing `/cms/board` without session → redirects to `/login`
- [x] Session `user.isSuperAdmin` is `true` for the account created in Part 03
- [x] Session `user.roles` array is populated from DB
- [x] Logout clears the session and redirects to `/login`
- [x] Password reset token expires after 1 hour
- [x] Reset token can only be used once (`used_at` is set after use)
- [x] No email enumeration on `/forgot-password` (always shows same message)
