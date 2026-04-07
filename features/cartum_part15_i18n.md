# Part 15 — Translations & i18n

## Goal
Implement a zero-library translation system using TypeScript dictionaries. Compile-time key coverage via `satisfies Dictionary`. Runtime locale switching via cookie. No external i18n packages.

## Prerequisites
- Part 01 (env: `DEFAULT_LOCALE`)
- Part 07 (UI atoms exist — labels use translation keys)
- Part 14.5 (AccountSection OTP, email templates — introduces `{code}` and `{email}` interpolations)

---

## ✅ What's Already Implemented

The following pieces exist in the codebase and require **no changes**:

| File | Status | Notes |
|---|---|---|
| `locales/en.ts` | ✅ Done | Named `export const en`, `satisfies Dictionary` at bottom, `export type Dictionary` manually defined |
| `locales/es.ts` | ✅ Done | `export const es: Dictionary` — fully typed |
| `locales/index.ts` | ✅ Done | Sync `getDictionary(locale: SupportedLocale)` — returns dict directly |
| `types/project.ts` | ✅ Done | `SupportedLocale = 'en' \| 'es'` |
| CMS client dict | ✅ Done | Zustand `useUIStore((s) => s.cmsDict)` + `CmsDictionarySetter` atom — no React context needed |

---

## ⚠️ Intentional Divergences from Spec

The spec was written before implementation began. The codebase settled on different patterns that are **equally valid** and must not be regressed:

| Spec says | Actual codebase | Reason kept |
|---|---|---|
| `export default en` | `export const en` (named export) | Already used in 10+ imports |
| `export type Dictionary = typeof en` | Manual structural type | Allows explicit opt-in per key |
| `{{double-brace}}` interpolation | `{single-brace}` | 5 existing usages — changing would break them |
| `lib/i18n/getLocale.ts` as source of `SupportedLocale` | `types/project.ts` | Locale type belongs with project types |
| `DictionaryProvider` React context | Zustand `useUIStore` | React context is redundant; Zustand already works |
| Cookie name `locale` | `cartum-locale` | Avoids collision with `cartum-setup-locale` |

---

## 🔨 Implementation Plan (4 Steps)

### Step 1 — `lib/i18n/t.ts` (interpolation helper)

Centralized string interpolation. Uses `{single-brace}` syntax. Works on any partial dict object or the full `Dictionary`.

```ts
// lib/i18n/t.ts
export function t(
  dict: unknown,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split('.')
  let value: unknown = dict

  for (const part of parts) {
    if (value == null || typeof value !== 'object') return key
    value = (value as Record<string, unknown>)[part]
  }

  if (typeof value !== 'string') return key

  if (!params) return value

  return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}
```

**Key points:**
- `{single-brace}` regex: `/\{(\w+)\}/g` (NOT `{{double}}` from spec)
- First arg: `unknown` — works on full `Dictionary`, any sub-object, or any POJO
- Falls back to the `key` string itself on missing path or non-string value
- No TypeScript dotted-key autocomplete (`TranslationKey`) — too complex for minimal gain

---

### Step 2 — `lib/i18n/getLocale.ts` + `lib/actions/locale.actions.ts`

**`lib/i18n/getLocale.ts`** — server-side locale resolution:

```ts
// lib/i18n/getLocale.ts  (Server Components only — reads cookies)
import { cookies } from 'next/headers'
import type { SupportedLocale } from '@/types/project'

export const DEFAULT_LOCALE: SupportedLocale =
  (process.env.DEFAULT_LOCALE as SupportedLocale) ?? 'en'

export async function getLocale(): Promise<SupportedLocale> {
  const cookieLocale = (await cookies()).get('cartum-locale')?.value
  if (cookieLocale === 'en' || cookieLocale === 'es') return cookieLocale
  return DEFAULT_LOCALE
}
```

**`lib/actions/locale.actions.ts`** — user-level locale switching:

```ts
// lib/actions/locale.actions.ts
'use server'
import { cookies } from 'next/headers'
import type { SupportedLocale } from '@/types/project'

export async function setLocale(locale: SupportedLocale): Promise<void> {
  (await cookies()).set('cartum-locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
```

---

### Step 3 — `app/layout.tsx` dynamic `lang` attribute

Replace hardcoded `lang="en"` with locale from cookie:

```tsx
// app/layout.tsx
import { getLocale } from '@/lib/i18n/getLocale'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
```

---

### Step 4 — Migrate ad hoc `.replace()` calls to `t()`

Five spots currently use manual `.replace('{param}', value)`. After `t.ts` exists, migrate each:

