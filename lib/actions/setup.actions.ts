'use server'

import { cookies } from 'next/headers'
import {
  createSuperAdminService,
  createProjectService,
  initializeSchemaService,
} from '@/lib/services/setup.service'
import type { ActionResult } from '@/types/actions'
import type { SupportedLocale } from '@/types/project'
import { z } from 'zod'

const LOCALE_COOKIE = 'cartum-setup-locale'

// ── Step 1: Set locale ────────────────────────────────────────────────────────

const LocaleSchema = z.object({
  locale: z.enum(['en', 'es']),
})

export async function setDefaultLocale(
  input: { locale: SupportedLocale },
): Promise<ActionResult> {
  const parsed = LocaleSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid locale.' }

  const jar = await cookies()
  jar.set(LOCALE_COOKIE, parsed.data.locale, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   60 * 60, // 1 hour
    path:     '/setup',
    sameSite: 'lax',
  })

  return { success: true }
}

// ── Step 2: Create super admin ────────────────────────────────────────────────

const SuperAdminSchema = z.object({
  email:    z.string().email('Invalid email address.'),
  password: z.string().min(12, 'Password must be at least 12 characters.'),
  confirm:  z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match.',
  path: ['confirm'],
})

export type CreateSuperAdminInput = z.infer<typeof SuperAdminSchema>

export async function createSuperAdmin(
  input: CreateSuperAdminInput,
): Promise<ActionResult> {
  const parsed = SuperAdminSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error.' }
  }

  try {
    await createSuperAdminService({ email: parsed.data.email, password: parsed.data.password })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

// ── Step 3: Create project ────────────────────────────────────────────────────

const ProjectSchema = z.object({
  name:        z.string().min(1).max(40).regex(/^[\w\s\-_]+$/, 'Name contains invalid characters.'),
  description: z.string().max(200).optional(),
})

export type CreateProjectInput = z.infer<typeof ProjectSchema>

export async function createProject(
  input: CreateProjectInput,
): Promise<ActionResult> {
  const parsed = ProjectSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error.' }
  }

  const jar    = await cookies()
  const locale = (jar.get(LOCALE_COOKIE)?.value ?? 'en') as SupportedLocale

  try {
    await createProjectService({
      name:        parsed.data.name,
      description: parsed.data.description,
      locale,
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

// ── Step 4: Initialize schema ─────────────────────────────────────────────────

export async function initializeSchema(): Promise<ActionResult> {
  try {
    await initializeSchemaService()
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}
