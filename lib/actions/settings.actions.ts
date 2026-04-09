'use server'

import { eq, and } from 'drizzle-orm'
import { db } from '@/db'
import { project, users, usersRoles, roles, rolePermissions, nodes } from '@/db/schema'
import { auth } from '@/auth'
import { getSetting, setSetting } from '@/lib/settings/get-setting'
import { hashPassword } from '@/lib/services/auth.service'
import { getR2Client } from '@/lib/media/r2-client'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Resend } from 'resend'
import { sendWelcomeEmail } from '@/lib/email/mailer'
import type { SupportedLocale } from '@/types/project'
import type { ActionResult } from '@/types/actions'
import type {
  ProjectSettings,
  StorageSettings,
  UpdateProjectInput,
  UpdateStorageInput,
  InviteUserInput,
  RolePermissionMatrix,
} from '@/types/settings'
import { type ThemeId, THEMES } from '@/types/theme'
import { revalidatePath } from 'next/cache'
import { BUILT_IN_ROLE_NAMES, ROLE_ADMIN } from '@/types/roles'

// ── Auth guards ────────────────────────────────────────────────────────────────

async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user.isSuperAdmin) throw new Error('FORBIDDEN')
  return session
}

async function requireAdmin() {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const ok = session.user.isSuperAdmin || (session.user.roles ?? []).includes(ROLE_ADMIN)
  if (!ok) throw new Error('FORBIDDEN')
  return session
}

// ── Appearance ─────────────────────────────────────────────────────────────────