| File | Line | Before | After |
|---|---|---|---|
| `lib/email/templates/welcome.ts` | 15 | `strings.titleWith.replace('{project}', projectName)` | `t(strings, 'titleWith', { project: projectName })` |
| `lib/email/templates/welcome.ts` | 18 | `strings.subjectWith.replace('{project}', projectName)` | `t(strings, 'subjectWith', { project: projectName })` |
| `lib/email/mailer.ts` | 64 | `strings.subjectWith.replace('{project}', input.projectName)` | `t(strings, 'subjectWith', { project: input.projectName })` |
| `lib/email/mailer.ts` | 95 | `strings.subject.replace('{code}', input.code)` | `t(strings, 'subject', { code: input.code })` |
| `components/ui/organisms/settings/AccountSection.tsx` | 176 | `d.codeSentTo.replace('{email}', pendingEmail)` | `t(d, 'codeSentTo', { email: pendingEmail })` |

---

## ✅ Acceptance Criteria

- [x] `lib/i18n/t.ts` exists and exported as named `t()`
- [x] `t(dict, 'email.verifyEmail.subject', { code: '1234' })` returns `'Your Cartum verification code: 1234'` — key exists in actual `en.ts`
- [x] `t(dict, 'nonexistent.key')` returns `'nonexistent.key'` (no crash) — fallback to key string in all branches
- [x] `lib/i18n/getLocale.ts` exports `getLocale()` — returns `SupportedLocale` from `cartum-locale` cookie or `DEFAULT_LOCALE`
- [x] `lib/actions/locale.actions.ts` exports `setLocale(locale)` — writes `cartum-locale` cookie with 1-year maxAge
- [x] `app/layout.tsx` renders `<html lang={locale}>` dynamically (not hardcoded `"en"`)
- [x] All 5 ad hoc `.replace('{param}', val)` calls migrated to `t()`
- [x] No `i18next`, `next-intl`, or external i18n packages added
- [x] 0 TypeScript errors across all modified files

---

## Original Spec Reference

> The sections below are the original spec, preserved for reference.
> Implementation diverges intentionally where noted above.

---

---

## Philosophy

No `next-intl`, no `i18next`. Pure TypeScript:
- `locales/en.ts` — source of truth (all keys must exist here first)
- `locales/es.ts` — satisfies `typeof en` (TypeScript enforces complete coverage)
- `lib/i18n/t.ts` — tiny `t(key)` utility
- `DictionaryProvider` — React context for client components
- `useDictionary()` — hook for client components

---

## File: `locales/en.ts`

