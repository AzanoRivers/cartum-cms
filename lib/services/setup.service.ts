import bcrypt from 'bcryptjs'
import { usersRepository } from '@/db/repositories/users.repository'
import { db } from '@/db'
import { project, roles, roleSectionPermissions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { SupportedLocale } from '@/types/project'
import { ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER, ROLE_RESTRICTED } from '@/types/roles'

// ── Create Super Admin ────────────────────────────────────────────────────────

type CreateSuperAdminInput = {
  email: string
  password: string
}

export async function createSuperAdminService(input: CreateSuperAdminInput): Promise<void> {
  // Idempotent: if a super admin already exists, skip silently.
  // This lets users safely retry Step 2 after a reload without errors.
  const existing = await usersRepository.findByEmail(input.email)
  if (existing?.isSuperAdmin) return

  // If the email belongs to a non-super-admin user, that's an error.
  if (existing) {
    throw new Error('An account with this email already exists.')
  }

  const passwordHash = await bcrypt.hash(input.password, 12)

  await usersRepository.create({
    email:        input.email,
    passwordHash,
    isSuperAdmin: true,
  })
}

// ── Create Project ────────────────────────────────────────────────────────────

type CreateProjectInput = {
  name:         string
  description?: string
  locale:       SupportedLocale
}

export async function createProjectService(input: CreateProjectInput): Promise<void> {
  // Idempotent: if project already exists, skip silently.
  const existing = await db.select().from(project).limit(1)
  if (existing.length > 0) return

  await db.insert(project).values({
    name:          input.name,
    description:   input.description ?? null,
    defaultLocale: input.locale,
  })
}

// ── Initialize Schema ─────────────────────────────────────────────────────────

const SECTIONS = [
  'project', 'appearance', 'account', 'email', 'storage',
  'users', 'roles', 'api', 'db', 'info',
] as const

type SectionKey = typeof SECTIONS[number]

const DEFAULT_ROLES = [
  { name: ROLE_ADMIN,      description: 'Full access. Can manage users, roles, content, and settings.' },
  { name: ROLE_EDITOR,     description: 'Content editor. Can create and update records in assigned nodes.' },
  { name: ROLE_VIEWER,     description: 'Read-only. Can view records without modifying them.' },
  { name: ROLE_RESTRICTED, description: 'Suspended access. Cannot log in to the CMS.' },
] as const

const SECTION_PERMISSIONS: Record<string, Partial<Record<SectionKey, boolean>>> = {
  [ROLE_ADMIN]:      { project: true, appearance: true, account: true, email: true, storage: true, users: true, roles: true, api: true, db: true, info: true },
  [ROLE_EDITOR]:     { appearance: true, account: true, info: true },
  [ROLE_VIEWER]:     { appearance: true, account: true, info: true },
  [ROLE_RESTRICTED]: {},
}

export async function initializeSchemaService(): Promise<void> {
  const [projectRow] = await db.select().from(project).limit(1)
  if (!projectRow) {
    throw new Error('Project must be created before initializing.')
  }

  // Create default roles (idempotent)
  for (const role of DEFAULT_ROLES) {
    await db.insert(roles).values(role).onConflictDoNothing()
  }

  // Seed section permissions for each default role (idempotent)
  const defaultRoleNames = DEFAULT_ROLES.map((r) => r.name)
  const allRoles = await db.select().from(roles)
  const defaultRoles = allRoles.filter((r) => defaultRoleNames.includes(r.name as typeof defaultRoleNames[number]))

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
  }
}

