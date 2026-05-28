'use server'

import { eq, and, ne, asc } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { project, users, usersRoles, roles, rolePermissions, nodes, media, projectMemberships } from '@/db/schema'
import { usersRepository } from '@/db/repositories/users.repository'
import { del as blobDel } from '@vercel/blob'
import { auth } from '@/auth'
import { getSetting, setSetting } from '@/lib/settings/get-setting'
import { ACTIVE_PROJECT_COOKIE } from '@/lib/auth/constants'
import { hashPassword } from '@/lib/services/auth.service'
import { getR2Client } from '@/lib/media/r2-client'
import { blobUpload, blobDelete, isBlobConfigured } from '@/lib/media/blob-client'
import { PutObjectCommand, DeleteObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3'
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
  WebMigrationSettings,
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
    const cookieStore  = await cookies()
    const projectId    = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? session.user.currentProjectId
    const settingKey   = projectId ? `theme:${projectId}` : 'theme'
    await setSetting(settingKey, input.theme, session.user.id)
  } catch (err) {
    console.error('[updateAppearanceSettings] failed:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
  revalidatePath('/', 'layout')
  return { success: true }
}

// ── Project ────────────────────────────────────────────────────────────────────

export async function getProjectSettings(): Promise<ActionResult<ProjectSettings>> {
  try {
    const session = await requireSuperAdmin()
    const projectId = session.user.currentProjectId ?? null
    const query = db
      .select({ name: project.name, description: project.description, defaultLocale: project.defaultLocale })
      .from(project)
    const [row] = projectId
      ? await query.where(eq(project.id, projectId)).limit(1)
      : await query.orderBy(project.createdAt).limit(1)
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
    const session = await requireSuperAdmin()
    const projectId = session.user.currentProjectId ?? null
    if (!projectId) return { success: false, error: 'No project selected.' }
    await db
      .update(project)
      .set({ name: input.projectName, description: input.description ?? null, defaultLocale: input.defaultLocale })
      .where(eq(project.id, projectId))
    revalidatePath('/', 'layout')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Project (user projects — owns only, super admin) ─────────────────────────

export type UserProjectRow = {
  id:        string
  name:      string
  createdAt: Date
}

export async function listUserProjects(): Promise<
  ActionResult<{ projects: UserProjectRow[]; currentProjectId: string | null }>
> {
  try {
    const session = await requireSuperAdmin()
    const userId  = session.user.id
    const rows    = await db
      .select({ id: project.id, name: project.name, createdAt: project.createdAt })
      .from(project)
      .where(eq(project.ownerId, userId))
      .orderBy(asc(project.createdAt))
    return { success: true, data: { projects: rows, currentProjectId: session.user.currentProjectId ?? null } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getProjectSettingsById(projectId: string): Promise<ActionResult<ProjectSettings>> {
  try {
    const session = await requireSuperAdmin()
    const userId  = session.user.id
    const [row]   = await db
      .select({ name: project.name, description: project.description, defaultLocale: project.defaultLocale })
      .from(project)
      .where(and(eq(project.id, projectId), eq(project.ownerId, userId)))
      .limit(1)
    if (!row) return { success: false, error: 'Project not found.' }
    return {
      success: true,
      data: { projectName: row.name, description: row.description ?? '', defaultLocale: row.defaultLocale as 'en' | 'es' },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateProjectSettingsById(
  projectId: string,
  input: UpdateProjectInput,
): Promise<ActionResult<void>> {
  try {
    const session = await requireSuperAdmin()
    const userId  = session.user.id
    const [owned] = await db
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.id, projectId), eq(project.ownerId, userId)))
      .limit(1)
    if (!owned) return { success: false, error: 'Project not found.' }
    await db
      .update(project)
      .set({ name: input.projectName, description: input.description ?? null, defaultLocale: input.defaultLocale })
      .where(eq(project.id, projectId))
    revalidatePath('/', 'layout')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function deleteUserProject(projectId: string): Promise<ActionResult<void>> {
  try {
    const session = await requireSuperAdmin()
    const userId  = session.user.id

    // 1. List all projects owned by this user
    const ownedProjects = await db
      .select({ id: project.id })
      .from(project)
      .where(eq(project.ownerId, userId))

    // Guard: cannot delete if it's the only project
    if (ownedProjects.length <= 1) {
      return { success: false, error: 'CANNOT_DELETE_LAST_PROJECT' }
    }

    // Verify user owns this specific project
    const isOwned = ownedProjects.some((p) => p.id === projectId)
    if (!isOwned) return { success: false, error: 'Project not found.' }

    // 2. Collect media files before cascade deletes them
    const mediaRows = await db
      .select({ key: media.key, publicUrl: media.publicUrl, storageProvider: media.storageProvider })
      .from(media)
      .where(eq(media.projectId, projectId))

    // 3. Nullify ownerId (FK onDelete:'restrict' — must clear before deleting project)
    await db.update(project).set({ ownerId: null }).where(eq(project.id, projectId))

    // 4. Delete project — cascade handles: nodes, records, memberships, invitations, settings
    //    Users are NOT deleted (as opposed to deleteCartumProject)
    await db.delete(project).where(eq(project.id, projectId))

    // 5. Purge storage files (best-effort — don't fail the action if storage is unreachable)
    let r2: Awaited<ReturnType<typeof getR2Client>> | null = null
    try { r2 = await getR2Client() } catch { /* not configured */ }
    const blobToken = await getSetting('blob_token', process.env.BLOB_READ_WRITE_TOKEN).catch(() => null)

    await Promise.allSettled(
      mediaRows.map(async (row) => {
        if (row.storageProvider === 'blob') {
          if (blobToken) await blobDel(row.publicUrl, { token: blobToken })
        } else {
          if (r2) await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: row.key }))
        }
      }),
    )

    revalidatePath('/cms', 'layout')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Storage ────────────────────────────────────────────────────────────────────

export async function getStorageSettings(): Promise<ActionResult<StorageSettings>> {
  try {
    await requireSuperAdmin()
    const [rbn, rpu, mvu, mvk, bt, sp] = await Promise.all([
      getSetting('r2_bucket_name',   process.env.R2_BUCKET_NAME),
      getSetting('r2_public_url',    process.env.R2_PUBLIC_URL),
      getSetting('media_vps_url',    process.env.MEDIA_VPS_URL),
      getSetting('media_vps_key',    process.env.MEDIA_VPS_KEY),
      getSetting('blob_token',       process.env.BLOB_READ_WRITE_TOKEN),
      getSetting('storage_provider', 'r2'),
    ])
    return {
      success: true,
      data: {
        r2BucketName:    rbn ?? '',
        r2PublicUrl:     rpu ?? '',
        mediaVpsUrl:     mvu,
        mediaVpsKey:     mvk,
        blobToken:       bt ?? '',
        storageProvider: (sp === 'blob' ? 'blob' : 'r2'),
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
      setSetting('r2_bucket_name',   input.r2BucketName    || undefined, session.user.id),
      setSetting('r2_public_url',    input.r2PublicUrl      || undefined, session.user.id),
      setSetting('media_vps_url',    input.mediaVpsUrl      || undefined, session.user.id),
      setSetting('media_vps_key',    input.mediaVpsKey      || undefined, session.user.id),
      setSetting('blob_token',       input.blobToken        || undefined, session.user.id),
      setSetting('storage_provider', input.storageProvider  || 'r2',      session.user.id),
    ])

    // Auto-configure CORS on R2 bucket so the browser can fetch files directly
    // (needed for client-side ZIP export — GET/HEAD only, safe for public media)
    try {
      const { client, bucket } = await getR2Client()
      await client.send(new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [{
            AllowedOrigins: ['*'],
            AllowedMethods: ['GET', 'HEAD'],
            AllowedHeaders: ['*'],
            MaxAgeSeconds: 3600,
          }],
        },
      }))
    } catch { /* R2 not configured yet or CORS already set — skip */ }

    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateStorageProvider(
  provider: 'r2' | 'blob',
): Promise<ActionResult<void>> {
  try {
    const session = await requireSuperAdmin()
    await setSetting('storage_provider', provider, session.user.id)
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

export async function testBlobConnection(): Promise<
  ActionResult<{ ok: boolean; latencyMs: number }>
> {
  try {
    await requireSuperAdmin()
    const testPath = `_cartum_ping_${Date.now()}.txt`
    const started  = Date.now()
    const { publicUrl } = await blobUpload(testPath, Buffer.from('1'), 'text/plain')
    await blobDelete(publicUrl)
    return { success: true, data: { ok: true, latencyMs: Date.now() - started } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection failed' }
  }
}

export async function getStorageStatus(): Promise<
  ActionResult<{ r2Configured: boolean; blobConfigured: boolean; activeProvider: 'r2' | 'blob' }>
> {
  try {
    await requireSuperAdmin()
    const [rbn, rpu, bt, sp] = await Promise.all([
      getSetting('r2_bucket_name',   process.env.R2_BUCKET_NAME),
      getSetting('r2_public_url',    process.env.R2_PUBLIC_URL),
      getSetting('blob_token',       process.env.BLOB_READ_WRITE_TOKEN),
      getSetting('storage_provider', 'r2'),
    ])
    return {
      success: true,
      data: {
        r2Configured:   Boolean(rbn && rpu),
        blobConfigured: Boolean(bt),
        activeProvider: (sp === 'blob' ? 'blob' : 'r2'),
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
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
  id:                   string
  email:                string
  isSuperAdmin:         boolean
  roleId:               string | null
  roleName:             string | null
  createdAt:            Date
  cartumSuscriptor:     boolean
  cartumSuscriptorTime: number
}

export async function listUsers(): Promise<ActionResult<UserWithRole[]>> {
  try {
    await requireAdmin()
    const rows = await db
      .select({
        id:                   users.id,
        email:                users.email,
        isSuperAdmin:         users.isSuperAdmin,
        createdAt:            users.createdAt,
        cartumSuscriptor:     users.cartumSuscriptor,
        cartumSuscriptorTime: users.cartumSuscriptorTime,
        roleId:               roles.id,
        roleName:             roles.name,
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
          id:                   r.id,
          email:                r.email,
          isSuperAdmin:         r.isSuperAdmin,
          createdAt:            r.createdAt,
          cartumSuscriptor:     r.cartumSuscriptor,
          cartumSuscriptorTime: r.cartumSuscriptorTime ?? 0,
          roleId:               r.roleId   ?? null,
          roleName:             r.roleName ?? null,
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
    const existing = await usersRepository.findByEmail(input.email)
    if (existing) return { success: false, error: 'Email already registered.' }

    const rawPassword = generateTempPassword()
    const passwordHash = await hashPassword(rawPassword)
    const newUser = await usersRepository.create({ email: input.email, passwordHash })

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

export async function setUserSubscription(
  userId: string,
  active: boolean,
): Promise<ActionResult<void>> {
  try {
    await requireSuperAdmin()
    await db.update(users).set({ cartumSuscriptor: active }).where(eq(users.id, userId))
    return { success: true, data: undefined }
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

// ── Web Migration ──────────────────────────────────────────────────────────────

export async function getWebMigrationSettings(): Promise<ActionResult<WebMigrationSettings>> {
  try {
    await requireSuperAdmin()
    const [url, key] = await Promise.all([
      getSetting('scraper_api_url', process.env.SCRAPER_API_URL),
      getSetting('scraper_api_key', process.env.SCRAPER_API_KEY),
    ])
    return {
      success: true,
      data: {
        scraperApiUrl: url ?? 'https://scraper.azanolabs.com',
        scraperApiKey: key ?? '',
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateWebMigrationSettings(
  settings: WebMigrationSettings,
): Promise<ActionResult<void>> {
  try {
    const session = await requireSuperAdmin()
    await Promise.all([
      setSetting('scraper_api_url', settings.scraperApiUrl || undefined, session.user.id),
      setSetting('scraper_api_key', settings.scraperApiKey || undefined, session.user.id),
    ])
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Cartum Projects (super admin only) ────────────────────────────────────────

export type CartumProjectRow = {
  id:                string
  name:              string
  createdAt:         Date
  ownerEmail:        string | null
  ownerIsSuperAdmin: boolean | null
}

export async function listCartumProjects(): Promise<ActionResult<CartumProjectRow[]>> {
  try {
    await requireSuperAdmin()
    const rows = await db
      .select({
        id:                project.id,
        name:              project.name,
        createdAt:         project.createdAt,
        ownerEmail:        users.email,
        ownerIsSuperAdmin: users.isSuperAdmin,
      })
      .from(project)
      .leftJoin(users, eq(users.id, project.ownerId))
      .orderBy(asc(project.createdAt))
    return { success: true, data: rows }
  } catch {
    return { success: false, error: 'Unauthorized' }
  }
}

export async function deleteCartumProject(projectId: string): Promise<ActionResult<void>> {
  try {
    await requireSuperAdmin()

    // 1. Collect media files before cascade deletes them
    const mediaRows = await db
      .select({ key: media.key, publicUrl: media.publicUrl, storageProvider: media.storageProvider })
      .from(media)
      .where(eq(media.projectId, projectId))

    // 2. Find non-superAdmin members who ONLY belong to this project
    const members = await db
      .select({ userId: projectMemberships.userId })
      .from(projectMemberships)
      .where(eq(projectMemberships.projectId, projectId))

    const memberIds = members.map((m) => m.userId)

    const usersToDelete: string[] = []
    for (const userId of memberIds) {
      const isSA = await usersRepository.isSuperAdmin(userId)
      if (isSA) continue

      const allMemberships = await db
        .select({ projectId: projectMemberships.projectId })
        .from(projectMemberships)
        .where(and(
          eq(projectMemberships.userId, userId),
          ne(projectMemberships.projectId, projectId),
        ))

      if (allMemberships.length === 0) {
        usersToDelete.push(userId)
      }
    }

    // 3. Nullify ownerId (project has onDelete: 'restrict' on users FK)
    await db.update(project).set({ ownerId: null }).where(eq(project.id, projectId))

    // 4. Delete the project (cascade handles nodes, records, media rows, memberships, tokens, settings)
    await db.delete(project).where(eq(project.id, projectId))

    // 5. Delete orphaned users
    for (const userId of usersToDelete) {
      await db.delete(users).where(eq(users.id, userId))
    }

    // 6. Purge storage files (best-effort)
    let r2: Awaited<ReturnType<typeof getR2Client>> | null = null
    try { r2 = await getR2Client() } catch { /* not configured */ }
    const blobToken = await getSetting('blob_token', process.env.BLOB_READ_WRITE_TOKEN).catch(() => null)

    await Promise.allSettled(
      mediaRows.map(async (row) => {
        if (row.storageProvider === 'blob') {
          if (blobToken) await blobDel(row.publicUrl, { token: blobToken })
        } else {
          if (r2) await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: row.key }))
        }
      }),
    )

    revalidatePath('/cms', 'layout')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