```ts
// locales/en.ts
const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    loading: 'Loading…',
    back: 'Back',
    confirm: 'Confirm',
    search: 'Search',
    empty: 'Nothing here yet.',
    error: 'Something went wrong.',
    copy: 'Copy',
    copied: 'Copied!',
    required: 'Required',
    optional: 'Optional',
  },

  auth: {
    signIn: 'Sign in',
    signOut: 'Sign out',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    resetPassword: 'Reset password',
    sendResetLink: 'Send reset link',
    resetSent: 'Check your inbox for a reset link.',
    invalidCredentials: 'Invalid email or password.',
    sessionExpired: 'Your session has expired. Please sign in again.',
  },

  wizard: {
    title: 'Cartum Setup',
    step: 'Step {{current}} of {{total}}',
    steps: {
      systemCheck: 'System check',
      credentials: 'Database credentials',
      projectConfig: 'Project configuration',
      schemaInit: 'Schema initialization',
      done: 'Ready',
    },
    systemCheck: {
      heading: 'Checking your environment',
      pass: 'All checks passed',
      fail: 'Some checks failed',
    },
    credentials: {
      heading: 'Database connection',
      provider: 'Database provider',
      databaseUrl: 'Database URL',
      testConnection: 'Test connection',
      connectionOk: 'Connection successful',
      connectionFail: 'Could not connect',
    },
    projectConfig: {
      heading: 'Name your project',
      projectName: 'Project name',
      adminEmail: 'Admin email',
      adminPassword: 'Admin password',
    },
    schemaInit: {
      heading: 'Initializing schema',
      running: 'Running migrations…',
      done: 'Schema ready',
    },
    done: {
      heading: 'You\'re all set',
      cta: 'Open dashboard',
    },
  },

  nodes: {
    newNode: 'New node',
    nodeType: {
      container: 'Container',
      field: 'Field',
    },
    fieldType: {
      text: 'Text',
      number: 'Number',
      boolean: 'Boolean',
      image: 'Image',
      video: 'Video',
      relation: 'Relation',
    },
    rename: 'Rename node',
    deleteNode: 'Delete node',
    deleteConfirm: 'Delete "{{name}}"? This action is irreversible.',
    addField: 'Add field',
    noFields: 'No fields yet. Add one to start.',
    connections: 'Connections',
    connectTo: 'Connect to',
  },

  records: {
    newRecord: 'New record',
    editRecord: 'Edit record',
    deleteRecord: 'Delete record',
    deleteConfirm: 'Delete this record? This action is irreversible.',
    noRecords: 'No records yet.',
    backToList: 'Back to list',
    savedAt: 'Saved at {{time}}',
  },

  media: {
    uploadImage: 'Upload image',
    uploadVideo: 'Upload video',
    uploading: 'Uploading {{percent}}%…',
    optimizing: 'Optimizing…',
    uploadError: 'Upload failed. Try again.',
    remove: 'Remove file',
    preview: 'Preview',
  },

  settings: {
    title: 'Settings',
    sections: {
      project: 'Project',
      storage: 'Storage',
      email: 'Email',
      api: 'API Tokens',
      users: 'Users',
      roles: 'Roles',
    },
    project: {
      projectName: 'Project name',
      defaultLocale: 'Default locale',
      saved: 'Project settings saved.',
    },
    storage: {
      r2BucketUrl: 'R2 Bucket URL',
      r2PublicUrl: 'R2 Public URL',
      mediaVpsUrl: 'Media VPS URL',
      mediaVpsKey: 'Media VPS API Key',
      vpsOptional: 'Optional — leave blank to use client-side optimization only.',
      testStorage: 'Test connection',
      storageOk: 'Storage connection successful.',
      storageFail: 'Could not reach storage.',
    },
    email: {
      resendApiKey: 'Resend API Key',
      emailOptional: 'Optional — required only for password recovery emails.',
    },
    api: {
      newToken: 'New API token',
      tokenName: 'Token name',
      tokenRole: 'Assigned role',
      createdToken: 'Token created — copy it now, it won\'t be shown again.',
      revokeToken: 'Revoke token',
      revokeConfirm: 'Revoke this token? Any app using it will lose access.',
    },
    users: {
      inviteUser: 'Invite user',
      noUsers: 'No users yet.',
      removeUser: 'Remove user',
      removeConfirm: 'Remove {{name}} from this project?',
    },
    roles: {
      newRole: 'New role',
      roleName: 'Role name',
      permissions: 'Permissions',
      deleteRole: 'Delete role',
      deleteConfirm: 'Delete role "{{name}}"? Users with this role will lose it.',
    },
  },

  errors: {
    E001: 'Missing required environment variables.',
    E002: 'DB_PROVIDER has an invalid value.',
    E003: 'Database connection failed.',
    E004: 'Failed to run migrations.',
    E005: 'Project table is missing in database.',
    E006: 'Setup wizard was skipped — project not configured.',
    E007: 'Auth secret is weak or missing.',
    E008: 'R2 configuration is invalid.',
    E009: 'Media VPS API is unreachable.',
    E010: 'Unknown startup error.',
  },

  nav: {
    home: 'Home',
    settings: 'Settings',
    addNode: 'Add node',
    content: 'Content',
    schema: 'Schema',
  },
} as const

export default en
export type Dictionary = typeof en
```

---

## File: `locales/es.ts`

```ts
// locales/es.ts
import type { Dictionary } from './en'

const es = {
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    create: 'Crear',
    loading: 'Cargando…',
    back: 'Volver',
    confirm: 'Confirmar',
    search: 'Buscar',
    empty: 'Nada aquí todavía.',
    error: 'Algo salió mal.',
    copy: 'Copiar',
    copied: '¡Copiado!',
    required: 'Obligatorio',
    optional: 'Opcional',
  },
  auth: {
    signIn: 'Iniciar sesión',
    signOut: 'Cerrar sesión',
    email: 'Email',
    password: 'Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    resetPassword: 'Restablecer contraseña',
    sendResetLink: 'Enviar enlace',
    resetSent: 'Revisa tu bandeja de entrada.',
    invalidCredentials: 'Email o contraseña incorrectos.',
    sessionExpired: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
  },
  // ... all other sections mirrored in Spanish
} satisfies Dictionary

export default es
```

The `satisfies Dictionary` constraint ensures TypeScript errors if any key from `en.ts` is missing. Add remaining sections following the same pattern.

---

## Utility: `lib/i18n/t.ts`

