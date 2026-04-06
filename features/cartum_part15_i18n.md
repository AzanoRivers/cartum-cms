# Part 15 — Translations & i18n

## Goal
Implement a zero-library translation system using TypeScript `as const` dictionaries. Compile-time coverage enforcement (missing keys cause type errors). Runtime locale switching via React context. No external i18n packages.

## Prerequisites
- Part 01 (env: `DEFAULT_LOCALE`)
- Part 07 (UI atoms exist — labels need translation keys)

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

- [ ] `locales/es.ts` type-errors if any key from `en.ts` is missing (`satisfies Dictionary`)
- [ ] `t(dict, 'common.save')` returns `'Save'` in English and `'Guardar'` in Spanish
- [ ] `t(dict, 'wizard.step', { current: 1, total: 5 })` returns `'Step 1 of 5'`
- [ ] Unknown key falls back to the key string itself (no crash)
- [ ] `DictionaryProvider` wraps the root layout — all client components can call `useDictionary()`
- [ ] `useDictionary()` throws an error if called outside `DictionaryProvider`
- [ ] Locale cookie persists 1 year across sessions
- [ ] No `i18next`, `next-intl`, or other i18n packages are installed
- [ ] All visible UI strings use translation keys — no hardcoded English strings in components
