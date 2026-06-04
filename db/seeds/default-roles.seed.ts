/**
 * Seed: default roles + section permissions
 * Run: npx tsx db/seeds/default-roles.seed.ts
 * Idempotent — safe to run multiple times.
 */

import { db } from '@/db'
import { roles, roleSectionPermissions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER, ROLE_RESTRICTED } from '@/types/roles'

type SectionKey = typeof SECTIONS[number]

const SECTIONS = [
  'project', 'appearance', 'account', 'email', 'storage',
  'members', 'users', 'roles', 'api', 'db', 'webMigration', 'help', 'info',
] as const

const DEFAULT_ROLES = [
  { name: ROLE_ADMIN,      description: 'Full access. Can manage users, roles, content, and settings.' },
  { name: ROLE_EDITOR,     description: 'Content editor. Can create and update records in assigned nodes.' },
  { name: ROLE_VIEWER,     description: 'Read-only. Can view records without modifying them.' },
  { name: ROLE_RESTRICTED, description: 'Suspended access. Cannot log in to the CMS.' },
] as const

type SectionPerms = { view: boolean; actions: boolean }
const SECTION_PERMISSIONS: Record<string, Partial<Record<SectionKey, SectionPerms>>> = {
  [ROLE_ADMIN]: Object.fromEntries(SECTIONS.map((s) => [s, { view: true, actions: true }])) as Partial<Record<SectionKey, SectionPerms>>,
  [ROLE_EDITOR]: {
    project: { view: true, actions: true }, appearance: { view: true, actions: true },
    account: { view: true, actions: true }, webMigration: { view: true, actions: true },
    help:    { view: true, actions: true }, info:          { view: true, actions: true },
  },
  [ROLE_VIEWER]: {
    project:    { view: true, actions: false }, appearance: { view: true, actions: false },
    account:    { view: true, actions: false }, help:        { view: true, actions: true },
    info:       { view: true, actions: false },
  },
  [ROLE_RESTRICTED]: {},
}

async function seed() {
  console.log('→ Seeding default roles…')

  for (const roleInput of DEFAULT_ROLES) {
    await db.insert(roles).values(roleInput).onConflictDoNothing()
  }

  const allRoles = await db.select().from(roles)
  const targetNames = DEFAULT_ROLES.map((r) => r.name)
  const defaultRoles = allRoles.filter((r) => targetNames.includes(r.name as typeof targetNames[number]))

  console.log(`→ Found ${defaultRoles.length} default roles. Seeding section permissions…`)

  for (const role of defaultRoles) {
    const permsForRole = SECTION_PERMISSIONS[role.name] ?? {}

    for (const section of SECTIONS) {
      const entry      = permsForRole[section]
      const canAccess  = entry?.view    ?? false
      const canActions = entry?.actions ?? false

      await db
        .insert(roleSectionPermissions)
        .values({ roleId: role.id, section, canAccess, canActions })
        .onConflictDoUpdate({
          target: [roleSectionPermissions.roleId, roleSectionPermissions.section],
          set:    { canAccess, canActions },
        })
    }

    console.log(`  ✓ ${role.name}`)
  }

  console.log('✅ Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