export async function updateAppearanceSettings(
  input: { theme: ThemeId },
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new Error('UNAUTHORIZED')
    const validIds = THEMES.map((t) => t.id)
    if (!validIds.includes(input.theme)) throw new Error('Invalid theme')
    await setSetting('theme', input.theme, session.user.id)
  } catch (err) {
    console.error('[updateAppearanceSettings] failed:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
  // Revalidate outside try-catch — does not affect the return value
  revalidatePath('/', 'layout')
  return { success: true }
}

// ── Project ────────────────────────────────────────────────────────────────────

export async function getProjectSettings(): Promise<ActionResult<ProjectSettings>> {
  try {
    await requireSuperAdmin()
    const [row] = await db
      .select({ name: project.name, description: project.description, defaultLocale: project.defaultLocale })
      .from(project)
      .limit(1)
    if (!row) return { success: false, error: 'No project found.' }
    return {
      success: true,
      data: { projectName: row.name, description: row.description ?? '', defaultLocale: row.defaultLocale as 'en' | 'es' },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateProjectSettings(
  input: UpdateProjectInput,
): Promise<ActionResult<void>> {
  try {
    await requireSuperAdmin()
    await db.update(project).set({ name: input.projectName, description: input.description ?? null, defaultLocale: input.defaultLocale })
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Storage ────────────────────────────────────────────────────────────────────

export async function getStorageSettings(): Promise<ActionResult<StorageSettings>> {
  try {
    await requireSuperAdmin()
    const [rbn, rpu, mvu, mvk] = await Promise.all([
      getSetting('r2_bucket_name', process.env.R2_BUCKET_NAME),
      getSetting('r2_public_url',  process.env.R2_PUBLIC_URL),
      getSetting('media_vps_url',  process.env.MEDIA_VPS_URL),
      getSetting('media_vps_key',  process.env.MEDIA_VPS_KEY),
    ])
    return {
      success: true,
      data: {
        r2BucketName: rbn ?? '',
        r2PublicUrl:  rpu ?? '',
        mediaVpsUrl:  mvu,
        mediaVpsKey:  mvk,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateStorageSettings(
  input: UpdateStorageInput,
): Promise<ActionResult<void>> {
  try {
    const session = await requireSuperAdmin()
    await Promise.all([
      setSetting('r2_bucket_name', input.r2BucketName || undefined, session.user.id),
      setSetting('r2_public_url',  input.r2PublicUrl  || undefined, session.user.id),
      setSetting('media_vps_url',  input.mediaVpsUrl  || undefined, session.user.id),
      setSetting('media_vps_key',  input.mediaVpsKey  || undefined, session.user.id),
    ])
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function testStorageConnection(): Promise<
  ActionResult<{ ok: boolean; latencyMs: number }>
> {
  try {
    await requireSuperAdmin()
    const { client, bucket } = await getR2Client()
    const testKey = `_cartum_ping_${Date.now()}`
    const started = Date.now()
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: testKey, Body: Buffer.from('1'), ContentLength: 1 }),
    )
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }))
    return { success: true, data: { ok: true, latencyMs: Date.now() - started } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection failed' }
  }
}

// ── Email ──────────────────────────────────────────────────────────────────────

export async function getEmailSettings(): Promise<ActionResult<{ resendApiKey: string; resendFromEmail: string }>> {
  try {
    await requireSuperAdmin()
    const [key, from] = await Promise.all([
      getSetting('resend_api_key',   process.env.RESEND_API_KEY),
      getSetting('resend_from_email', process.env.RESEND_FROM_EMAIL),
    ])
    return { success: true, data: { resendApiKey: key ?? '', resendFromEmail: from ?? '' } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateEmailSettings(apiKey: string, fromEmail: string): Promise<ActionResult<void>> {
  try {
    const session = await requireSuperAdmin()
    await Promise.all([
      setSetting('resend_api_key',   apiKey    || undefined, session.user.id),
      setSetting('resend_from_email', fromEmail || undefined, session.user.id),
    ])
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function testEmailConnection(): Promise<ActionResult<{ sent: boolean }>> {
  try {
    const session = await requireSuperAdmin()
    const [apiKey, fromEmail] = await Promise.all([
      getSetting('resend_api_key',   process.env.RESEND_API_KEY),
      getSetting('resend_from_email', process.env.RESEND_FROM_EMAIL),
    ])
    if (!apiKey)    return { success: false, error: 'No Resend API key configured.' }
    if (!fromEmail) return { success: false, error: 'No From email address configured.' }
    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from:    fromEmail,
      to:      session.user.email!,
      subject: 'Cartum · Email test',
      html:    '<p>Your email notification is working correctly.</p>',
    })
    if (result.error) return { success: false, error: result.error.message }
    return { success: true, data: { sent: true } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Users ──────────────────────────────────────────────────────────────────────

export interface UserWithRole {
  id:          string
  email:       string
  isSuperAdmin: boolean
  roleId:      string | null
  roleName:    string | null
  createdAt:   Date
}

export async function listUsers(): Promise<ActionResult<UserWithRole[]>> {
  try {
    await requireAdmin()
    const rows = await db
      .select({
        id:          users.id,
        email:       users.email,
        isSuperAdmin: users.isSuperAdmin,
        createdAt:   users.createdAt,
        roleId:      roles.id,
        roleName:    roles.name,
      })
      .from(users)
      .leftJoin(usersRoles, eq(usersRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, usersRoles.roleId))

    // One row per user (take first role if duplicates)
    const seen = new Set<string>()
    const result: UserWithRole[] = []
    for (const r of rows) {
      if (!seen.has(r.id)) {
        seen.add(r.id)
        result.push({
          id:          r.id,
          email:       r.email,
          isSuperAdmin: r.isSuperAdmin,
          createdAt:   r.createdAt,
          roleId:      r.roleId   ?? null,
          roleName:    r.roleName ?? null,
        })
      }
    }
    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  let out = ''
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export async function inviteUser(
  input: InviteUserInput,
): Promise<ActionResult<{ tempPassword?: string }>> {
  try {
    await requireAdmin()
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1)
    if (existing.length > 0) return { success: false, error: 'Email already registered.' }

    const rawPassword = generateTempPassword()
    const passwordHash = await hashPassword(rawPassword)
    const [newUser] = await db
      .insert(users)
      .values({ email: input.email, passwordHash })
      .returning()

    await db
      .insert(usersRoles)
      .values({ userId: newUser.id, roleId: input.roleId })
      .onConflictDoNothing()

    const localeRows = await db.select({ locale: project.defaultLocale, name: project.name }).from(project).limit(1)
    const locale      = (localeRows[0]?.locale ?? 'en') as SupportedLocale
    const projectName = localeRows[0]?.name ?? undefined
    const { sent } = await sendWelcomeEmail({
      to:          input.email,
      password:    rawPassword,
      cmsUrl:      process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      locale,
      projectName,
    })

    return { success: true, data: sent ? {} : { tempPassword: rawPassword } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateUserRole(
  userId: string,
  roleId: string,
): Promise<ActionResult<void>> {
  try {
    await requireAdmin()
    await db.delete(usersRoles).where(eq(usersRoles.userId, userId))
    await db.insert(usersRoles).values({ userId, roleId }).onConflictDoNothing()
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function removeUser(userId: string): Promise<ActionResult<void>> {
  try {
    const session = await requireSuperAdmin()
    if (userId === session.user.id)
      return { success: false, error: 'Cannot remove your own account.' }
    await db.delete(users).where(eq(users.id, userId))
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Roles ──────────────────────────────────────────────────────────────────────

export interface RoleWithCount {
  id:          string
  name:        string
  description: string | null
  isBuiltIn:   boolean
  userCount:   number
}

export interface NodePermissionRow {
  nodeId:    string
  nodeName:  string
  canRead:   boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

export async function listRolesWithCount(): Promise<ActionResult<RoleWithCount[]>> {
  try {
    await requireAdmin()
    const allRoles = await db.select().from(roles)
    const allUsersRoles = await db.select().from(usersRoles)

    const countMap = new Map<string, number>()
    for (const ur of allUsersRoles) {
      countMap.set(ur.roleId, (countMap.get(ur.roleId) ?? 0) + 1)
    }

    return {
      success: true,
      data: allRoles.map((r) => ({
        id:          r.id,
        name:        r.name,
        description: r.description ?? null,
        isBuiltIn:   (BUILT_IN_ROLE_NAMES as readonly string[]).includes(r.name),
        userCount:   countMap.get(r.id) ?? 0,
      })),
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getUsersForRole(
  roleId: string,
): Promise<ActionResult<Array<{ id: string; email: string }>>> {
  try {
    await requireAdmin()
    const rows = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .innerJoin(usersRoles, eq(usersRoles.userId, users.id))
      .where(eq(usersRoles.roleId, roleId))
    return { success: true, data: rows }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getPermissionsForRole(
  roleId: string,
): Promise<
  ActionResult<{ permissions: NodePermissionRow[]; wildcardActions: Array<'read' | 'create' | 'update' | 'delete'> }>
> {
  try {
    await requireAdmin()
    const containerNodes = await db
      .select({ id: nodes.id, name: nodes.name })
      .from(nodes)
      .where(eq(nodes.type, 'container'))

    const existingPerms = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId))

    const permMap = new Map(existingPerms.map((p) => [p.nodeId, p]))
    const permissions: NodePermissionRow[] = containerNodes.map((n) => {
      const p = permMap.get(n.id)
      return {
        nodeId:    n.id,
        nodeName:  n.name,
        canRead:   p?.canRead   ?? false,
        canCreate: p?.canCreate ?? false,
        canUpdate: p?.canUpdate ?? false,
        canDelete: p?.canDelete ?? false,
      }
    })

    const wildcardRaw = await getSetting(`role_${roleId}_wildcard`)
    let wildcardActions: Array<'read' | 'create' | 'update' | 'delete'> = []
    if (wildcardRaw) {
      try {
        const parsed = JSON.parse(wildcardRaw) as Record<string, boolean>
        if (parsed.read)   wildcardActions.push('read')
        if (parsed.create) wildcardActions.push('create')
        if (parsed.update) wildcardActions.push('update')
        if (parsed.delete) wildcardActions.push('delete')
      } catch { /* ignore malformed */ }
    }

    return { success: true, data: { permissions, wildcardActions } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function saveRolePermissions(
  matrix: RolePermissionMatrix,
): Promise<ActionResult<void>> {
  try {
    const session = await requireAdmin()

    for (const item of matrix.nodePermissions) {
      if (item.nodeId === '*') {
        const val = JSON.stringify({
          read:   item.actions.includes('read'),
          create: item.actions.includes('create'),
          update: item.actions.includes('update'),
          delete: item.actions.includes('delete'),
        })
        await setSetting(`role_${matrix.roleId}_wildcard`, val, session.user.id)
        continue
      }

      const canRead   = item.actions.includes('read')
      const canCreate = item.actions.includes('create')
      const canUpdate = item.actions.includes('update')
      const canDelete = item.actions.includes('delete')

      if (!canRead && !canCreate && !canUpdate && !canDelete) {
        await db
          .delete(rolePermissions)
          .where(
            and(
              eq(rolePermissions.roleId, matrix.roleId),
              eq(rolePermissions.nodeId, item.nodeId),
            ),
          )
      } else {
        await db
          .insert(rolePermissions)
          .values({ roleId: matrix.roleId, nodeId: item.nodeId, canRead, canCreate, canUpdate, canDelete })
          .onConflictDoUpdate({
            target: [rolePermissions.roleId, rolePermissions.nodeId],
            set:    { canRead, canCreate, canUpdate, canDelete },
          })
      }
    }

    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
