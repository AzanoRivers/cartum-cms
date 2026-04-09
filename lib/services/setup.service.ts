import bcrypt from 'bcryptjs'
import { usersRepository } from '@/db/repositories/users.repository'
import { db } from '@/db'
import { project, roles } from '@/db/schema'
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

const DEFAULT_ROLES = [
  { name: ROLE_ADMIN,      description: 'Full access to all nodes and records' },
  { name: ROLE_EDITOR,     description: 'Can create and update records, cannot delete nodes' },
  { name: ROLE_VIEWER,     description: 'Read-only access to all records' },
  { name: ROLE_RESTRICTED, description: 'Suspended access. Cannot log in to the CMS.' },
]

export async function initializeSchemaService(): Promise<void> {
  const [projectRow] = await db.select().from(project).limit(1)
  if (!projectRow) {
    throw new Error('Project must be created before initializing.')
  }

  for (const role of DEFAULT_ROLES) {
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.name, role.name))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(roles).values(role)
    }
  }
}

