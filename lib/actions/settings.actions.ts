'use server'

import { eq, and, ne, asc, count, sum, sql } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { project, users, usersRoles, roles, rolePermissions, nodes, media, projectMemberships, appSettings } from '@/db/schema'
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
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { requireProjectId } from '@/lib/auth/get-project-id'

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
    const session = await auth()
    if (!session) throw new Error('UNAUTHORIZED')
    const userId = session.user.id

    let rows: UserProjectRow[]

    if (session.user.isSuperAdmin) {
      // SuperAdmin: projects they own
      rows = await db
        .select({ id: project.id, name: project.name, createdAt: project.createdAt })
        .from(project)
        .where(eq(project.ownerId, userId))
        .orderBy(asc(project.createdAt))
    } else {
      // Admin/member: projects they belong to via projectMemberships
      rows = await db
        .select({ id: project.id, name: project.name, createdAt: project.createdAt })
        .from(project)
        .innerJoin(projectMemberships, eq(projectMemberships.projectId, project.id))
        .where(eq(projectMemberships.userId, userId))
        .orderBy(asc(project.createdAt))
    }

    return { success: true, data: { projects: rows, currentProjectId: session.user.currentProjectId ?? null } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getProjectSettingsById(projectId: string): Promise<ActionResult<ProjectSettings & { isOwner: boolean }>> {
  try {
    const session = await auth()
    if (!session) throw new Error('UNAUTHORIZED')
    const userId = session.user.id

    // Must be owner, superAdmin, or project admin member
    const canAccess = session.user.isSuperAdmin
      || (session.user.roles ?? []).includes(ROLE_ADMIN)
      || await projectMembershipsRepository.isMemberWithRole(userId, projectId, 'admin')
    if (!canAccess) return { success: false, error: 'Forbidden.' }

    const [row] = await db
      .select({ name: project.name, description: project.description, defaultLocale: project.defaultLocale, ownerId: project.ownerId })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)
    if (!row) return { success: false, error: 'Project not found.' }

    return {
      success: true,
      data: {
        projectName:    row.name,
        description:    row.description ?? '',
        defaultLocale:  row.defaultLocale as 'en' | 'es',
        isOwner:        session.user.isSuperAdmin || row.ownerId === userId,
      },
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
    const session = await auth()
    if (!session) throw new Error('UNAUTHORIZED')
    const userId = session.user.id

    const canAccess = session.user.isSuperAdmin
      || (session.user.roles ?? []).includes(ROLE_ADMIN)
      || await projectMembershipsRepository.isMemberWithRole(userId, projectId, 'admin')
    if (!canAccess) return { success: false, error: 'Forbidden.' }

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

import type { StorageSettingsIsSet } from '@/types/settings'

/** Guard: superAdmin or project admin. Returns session + isSuperAdmin + projectId. */
async function requireStorageAccess() {
  const session   = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const projectId = await requireProjectId()
  const canAccess = session.user.isSuperAdmin
    || (session.user.roles ?? []).includes(ROLE_ADMIN)
    || await projectMembershipsRepository.isMemberWithRole(session.user.id, projectId, 'admin')
  if (!canAccess) throw new Error('FORBIDDEN')
  return { session, projectId, isSuperAdmin: session.user.isSuperAdmin }
}

/** Resolves project-scoped storage setting: project key → global key → env fallback. */
async function resolveStorageSetting(key: string, envFallback: string | undefined, projectId: string) {
  return (
    (await getSetting(`${key}:${projectId}`)) ??
    (await getSetting(key, envFallback))
  )
}

export async function getStorageSettings(): Promise<
  ActionResult<{ settings: StorageSettings; isSet: StorageSettingsIsSet }>
> {
  try {
    const { projectId, isSuperAdmin } = await requireStorageAccess()

    const [ep, ak, sk, rbn, rpu, mvu, mvk, bt, sp] = await Promise.all([
      resolveStorageSetting('r2_endpoint',      process.env.R2_ENDPOINT,          projectId),
      resolveStorageSetting('r2_access_key_id', process.env.R2_ACCESS_KEY_ID,     projectId),
      resolveStorageSetting('r2_secret_key',    process.env.R2_SECRET_ACCESS_KEY, projectId),
      resolveStorageSetting('r2_bucket_name',   process.env.R2_BUCKET_NAME,       projectId),
      resolveStorageSetting('r2_public_url',    process.env.R2_PUBLIC_URL,        projectId),
      resolveStorageSetting('media_vps_url',    process.env.MEDIA_VPS_URL,        projectId),
      resolveStorageSetting('media_vps_key',    process.env.MEDIA_VPS_KEY,        projectId),
      resolveStorageSetting('blob_token',       process.env.BLOB_READ_WRITE_TOKEN, projectId),
      resolveStorageSetting('storage_provider', 'r2',                             projectId),
    ])

    const isSet: StorageSettingsIsSet = {
      r2Endpoint:        Boolean(ep),
      r2AccessKeyId:     Boolean(ak),
      r2SecretAccessKey: Boolean(sk),
      r2BucketName:      Boolean(rbn),
      r2PublicUrl:       Boolean(rpu),
      mediaVpsUrl:       Boolean(mvu),
      mediaVpsKey:       Boolean(mvk),
      blobToken:         Boolean(bt),
    }

    const settings: StorageSettings = {
      r2Endpoint:        isSuperAdmin ? (ep  ?? '') : '',
      r2AccessKeyId:     isSuperAdmin ? (ak  ?? '') : '',
      r2SecretAccessKey: isSuperAdmin ? (sk  ?? '') : '',
      r2BucketName:      isSuperAdmin ? (rbn ?? '') : '',
      r2PublicUrl:       rpu ?? '',  // non-secret — all roles can see
      mediaVpsUrl:       mvu ?? '',  // non-secret URL — all roles see
      mediaVpsKey:       isSuperAdmin ? (mvk ?? '') : '',
      blobToken:         isSuperAdmin ? (bt  ?? '') : '',
      storageProvider:   (sp === 'blob' ? 'blob' : 'r2'),
    }

    return { success: true, data: { settings, isSet } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateStorageSettings(
  input: UpdateStorageInput,
): Promise<ActionResult<void>> {
  try {
    const { session, projectId } = await requireStorageAccess()
    const uid = session.user.id

    const saves: Promise<void>[] = []
    const save = (key: string, val: string | undefined) => {
      if (val) saves.push(setSetting(`${key}:${projectId}`, val, uid))
    }

    save('r2_endpoint',      input.r2Endpoint)
    save('r2_access_key_id', input.r2AccessKeyId)
    save('r2_secret_key',    input.r2SecretAccessKey)
    save('r2_bucket_name',   input.r2BucketName)
    save('r2_public_url',    input.r2PublicUrl)
    save('media_vps_url',    input.mediaVpsUrl)
    save('media_vps_key',    input.mediaVpsKey)
    save('blob_token',       input.blobToken)
    if (input.storageProvider) {
      saves.push(setSetting(`storage_provider:${projectId}`, input.storageProvider, uid))
    }

    await Promise.all(saves)

    // Auto-configure CORS on R2 bucket
    try {
      const { client, bucket } = await getR2Client(projectId)
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
    } catch { /* R2 not yet configured — skip */ }

    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateStorageProvider(
  provider: 'r2' | 'blob',
): Promise<ActionResult<void>> {
  try {
    const { session, projectId } = await requireStorageAccess()
    await setSetting(`storage_provider:${projectId}`, provider, session.user.id)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function testStorageConnection(): Promise<
  ActionResult<{ ok: boolean; latencyMs: number }>
> {
  try {
    const { projectId } = await requireStorageAccess()
    const { client, bucket } = await getR2Client(projectId)
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
    await requireStorageAccess()
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
    const { projectId } = await requireStorageAccess()
    const [ep, ak, sk, rbn, rpu, bt, sp] = await Promise.all([
      resolveStorageSetting('r2_endpoint',      process.env.R2_ENDPOINT,           projectId),
      resolveStorageSetting('r2_access_key_id', process.env.R2_ACCESS_KEY_ID,      projectId),
      resolveStorageSetting('r2_secret_key',    process.env.R2_SECRET_ACCESS_KEY,  projectId),
      resolveStorageSetting('r2_bucket_name',   process.env.R2_BUCKET_NAME,        projectId),
      resolveStorageSetting('r2_public_url',    process.env.R2_PUBLIC_URL,         projectId),
      resolveStorageSetting('blob_token',       process.env.BLOB_READ_WRITE_TOKEN, projectId),
      resolveStorageSetting('storage_provider', 'r2',                              projectId),
    ])
    return {
      success: true,
      data: {
        r2Configured:   Boolean(ep && ak && sk && rbn && rpu),
        blobConfigured: Boolean(bt),
        activeProvider: (sp === 'blob' ? 'blob' : 'r2'),
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Email ──────────────────────────────────────────────────────────────────────

/** Resolves project-scoped email setting with fallback to global then env. */
async function resolveEmailSetting(key: string, envFallback: string | undefined, projectId: string) {
  return (
    (await getSetting(`${key}:${projectId}`)) ??
    (await getSetting(key, envFallback))
  )
}

/** Guard: superAdmin or project admin. Returns session + isSuperAdmin. */
async function requireEmailAccess() {
  const session   = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const projectId = await requireProjectId()
  const canAccess = session.user.isSuperAdmin
    || (session.user.roles ?? []).includes(ROLE_ADMIN)
    || await projectMembershipsRepository.isMemberWithRole(session.user.id, projectId, 'admin')
  if (!canAccess) throw new Error('FORBIDDEN')
  return { session, projectId, isSuperAdmin: session.user.isSuperAdmin }
}

export async function getEmailSettings(): Promise<ActionResult<{
  resendApiKey:    string   // full key for superAdmin, '' for admin
  resendFromEmail: string
  apiKeyIsSet:     boolean  // whether a key exists (shown to admin without revealing value)
}>> {
  try {
    const { projectId, isSuperAdmin } = await requireEmailAccess()
    const [key, from] = await Promise.all([
      resolveEmailSetting('resend_api_key',   process.env.RESEND_API_KEY,   projectId),
      resolveEmailSetting('resend_from_email', process.env.RESEND_FROM_EMAIL, projectId),
    ])
    return {
      success: true,
      data: {
        resendApiKey:    isSuperAdmin ? (key ?? '') : '',
        resendFromEmail: from ?? '',
        apiKeyIsSet:     Boolean(key),
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateEmailSettings(apiKey: string, fromEmail: string): Promise<ActionResult<void>> {
  try {
    const { session, projectId } = await requireEmailAccess()
    await Promise.all([
      apiKey    ? setSetting(`resend_api_key:${projectId}`,    apiKey,     session.user.id) : Promise.resolve(),
      fromEmail ? setSetting(`resend_from_email:${projectId}`, fromEmail,  session.user.id) : Promise.resolve(),
    ])
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function testEmailConnection(): Promise<ActionResult<{ sent: boolean }>> {
  try {
    const { session, projectId } = await requireEmailAccess()
    const [apiKey, fromEmail] = await Promise.all([
      resolveEmailSetting('resend_api_key',   process.env.RESEND_API_KEY,   projectId),
      resolveEmailSetting('resend_from_email', process.env.RESEND_FROM_EMAIL, projectId),
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

/** Lists all members of the current active project. Accessible by any project member. */
export async function listProjectUsers(): Promise<ActionResult<UserWithRole[]>> {
  try {
    const session = await auth()
    if (!session) throw new Error('UNAUTHORIZED')
    const projectId = await requireProjectId()

    const rows = await db
      .select({
        id:                   users.id,
        email:                users.email,
        isSuperAdmin:         users.isSuperAdmin,
        createdAt:            users.createdAt,
        cartumSuscriptor:     users.cartumSuscriptor,
        cartumSuscriptorTime: users.cartumSuscriptorTime,
        roleId:               projectMemberships.roleId,
        roleName:             roles.name,
      })
      .from(projectMemberships)
      .innerJoin(users, eq(users.id, projectMemberships.userId))
      .innerJoin(roles, eq(roles.id, projectMemberships.roleId))
      .where(eq(projectMemberships.projectId, projectId))
      .orderBy(asc(users.email))

    return {
      success: true,
      data: rows.map((r) => ({
        ...r,
        cartumSuscriptorTime: r.cartumSuscriptorTime ?? 0,
      })),
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/** Kept for backward-compat (super-admin global view). */
export async function listUsers(): Promise<ActionResult<UserWithRole[]>> {
  return listProjectUsers()
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
    const session = await auth()
    if (!session) throw new Error('UNAUTHORIZED')
    const projectId = await requireProjectId()

    // Only super_admin or project admin can invite
    const canInvite = session.user.isSuperAdmin
      || (session.user.roles ?? []).includes(ROLE_ADMIN)
      || await projectMembershipsRepository.isMemberWithRole(session.user.id, projectId, 'admin')
    if (!canInvite) throw new Error('FORBIDDEN')

    const existing = await usersRepository.findByEmail(input.email)
    if (existing) {
      // User exists — just add to this project if not already a member
      const alreadyMember = await projectMembershipsRepository.isMember(existing.id, projectId)
      if (alreadyMember) return { success: false, error: 'Email already a member of this project.' }
      await projectMembershipsRepository.addMember(existing.id, projectId, input.roleId)
      return { success: true, data: {} }
    }

    const rawPassword  = generateTempPassword()
    const passwordHash = await hashPassword(rawPassword)
    const newUser      = await usersRepository.create({ email: input.email, passwordHash })

    await projectMembershipsRepository.addMember(newUser.id, projectId, input.roleId)

    const [projRow] = await db
      .select({ locale: project.defaultLocale, name: project.name })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)

    const locale      = (projRow?.locale ?? 'en') as SupportedLocale
    const projectName = projRow?.name ?? undefined
    const { sent }    = await sendWelcomeEmail({
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

/** Removes a user from the active project (not from the DB). Admin or super_admin only. */
export async function removeProjectMember(userId: string): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) throw new Error('UNAUTHORIZED')
    const projectId = await requireProjectId()

    if (userId === session.user.id)
      return { success: false, error: 'Cannot remove yourself from the project.' }

    const targetSuperAdmin = await usersRepository.isSuperAdmin(userId)
    if (targetSuperAdmin)
      return { success: false, error: 'Cannot remove a super admin.' }

    const canRemove = session.user.isSuperAdmin
      || (session.user.roles ?? []).includes(ROLE_ADMIN)
      || await projectMembershipsRepository.isMemberWithRole(session.user.id, projectId, 'admin')
    if (!canRemove) throw new Error('FORBIDDEN')

    await projectMembershipsRepository.removeMember(userId, projectId)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Global user management (superAdmin only) ──────────────────────────────────

const TRIAL_SECONDS = 7 * 86_400

export interface GlobalUserRow {
  id:                   string
  email:                string
  isSuperAdmin:         boolean
  cartumSuscriptor:     boolean
  cartumSuscriptorTime: number
  projectCount:         number
  ownedCount:           number
  isBanned:             boolean
  createdAt:            Date
}

export async function listAllUsersAdmin(): Promise<ActionResult<GlobalUserRow[]>> {
  try {
    await requireSuperAdmin()

    const [allUsers, memberships, ownedCounts, bannedKeys] = await Promise.all([
      db.select({
        id:                   users.id,
        email:                users.email,
        isSuperAdmin:         users.isSuperAdmin,
        cartumSuscriptor:     users.cartumSuscriptor,
        cartumSuscriptorTime: users.cartumSuscriptorTime,
        createdAt:            users.createdAt,
      }).from(users).orderBy(asc(users.email)),

      db.select({ userId: projectMemberships.userId })
        .from(projectMemberships),

      db.select({ ownerId: project.ownerId })
        .from(project)
        .where(sql`${project.ownerId} IS NOT NULL`),

      db.select({ key: appSettings.key })
        .from(appSettings)
        .where(sql`${appSettings.key} LIKE 'user_banned:%'`),
    ])

    const memberCount = new Map<string, number>()
    for (const m of memberships) {
      memberCount.set(m.userId, (memberCount.get(m.userId) ?? 0) + 1)
    }

    const ownerCount = new Map<string, number>()
    for (const o of ownedCounts) {
      if (o.ownerId) ownerCount.set(o.ownerId, (ownerCount.get(o.ownerId) ?? 0) + 1)
    }

    const bannedSet = new Set(bannedKeys.map((k) => k.key.replace('user_banned:', '')))

    return {
      success: true,
      data: allUsers.map((u) => ({
        id:                   u.id,
        email:                u.email,
        isSuperAdmin:         u.isSuperAdmin,
        cartumSuscriptor:     u.cartumSuscriptor,
        cartumSuscriptorTime: u.cartumSuscriptorTime ?? 0,
        projectCount:         memberCount.get(u.id) ?? 0,
        ownedCount:           ownerCount.get(u.id) ?? 0,
        isBanned:             bannedSet.has(u.id),
        createdAt:            u.createdAt,
      })),
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function banUserAction(userId: string): Promise<ActionResult<void>> {
  try {
    const session = await requireSuperAdmin()
    if (userId === session.user.id) return { success: false, error: 'Cannot ban yourself.' }
    const target = await usersRepository.findById(userId)
    if (target?.isSuperAdmin) return { success: false, error: 'Cannot ban a super admin.' }
    await setSetting(`user_banned:${userId}`, '1', session.user.id)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function unbanUserAction(userId: string): Promise<ActionResult<void>> {
  try {
    const session = await requireSuperAdmin()
    await setSetting(`user_banned:${userId}`, undefined, session.user.id)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function grantSubscriptionAction(
  userId: string,
  months: number,
): Promise<ActionResult<void>> {
  try {
    await requireSuperAdmin()
    if (months < 1 || months > 12) return { success: false, error: 'Months must be between 1 and 12.' }
    const nowSeconds = Math.floor(Date.now() / 1000)
    const newTime    = nowSeconds + months * 30 * 86_400 - TRIAL_SECONDS
    await db.update(users)
      .set({ cartumSuscriptor: true, cartumSuscriptorTime: newTime })
      .where(eq(users.id, userId))
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function revokeSubscriptionAction(userId: string): Promise<ActionResult<void>> {
  try {
    await requireSuperAdmin()
    await db.update(users)
      .set({ cartumSuscriptor: false, cartumSuscriptorTime: 0 })
      .where(eq(users.id, userId))
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
  ActionResult<{
    permissions:     NodePermissionRow[]
    wildcardActions: Array<'read' | 'create' | 'update' | 'delete'>
    isProjectOverride: boolean
  }>
> {
  try {
    await requireAdmin()
    const projectId = await requireProjectId().catch(() => null)

    const containerNodes = await db
      .select({ id: nodes.id, name: nodes.name })
      .from(nodes)
      .where(
        projectId
          ? and(eq(nodes.type, 'container'), eq(nodes.projectId, projectId))
          : eq(nodes.type, 'container'),
      )

    let permMap: Map<string, { canRead: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>
    let isProjectOverride = false

    if (projectId) {
      const raw = await getSetting(`role_perms:${roleId}:${projectId}`)
      if (raw) {
        isProjectOverride = true
        try {
          const parsed = JSON.parse(raw) as Record<string, { read: boolean; create: boolean; update: boolean; delete: boolean }>
          permMap = new Map(
            Object.entries(parsed).map(([nodeId, p]) => [nodeId, {
              canRead:   p.read,
              canCreate: p.create,
              canUpdate: p.update,
              canDelete: p.delete,
            }]),
          )
        } catch { permMap = new Map() }
      } else {
        const existingPerms = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId))
        permMap = new Map(existingPerms.map((p) => [p.nodeId, p]))
      }
    } else {
      const existingPerms = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId))
      permMap = new Map(existingPerms.map((p) => [p.nodeId, p]))
    }

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

    // Wildcard: project-specific first, then global
    const wildcardKey = projectId ? `role_wildcard:${roleId}:${projectId}` : null
    const wildcardRaw = (wildcardKey ? await getSetting(wildcardKey) : null)
      ?? await getSetting(`role_${roleId}_wildcard`)
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

    return { success: true, data: { permissions, wildcardActions, isProjectOverride } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function saveRolePermissions(
  matrix: RolePermissionMatrix,
): Promise<ActionResult<void>> {
  try {
    const session   = await requireAdmin()
    const projectId = await requireProjectId().catch(() => null)

    if (projectId) {
      // Save as project-scoped override in app_settings
      const permsObj: Record<string, { read: boolean; create: boolean; update: boolean; delete: boolean }> = {}
      let wildcardData: { read: boolean; create: boolean; update: boolean; delete: boolean } | null = null

      for (const item of matrix.nodePermissions) {
        const d = {
          read:   item.actions.includes('read'),
          create: item.actions.includes('create'),
          update: item.actions.includes('update'),
          delete: item.actions.includes('delete'),
        }
        if (item.nodeId === '*') {
          wildcardData = d
        } else {
          permsObj[item.nodeId] = d
        }
      }

      await setSetting(`role_perms:${matrix.roleId}:${projectId}`, JSON.stringify(permsObj), session.user.id)
      if (wildcardData !== null) {
        await setSetting(`role_wildcard:${matrix.roleId}:${projectId}`, JSON.stringify(wildcardData), session.user.id)
      }
    } else {
      // Global save (no project context — superAdmin direct)
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
          await db.delete(rolePermissions).where(
            and(eq(rolePermissions.roleId, matrix.roleId), eq(rolePermissions.nodeId, item.nodeId)),
          )
        } else {
          await db.insert(rolePermissions)
            .values({ roleId: matrix.roleId, nodeId: item.nodeId, canRead, canCreate, canUpdate, canDelete })
            .onConflictDoUpdate({
              target: [rolePermissions.roleId, rolePermissions.nodeId],
              set:    { canRead, canCreate, canUpdate, canDelete },
            })
        }
      }
    }

    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Web Migration ──────────────────────────────────────────────────────────────

/** Guard: superAdmin or project admin. */
async function requireWebMigrationAccess() {
  const session   = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const projectId = await requireProjectId()
  const canAccess = session.user.isSuperAdmin
    || (session.user.roles ?? []).includes(ROLE_ADMIN)
    || await projectMembershipsRepository.isMemberWithRole(session.user.id, projectId, 'admin')
  if (!canAccess) throw new Error('FORBIDDEN')
  return { session, projectId, isSuperAdmin: session.user.isSuperAdmin }
}

async function resolveWebSetting(key: string, envFallback: string | undefined, projectId: string) {
  return (
    (await getSetting(`${key}:${projectId}`)) ??
    (await getSetting(key, envFallback))
  )
}

export async function getWebMigrationSettings(): Promise<
  ActionResult<WebMigrationSettings & { apiKeyIsSet: boolean }>
> {
  try {
    const { projectId, isSuperAdmin } = await requireWebMigrationAccess()
    const [url, key] = await Promise.all([
      resolveWebSetting('scraper_api_url', process.env.SCRAPER_API_URL, projectId),
      resolveWebSetting('scraper_api_key', process.env.SCRAPER_API_KEY, projectId),
    ])
    return {
      success: true,
      data: {
        scraperApiUrl: url ?? 'https://scraper.azanolabs.com',
        scraperApiKey: isSuperAdmin ? (key ?? '') : '',
        apiKeyIsSet:   Boolean(key),
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
    const { session, projectId } = await requireWebMigrationAccess()
    const saves: Promise<void>[] = []
    if (settings.scraperApiUrl) {
      saves.push(setSetting(`scraper_api_url:${projectId}`, settings.scraperApiUrl, session.user.id))
    }
    if (settings.scraperApiKey) {
      saves.push(setSetting(`scraper_api_key:${projectId}`, settings.scraperApiKey, session.user.id))
    }
    if (saves.length > 0) await Promise.all(saves)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Global Variables (super admin only) ───────────────────────────────────────

type EnvVar = { value: string; isOverridden: boolean }

export interface EnvSettings {
  r2Endpoint:      EnvVar
  r2AccessKeyId:   EnvVar
  r2SecretKey:     EnvVar
  r2BucketName:    EnvVar
  r2PublicUrl:     EnvVar
  blobToken:       EnvVar
  resendApiKey:    EnvVar
  resendFromEmail: EnvVar
  scraperApiUrl:   EnvVar
  scraperApiKey:   EnvVar
  cartumNewPlayer: EnvVar
  // Read-only from env — shown masked, not editable
  authUrl:         string
  dbProvider:      string
  databaseUrl:     string
}

function maskDbUrl(raw: string | undefined): string {
  if (!raw) return ''
  try {
    const u = new URL(raw)
    if (u.password) u.password = '***'
    return u.toString()
  } catch {
    return raw.slice(0, 20) + '…'
  }
}

async function readEnvVar(key: string, envVal: string | undefined): Promise<EnvVar> {
  const override = await getSetting(key)
  return {
    value:       override ?? envVal ?? '',
    isOverridden: override !== null && override !== undefined,
  }
}

export async function getEnvSettings(): Promise<ActionResult<EnvSettings>> {
  try {
    await requireSuperAdmin()
    const [r2Ep, r2Ak, r2Sk, r2Bn, r2Pu, blob, rKey, rFrom, scUrl, scKey, player] = await Promise.all([
      readEnvVar('r2_endpoint',      process.env.R2_ENDPOINT),
      readEnvVar('r2_access_key_id', process.env.R2_ACCESS_KEY_ID),
      readEnvVar('r2_secret_key',    process.env.R2_SECRET_ACCESS_KEY),
      readEnvVar('r2_bucket_name',   process.env.R2_BUCKET_NAME),
      readEnvVar('r2_public_url',    process.env.R2_PUBLIC_URL),
      readEnvVar('blob_token',       process.env.BLOB_READ_WRITE_TOKEN),
      readEnvVar('resend_api_key',   process.env.RESEND_API_KEY),
      readEnvVar('resend_from_email',process.env.RESEND_FROM_EMAIL),
      readEnvVar('scraper_api_url',  process.env.SCRAPER_API_URL),
      readEnvVar('scraper_api_key',  process.env.SCRAPER_API_KEY),
      readEnvVar('cartum_new_player',process.env.CARTUM_NEW_PLAYER),
    ])
    return {
      success: true,
      data: {
        r2Endpoint:      r2Ep,
        r2AccessKeyId:   r2Ak,
        r2SecretKey:     r2Sk,
        r2BucketName:    r2Bn,
        r2PublicUrl:     r2Pu,
        blobToken:       blob,
        resendApiKey:    rKey,
        resendFromEmail: rFrom,
        scraperApiUrl:   scUrl,
        scraperApiKey:   scKey,
        cartumNewPlayer: player,
        authUrl:         process.env.AUTH_URL ?? '',
        dbProvider:      process.env.DB_PROVIDER ?? '',
        databaseUrl:     maskDbUrl(process.env.DATABASE_URL),
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateEnvVar(key: string, value: string): Promise<ActionResult<void>> {
  try {
    const session = await requireSuperAdmin()
    // Safety: only allowed keys can be written this way
    const ALLOWED = new Set([
      'r2_endpoint','r2_access_key_id','r2_secret_key','r2_bucket_name','r2_public_url',
      'blob_token','resend_api_key','resend_from_email','scraper_api_url','scraper_api_key',
      'cartum_new_player',
    ])
    if (!ALLOWED.has(key)) return { success: false, error: 'Invalid key.' }
    await setSetting(key, value || undefined, session.user.id)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function clearAllEnvVars(): Promise<ActionResult<void>> {
  try {
    const session = await requireSuperAdmin()
    const KEYS = [
      'r2_endpoint','r2_access_key_id','r2_secret_key','r2_bucket_name','r2_public_url',
      'blob_token','resend_api_key','resend_from_email','scraper_api_url','scraper_api_key',
      'cartum_new_player',
    ]
    await Promise.all(KEYS.map((k) => setSetting(k, undefined, session.user.id)))
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function clearEnvVar(key: string): Promise<ActionResult<void>> {
  try {
    const session = await requireSuperAdmin()
    const ALLOWED = new Set([
      'r2_endpoint','r2_access_key_id','r2_secret_key','r2_bucket_name','r2_public_url',
      'blob_token','resend_api_key','resend_from_email','scraper_api_url','scraper_api_key',
      'cartum_new_player',
    ])
    if (!ALLOWED.has(key)) return { success: false, error: 'Invalid key.' }
    await setSetting(key, undefined, session.user.id)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Cartum Projects (super admin only) ────────────────────────────────────────

export type CartumProjectRow = {
  id:                   string
  name:                 string
  createdAt:            Date
  ownerEmail:           string | null
  ownerIsSuperAdmin:    boolean | null
  ownerSuscriptor:      boolean | null
  ownerSuscriptorTime:  number | null
  memberCount:          number
  imageCount:           number
  videoCount:           number
  imageBytesTotal:      number
  videoBytesTotal:      number
}

export async function listCartumProjects(): Promise<ActionResult<CartumProjectRow[]>> {
  try {
    await requireSuperAdmin()

    const [rows, counts, mediaStats] = await Promise.all([
      db
        .select({
          id:                   project.id,
          name:                 project.name,
          createdAt:            project.createdAt,
          ownerEmail:           users.email,
          ownerIsSuperAdmin:    users.isSuperAdmin,
          ownerSuscriptor:      users.cartumSuscriptor,
          ownerSuscriptorTime:  users.cartumSuscriptorTime,
        })
        .from(project)
        .leftJoin(users, eq(users.id, project.ownerId))
        .orderBy(asc(project.createdAt)),
      db
        .select({ projectId: projectMemberships.projectId, n: count() })
        .from(projectMemberships)
        .groupBy(projectMemberships.projectId),
      db
        .select({
          projectId:  media.projectId,
          mimeType:   media.mimeType,
          cnt:        count(),
          totalBytes: sum(media.sizeBytes),
        })
        .from(media)
        .groupBy(media.projectId, media.mimeType),
    ])

    const countMap = new Map(counts.map((c) => [c.projectId, c.n]))

    type MediaStat = { images: number; videos: number; imageBytes: number; videoBytes: number }
    const mediaMap = new Map<string, MediaStat>()
    for (const m of mediaStats) {
      if (!m.projectId) continue
      const existing = mediaMap.get(m.projectId) ?? { images: 0, videos: 0, imageBytes: 0, videoBytes: 0 }
      const bytes = Number(m.totalBytes ?? 0)
      if (m.mimeType?.startsWith('image/')) {
        existing.images += m.cnt
        existing.imageBytes += bytes
      } else if (m.mimeType?.startsWith('video/')) {
        existing.videos += m.cnt
        existing.videoBytes += bytes
      }
      mediaMap.set(m.projectId, existing)
    }

    return {
      success: true,
      data: rows.map((r) => {
        const ms = mediaMap.get(r.id)
        return {
          ...r,
          memberCount:      countMap.get(r.id) ?? 0,
          imageCount:       ms?.images    ?? 0,
          videoCount:       ms?.videos    ?? 0,
          imageBytesTotal:  ms?.imageBytes ?? 0,
          videoBytesTotal:  ms?.videoBytes ?? 0,
        }
      }),
    }
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