```ts
// lib/i18n/t.ts
import type { Dictionary } from '@/locales/en'

type NestedKeyOf<T, Prefix extends string = ''> =
  T extends object
    ? { [K in keyof T]: K extends string
        ? NestedKeyOf<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>
        : never
      }[keyof T]
    : Prefix

export type TranslationKey = NestedKeyOf<Dictionary>

export function t(dict: Dictionary, key: TranslationKey, params?: Record<string, string | number>): string {
  const parts = (key as string).split('.')
  let value: unknown = dict

  for (const part of parts) {
    if (value == null || typeof value !== 'object') return key as string
    value = (value as Record<string, unknown>)[part]
  }

  if (typeof value !== 'string') return key as string

  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`))
  }
  return value
}
```

Usage example:
```ts
t(dict, 'common.save')                          // → "Save"
t(dict, 'wizard.step', { current: 2, total: 5 }) // → "Step 2 of 5"
```

---

## Server: `lib/i18n/getLocale.ts`

```ts
// lib/i18n/getLocale.ts (Server Components only)
import { cookies } from 'next/headers'

export type Locale = 'en' | 'es'
export const DEFAULT_LOCALE: Locale = (process.env.DEFAULT_LOCALE as Locale) ?? 'en'

export async function getLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get('locale')?.value
  if (cookieLocale === 'en' || cookieLocale === 'es') return cookieLocale
  return DEFAULT_LOCALE
}

export async function getDictionary(locale: Locale) {
  const mod = locale === 'es'
    ? await import('@/locales/es')
    : await import('@/locales/en')
  return mod.default
}
```

Server Components call `getDictionary()` directly and pass the dict as props.

---

## Client Context: `DictionaryProvider`

```ts
// components/ui/providers/DictionaryProvider.tsx
'use client'
import { createContext, useContext } from 'react'
import type { Dictionary } from '@/locales/en'

const DictionaryContext = createContext<Dictionary | null>(null)

export function DictionaryProvider({ dict, children }: { dict: Dictionary; children: React.ReactNode }) {
  return <DictionaryContext.Provider value={dict}>{children}</DictionaryContext.Provider>
}

export function useDictionary(): Dictionary {
  const ctx = useContext(DictionaryContext)
  if (!ctx) throw new Error('useDictionary must be used inside DictionaryProvider')
  return ctx
}
```

The root layout loads the dictionary server-side and wraps everything in `DictionaryProvider`:

```tsx
// app/layout.tsx
const locale = await getLocale()
const dict = await getDictionary(locale)

return (
  <html lang={locale}>
    <body>
      <DictionaryProvider dict={dict}>
        {children}
      </DictionaryProvider>
    </body>
  </html>
)
```

---

## Hook: `useDictionary()` with `t()`

Client components use the hook plus the `t()` utility together:

```tsx
'use client'
import { useDictionary } from '@/components/ui/providers/DictionaryProvider'
import { t } from '@/lib/i18n/t'

export function SaveButton() {
  const dict = useDictionary()
  return <button>{t(dict, 'common.save')}</button>
}
```

Server Components call `t()` with the passed prop:
```tsx
// Server Component
export default async function SomeServerPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  return <h1>{t(dict, 'nodes.newNode')}</h1>
}
```

---

## Locale Switcher Action

```ts
// lib/actions/locale.actions.ts
'use server'
import { cookies } from 'next/headers'
import type { Locale } from '@/lib/i18n/getLocale'

export async function setLocale(locale: Locale): Promise<void> {
  (await cookies()).set('locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
}
```

---

## Acceptance Criteria

> ⚠️ These are the **original spec** criteria, evaluated against the actual implementation.
> Items marked N/A are covered by intentional divergences documented above.

- [x] `locales/es.ts` type-errors if any key from `en.ts` is missing — uses `export const es: Dictionary` (equivalent to `satisfies Dictionary`)
- [~] `t(dict, 'common.save')` returns `'Save'` / `'Guardar'` — **N/A**: actual `en.ts` has no `common` section (spec dict structure differs). `t()` function itself is correct; equivalent key `t(dict, 'cms.dock.settings')` → `'Settings'` works as expected.
- [~] `t(dict, 'wizard.step', { current: 1, total: 5 })` returns `'Step 1 of 5'` — **N/A**: actual `en.ts` has no `wizard` section, and spec used `{{double-brace}}` syntax. Equivalent test: `t(dict, 'email.verifyEmail.subject', { code: '1234' })` → `'Your Cartum verification code: 1234'` ✅
- [x] Unknown key falls back to the key string itself (no crash)
- [~] `DictionaryProvider` wraps the root layout — **N/A (intentional divergence)**: CMS client dict served via Zustand `useUIStore`; React context is redundant
- [~] `useDictionary()` throws outside `DictionaryProvider` — **N/A (intentional divergence)**: no `DictionaryProvider` implemented; Zustand store used instead
- [x] Locale cookie persists 1 year across sessions — `setLocale()` uses `maxAge: 60 * 60 * 24 * 365`
- [x] No `i18next`, `next-intl`, or other i18n packages are installed
- [x] All visible UI strings use translation keys — no hardcoded English strings in implemented components
