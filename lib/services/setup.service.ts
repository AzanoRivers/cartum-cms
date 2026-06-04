import bcrypt from 'bcryptjs'
import { usersRepository } from '@/db/repositories/users.repository'
import { db } from '@/db'
import { project, roles, roleSectionPermissions, projectMemberships, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { SupportedLocale } from '@/types/project'
import { ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER, ROLE_RESTRICTED } from '@/types/roles'
import { ensureTriggers } from '@/db/adapters/ensure-triggers'
import { ensureSchemaColumns } from '@/db/adapters/ensure-schema-columns'
import { runMigrations } from '@/db/adapters/run-migrations'

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

  const [superAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isSuperAdmin, true))
    .limit(1)

  await db.insert(project).values({
    name:          input.name,
    description:   input.description ?? null,
    defaultLocale: input.locale,
    ownerId:       superAdmin?.id ?? null,
  })
}

// ── Initialize Schema ─────────────────────────────────────────────────────────

const SECTIONS = [
  'project', 'appearance', 'account', 'email', 'storage',
  'members', 'users', 'roles', 'api', 'db', 'webMigration', 'help', 'info',
] as const

type SectionKey = typeof SECTIONS[number]

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

export async function initializeSchemaService(): Promise<void> {
  const [projectRow] = await db.select().from(project).limit(1)
  if (!projectRow) {
    throw new Error('Project must be created before initializing.')
  }

  // Apply any pending migrations (idempotent — Drizzle skips already-applied ones)
  await runMigrations()

  // Ensure columns/tables that the migration runner may have skipped
  await ensureSchemaColumns()

  // Ensure DB-level triggers/functions that the migration runner can't execute (PL/pgSQL)
  await ensureTriggers()

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
      const entry     = permsForRole[section]
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
  }

  // Add every super_admin as project member with admin role (idempotent)
  const adminRole = defaultRoles.find((r) => r.name === ROLE_ADMIN)
  if (adminRole) {
    const superAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isSuperAdmin, true))
    for (const sa of superAdmins) {
      await db
        .insert(projectMemberships)
        .values({ userId: sa.id, projectId: projectRow.id, roleId: adminRole.id })
        .onConflictDoNothing()
    }
  }
}

