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
  'users', 'roles', 'api', 'db', 'info',
] as const

const DEFAULT_ROLES = [
  { name: ROLE_ADMIN,      description: 'Full access. Can manage users, roles, content, and settings.' },
  { name: ROLE_EDITOR,     description: 'Content editor. Can create and update records in assigned nodes.' },
  { name: ROLE_VIEWER,     description: 'Read-only. Can view records without modifying them.' },
  { name: ROLE_RESTRICTED, description: 'Suspended access. Cannot log in to the CMS.' },
] as const

/** canAccess per section per role name */
const SECTION_PERMISSIONS: Record<string, Partial<Record<SectionKey, boolean>>> = {
  [ROLE_ADMIN]:      { project: true, appearance: true, account: true, email: true, storage: true, users: true, roles: true, api: true, db: true, info: true },
  [ROLE_EDITOR]:     { appearance: true, account: true, info: true },
  [ROLE_VIEWER]:     { appearance: true, account: true, info: true },
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
      const canAccess = permsForRole[section] === true

      await db
        .insert(roleSectionPermissions)
        .values({ roleId: role.id, section, canAccess })
        .onConflictDoUpdate({
          target: [roleSectionPermissions.roleId, roleSectionPermissions.section],
          set:    { canAccess },
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
