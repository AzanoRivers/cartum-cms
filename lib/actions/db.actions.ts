'use server'

import { auth } from '@/auth'
import { db } from '@/db'
import { sql, eq, inArray, and, not, isNull, lt } from 'drizzle-orm'
import { cookies } from 'next/headers'
import {
  nodes,
  fieldMeta,
  nodeRelations,
  records,
  media,
  apiTokens,
  apiTokenExclusions,
  emailOtpCodes,
  passwordResetTokens,
  usersRoles,
  rolePermissions,
  roleSectionPermissions,
  appSettings,
  project,
  projectMemberships,
  projectSettings,
  projectInvitations,
  roles,
  users,
  userEmailRegistry,
} from '@/db/schema'
import { requireProjectId } from '@/lib/auth/get-project-id'
import { toSimpleName } from '@/nodes/api-generator'
import { del as blobDel, list as blobList } from '@vercel/blob'
import { getSetting } from '@/lib/settings/get-setting'
import { getR2Client } from '@/lib/media/r2-client'
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import type { ActionResult } from '@/types/actions'

// ── Storage purge ─────────────────────────────────────────────────────────────

export type StoragePurgeResult = {
  deleted:     number
  failed:      number
  r2Orphans:   number
  blobOrphans: number
}

async function purgeAllMediaStorage(): Promise<StoragePurgeResult> {
  let deleted     = 0
  let failed      = 0
  let r2Orphans   = 0
  let blobOrphans = 0

  // Hoist clients once — getSetting reads from DB, must not run per-row
  let r2: Awaited<ReturnType<typeof getR2Client>> | null = null
  try { r2 = await getR2Client() } catch { /* R2 not configured */ }

  const blobToken = await getSetting('blob_token', process.env.BLOB_READ_WRITE_TOKEN).catch(() => null)

  // ── Phase 1: DB-driven purge ─────────────────────────────────────────────
  const rows = await db
    .select({ key: media.key, publicUrl: media.publicUrl, storageProvider: media.storageProvider })
    .from(media)

  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (row) => {
        try {
          if (row.storageProvider === 'blob') {
            if (!blobToken) { failed++; return }
            await blobDel(row.publicUrl, { token: blobToken })
          } else {
            if (!r2) { failed++; return }
            await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: row.key }))
          }
          deleted++
        } catch {
          failed++
        }
      }),
    )
  }

  // ── Phase 2: storage sweep — orphans not in DB ────────────────────────────

  // R2 sweep
  if (r2) {
    let continuationToken: string | undefined
    do {
      const listRes = await r2.client.send(new ListObjectsV2Command({
        Bucket:            r2.bucket,
        Prefix:            'uploads/',
        ContinuationToken: continuationToken,
      }))
      const keys = (listRes.Contents ?? []).map((obj) => ({ Key: obj.Key! }))
      if (keys.length > 0) {
        await r2.client.send(new DeleteObjectsCommand({
          Bucket: r2.bucket,
          Delete: { Objects: keys, Quiet: true },
        }))
        r2Orphans += keys.length
      }
      continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined
    } while (continuationToken)
  }

  // Blob sweep
  if (blobToken) {
    let cursor: string | undefined
    do {
      const listRes = await blobList({ prefix: 'uploads/', cursor, token: blobToken })
      for (const blob of listRes.blobs) {
        try {
          await blobDel(blob.url, { token: blobToken })
          blobOrphans++
        } catch { /* best-effort */ }
      }
      cursor = listRes.hasMore ? listRes.cursor : undefined
    } while (cursor)
  }

  return { deleted, failed, r2Orphans, blobOrphans }
}

// ── Project backup types ──────────────────────────────────────────────────────

type ProjectBackup = {
  type:         'cartum-project'
  version:      '1.0'
  exportedAt:   string
  projectName:  string
  nodes:        unknown[]
  fieldMeta:    unknown[]
  nodeRelations: unknown[]
  records:      unknown[]
  media:        unknown[]
}

// ── Auth guard ────────────────────────────────────────────────────────────────

async function requireSuperAdmin(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  if (!session.user.isSuperAdmin) return null
  return session.user.id
}

// ── Types ─────────────────────────────────────────────────────────────────────

type CmsBackup = {
  version:                  string
  exportedAt:               string
  // config layer — added in v1.2 (optional for compat with v1.0/v1.1 backups)
  project?:                 unknown[]
  users?:                   unknown[]
  roles?:                   unknown[]
  usersRoles?:              unknown[]
  projectMemberships?:      unknown[]  // v1.3+
  projectInvitations?:      unknown[]  // v1.4+
  apiTokens?:               unknown[]
  apiTokenExclusions?:      unknown[]  // v1.5+
  appSettings?:             unknown[]
  projectSettings?:         unknown[]  // v1.3+
  roleSectionPermissions?:  unknown[]
  // content layer — always present
  nodes:                    unknown[]
  fieldMeta:                unknown[]
  nodeRelations:            unknown[]
  records:                  unknown[]
  media:                    unknown[]
  rolePermissions?:         unknown[]  // absent in v1.0
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportDatabaseAction(): Promise<ActionResult<{ json: string; filename: string }>> {
  const userId = await requireSuperAdmin()
  if (!userId) return { success: false, error: 'Unauthorized' }

  // Lazy expiry sweep, instance-wide — no cron in serverless, so a backup
  // should never carry pending invitations that were already dead when it
  // was taken.
  await db.delete(projectInvitations).where(
    and(isNull(projectInvitations.acceptedAt), lt(projectInvitations.expiresAt, new Date())),
  )

  const [
    projectData, usersData, rolesData, usersRolesData, projectMembershipsData,
    projectInvitationsData, apiTokensData, apiTokenExclusionsData, appSettingsData, projectSettingsData,
    roleSectionPermissionsData, nodesData, fieldMetaData, nodeRelationsData,
    recordsData, mediaData, rolePermissionsData,
  ] = await Promise.all([
    db.select().from(project),
    db.select().from(users),
    db.select().from(roles),
    db.select().from(usersRoles),
    db.select().from(projectMemberships),
    db.select().from(projectInvitations),
    db.select().from(apiTokens),
    db.select().from(apiTokenExclusions),
    db.select().from(appSettings),
    db.select().from(projectSettings),
    db.select().from(roleSectionPermissions),
    db.select().from(nodes),
    db.select().from(fieldMeta),
    db.select().from(nodeRelations),
    db.select().from(records),
    db.select().from(media),
    db.select().from(rolePermissions),
  ])

  const backup: CmsBackup = {
    version:                 '1.5',
    exportedAt:              new Date().toISOString(),
    project:                 projectData,
    users:                   usersData,
    roles:                   rolesData,
    usersRoles:              usersRolesData,
    projectMemberships:      projectMembershipsData,
    projectInvitations:      projectInvitationsData,
    apiTokens:               apiTokensData,
    apiTokenExclusions:      apiTokenExclusionsData,
    appSettings:             appSettingsData,
    projectSettings:         projectSettingsData,
    roleSectionPermissions:  roleSectionPermissionsData,
    nodes:                   nodesData,
    fieldMeta:               fieldMetaData,
    nodeRelations:           nodeRelationsData,
    records:                 recordsData,
    media:                   mediaData,
    rolePermissions:         rolePermissionsData,
  }

  const dateStr  = new Date().toISOString().slice(0, 10)
  const filename = `cartum-backup-${dateStr}.json`

  return { success: true, data: { json: JSON.stringify(backup, null, 2), filename } }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Topological sort for nodes using BFS from roots.
 * Handles arbitrary nesting depth (not just 2 levels).
 * Nodes whose parent is not in the backup (orphans) are appended at the end.
 */
function topoSortNodes(nodeItems: unknown[]): unknown[] {
  const byId = new Map<string, Record<string, unknown>>()
  for (const n of nodeItems) {
    if (isRecord(n) && typeof n.id === 'string') byId.set(n.id, n)
  }

  // Build children map: parentId → [childIds]
  const childrenOf = new Map<string | null, string[]>()
  for (const n of nodeItems) {
    if (!isRecord(n) || typeof n.id !== 'string') continue
    const pid = typeof n.parentId === 'string' ? n.parentId : null
    const arr = childrenOf.get(pid) ?? []
    arr.push(n.id)
    childrenOf.set(pid, arr)
  }

  const result: unknown[] = []
  const visited = new Set<string>()

  // BFS starting from root nodes (parentId === null)
  const queue: string[] = [...(childrenOf.get(null) ?? [])]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const node = byId.get(id)
    if (node) {
      result.push(node)
      queue.push(...(childrenOf.get(id) ?? []))
    }
  }

  // Append orphaned nodes (parentId references a node not in the backup)
  for (const [id, node] of byId) {
    if (!visited.has(id)) result.push(node)
  }

  return result
}

/**
 * Fills in `simpleName` for backups taken before that column existed (or any
 * row where it was left null), so restored data is searchable immediately
 * instead of only after the next edit touches each node.
 */
function backfillSimpleName(nodeItems: unknown[]): unknown[] {
  return nodeItems.map((n) => {
    if (!isRecord(n) || typeof n.name !== 'string') return n
    if (typeof n.simpleName === 'string' && n.simpleName) return n
    return { ...n, simpleName: toSimpleName(n.name) }
  })
}

// ── Backup item validators ────────────────────────────────────────────────────

function validateBackupItems(backup: CmsBackup): string | null {
  for (const node of backup.nodes) {
    if (!isRecord(node) || typeof node.id !== 'string' || typeof node.name !== 'string' || typeof node.type !== 'string') {
      return 'invalid_nodes'
    }
    if (node.type !== 'container' && node.type !== 'field') {
      return 'invalid_nodes'
    }
  }
  for (const fm of backup.fieldMeta) {
    if (!isRecord(fm) || typeof fm.id !== 'string' || typeof fm.nodeId !== 'string' || typeof fm.fieldType !== 'string') {
      return 'invalid_field_meta'
    }
  }
  for (const rel of backup.nodeRelations) {
    if (!isRecord(rel) || typeof rel.id !== 'string' || typeof rel.sourceNodeId !== 'string' || typeof rel.targetNodeId !== 'string') {
      return 'invalid_relations'
    }
  }
  for (const rec of backup.records) {
    if (!isRecord(rec) || typeof rec.id !== 'string' || typeof rec.nodeId !== 'string') {
      return 'invalid_records'
    }
  }
  for (const m of backup.media) {
    if (!isRecord(m) || typeof m.id !== 'string' || typeof m.key !== 'string') {
      return 'invalid_media'
    }
  }
  for (const rp of backup.rolePermissions ?? []) {
    if (!isRecord(rp) || typeof rp.id !== 'string' || typeof rp.roleId !== 'string' || typeof rp.nodeId !== 'string') {
      return 'invalid_role_permissions'
    }
  }
  for (const ex of backup.apiTokenExclusions ?? []) {
    if (!isRecord(ex) || typeof ex.id !== 'string' || typeof ex.tokenId !== 'string' || typeof ex.nodeId !== 'string') {
      return 'invalid_api_token_exclusions'
    }
  }
  return null
}

// ── Import ────────────────────────────────────────────────────────────────────

/**
 * Shared by both `importDatabaseAction` (plain .json) and
 * `importDatabaseWithMediaAction` (.zip, media already re-uploaded and
 * `backup.media` already rewritten to point at this instance's storage) —
 * parses the top-level shape and normalizes optional config-layer arrays so
 * older backup versions (v1.0–v1.4) still import.
 */
function parseAndValidateBackup(raw: unknown): { backup: CmsBackup } | { error: string } {
  if (
    typeof raw !== 'object' || raw === null ||
    !('version' in raw) || !('nodes' in raw) ||
    !Array.isArray((raw as Record<string, unknown>).nodes) ||
    !Array.isArray((raw as Record<string, unknown>).fieldMeta) ||
    !Array.isArray((raw as Record<string, unknown>).nodeRelations) ||
    !Array.isArray((raw as Record<string, unknown>).records) ||
    !Array.isArray((raw as Record<string, unknown>).media)
  ) {
    return { error: 'invalid_backup' }
  }

  const rawObj = raw as Record<string, unknown>
  const arr    = (k: string) => Array.isArray(rawObj[k]) ? rawObj[k] as unknown[] : []

  const backup: CmsBackup = {
    ...(raw as CmsBackup),
    project:                arr('project'),
    users:                  arr('users'),
    roles:                  arr('roles'),
    usersRoles:             arr('usersRoles'),
    projectMemberships:     arr('projectMemberships'),
    projectInvitations:     arr('projectInvitations'),
    apiTokens:              arr('apiTokens'),
    apiTokenExclusions:     arr('apiTokenExclusions'),
    appSettings:            arr('appSettings'),
    projectSettings:        arr('projectSettings'),
    roleSectionPermissions: arr('roleSectionPermissions'),
    rolePermissions:        arr('rolePermissions'),
  }

  const itemError = validateBackupItems(backup)
  if (itemError) return { error: itemError }

  return { backup }
}

/** Wipes the entire instance and restores it from `backup`, inside one transaction. */
async function restoreBackupTransaction(backup: CmsBackup): Promise<void> {
  const sortedNodes = backfillSimpleName(topoSortNodes(backup.nodes))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Tx = any

  await db.transaction(async (tx: Tx) => {
    // ── Wipe in FK-safe order (children before parents) ──────────────────
    await tx.delete(media)                  // uploadedBy → users RESTRICT
    await tx.delete(apiTokenExclusions)     // tokenId → apiTokens CASCADE, nodeId → nodes CASCADE
    await tx.delete(apiTokens)              // roleId → roles
    await tx.delete(usersRoles)             // userId → users, roleId → roles
    await tx.delete(projectMemberships)     // roleId → roles RESTRICT; must precede roles
    await tx.delete(projectInvitations)     // projectId → project CASCADE, roleId → roles CASCADE
    await tx.delete(roleSectionPermissions) // roleId → roles CASCADE
    await tx.delete(rolePermissions)        // roleId + nodeId CASCADE
    await tx.delete(nodeRelations)
    await tx.delete(records)
    await tx.delete(fieldMeta)
    await tx.delete(nodes)
    await tx.delete(appSettings)            // updatedBy → users SET NULL
    await tx.delete(projectSettings)        // projectId → project CASCADE
    await tx.delete(project)
    await tx.delete(roles)
    // Same neon-http issue: SET LOCAL in a separate statement doesn't persist.
    // Use a DO block so set_config and DELETE share one execution context.
    await tx.execute(sql`
      DO $$
      BEGIN
        PERFORM set_config('cartum.allow_user_delete', 'true', true);
        DELETE FROM users;
      END $$
    `)

    // ── Restore in FK-safe order (parents before children) ───────────────
    const ins = async (table: unknown, rows: unknown[]) => {
      if (rows.length > 0) await tx.insert(table).values(rows)
    }
    await ins(project,                backup.project!)
    await ins(roles,                  backup.roles!)
    await ins(users,                  backup.users!)
    await ins(usersRoles,             backup.usersRoles!)
    await ins(projectMemberships,     backup.projectMemberships!)  // needs project + roles + users
    await ins(projectInvitations,     backup.projectInvitations!)  // needs project + roles + users
    await ins(apiTokens,              backup.apiTokens!)
    await ins(roleSectionPermissions, backup.roleSectionPermissions!)
    await ins(nodes,                  sortedNodes)
    await ins(fieldMeta,              backup.fieldMeta)
    await ins(nodeRelations,          backup.nodeRelations)
    await ins(records,                backup.records)
    await ins(media,                  backup.media)
    await ins(rolePermissions,        backup.rolePermissions!)
    await ins(apiTokenExclusions,     backup.apiTokenExclusions!)   // needs apiTokens + nodes
    await ins(appSettings,            backup.appSettings!)
    await ins(projectSettings,        backup.projectSettings!)     // needs project + users

    // Lazy expiry sweep — a restored backup can carry pending invitations
    // that were already stale when it was taken (or long stale by now,
    // for an old backup). Same reasoning as the export-time sweep.
    await tx.delete(projectInvitations).where(
      and(isNull(projectInvitations.acceptedAt), lt(projectInvitations.expiresAt, new Date())),
    )
  })
}

export async function importDatabaseAction(raw: unknown): Promise<ActionResult<null>> {
  const userId = await requireSuperAdmin()
  if (!userId) return { success: false, error: 'Unauthorized' }

  const parsed = parseAndValidateBackup(raw)
  if ('error' in parsed) return { success: false, error: parsed.error }

  try {
    await restoreBackupTransaction(parsed.backup)
  } catch {
    return { success: false, error: 'db_error' }
  }

  return { success: true, data: null }
}

// ── Import with media (.zip: database.json + images/ + videos/) ──────────────

export type ImportWithMediaResult = {
  mediaReuploaded: number
  mediaFailed:     number
}

/**
 * Same restore as `importDatabaseAction`, but for a "Super export with
 * media" .zip: the client unzips it, sends `database` (the JSON text) plus
 * one file per media entry it could extract, keyed `file:{mediaId}` in the
 * FormData.
 *
 * The bucket URLs already in the backup are the source of truth and are
 * reused AS-IS whenever they still work — this is the normal case
 * (restoring on the same instance, same bucket, files never touched) and
 * it never re-uploads anything for it. A file only gets re-uploaded to
 * THIS instance's currently configured storage when its original URL is
 * confirmed dead (`isMediaUrlReachable` returns false) — the .zip's bytes
 * exist purely as a recovery fallback for that case, not as a mandatory
 * step.
 *
 * A dead entry with no matching file in the FormData (skipped at export
 * time too — unreachable URL, CORS, etc.) or whose re-upload fails on BOTH
 * providers keeps its original (dead) reference — restoring the rest of
 * the CMS should never be blocked by one broken file.
 */
export async function importDatabaseWithMediaAction(
  formData: FormData,
): Promise<ActionResult<ImportWithMediaResult>> {
  const userId = await requireSuperAdmin()
  if (!userId) return { success: false, error: 'Unauthorized' }

  const databaseText = formData.get('database')
  if (typeof databaseText !== 'string') return { success: false, error: 'invalid_backup' }

  let raw: unknown
  try {
    raw = JSON.parse(databaseText)
  } catch {
    return { success: false, error: 'invalid_backup' }
  }

  const parsed = parseAndValidateBackup(raw)
  if ('error' in parsed) return { success: false, error: parsed.error }
  const { backup } = parsed

  const { restoreMediaFile, isMediaUrlReachable } = await import('@/lib/media/storage-write')

  let mediaReuploaded = 0
  let mediaFailed     = 0

  for (const item of backup.media) {
    if (!isRecord(item)) continue
    const mediaId    = typeof item.id === 'string' ? item.id : null
    const projectId  = typeof item.projectId === 'string' ? item.projectId : null
    const publicUrl  = typeof item.publicUrl === 'string' ? item.publicUrl : null
    const mimeType   = typeof item.mimeType === 'string' ? item.mimeType : 'application/octet-stream'
    const key        = typeof item.key === 'string' ? item.key : ''
    const provider   = item.storageProvider === 'blob' ? 'blob' as const : 'r2' as const
    if (!mediaId || !projectId) continue

    // The bucket URL already in the backup still works — keep it exactly
    // as-is, no upload needed. This is the common case.
    if (publicUrl && await isMediaUrlReachable(publicUrl)) continue

    const file = formData.get(`file:${mediaId}`)
    if (!(file instanceof Blob)) continue // dead link AND export couldn't fetch it either — nothing we can do

    try {
      const bytes    = await file.arrayBuffer()
      const filename = key.split('/').pop() ?? mediaId
      const restored = await restoreMediaFile(projectId, bytes, mimeType, provider, filename)
      if (restored) {
        item.key             = restored.key
        item.publicUrl        = restored.publicUrl
        item.storageProvider  = restored.storageProvider
        mediaReuploaded++
      } else {
        mediaFailed++
      }
    } catch {
      mediaFailed++
    }
  }

  try {
    await restoreBackupTransaction(backup)
  } catch {
    return { success: false, error: 'db_error' }
  }

  return { success: true, data: { mediaReuploaded, mediaFailed } }
}

// ── Export project (scoped to current project) ───────────────────────────────

export async function exportProjectAction(): Promise<ActionResult<{ json: string; filename: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  let projectId: string
  try { projectId = await requireProjectId() }
  catch { return { success: false, error: 'NO_PROJECT' } }

  const { projectMembershipsRepository } = await import('@/db/repositories/project-memberships.repository')
  const canAccess = session.user.isSuperAdmin
    || await projectMembershipsRepository.isMemberWithRole(session.user.id, projectId, 'admin')
  if (!canAccess) return { success: false, error: 'Forbidden' }

  const [proj] = await db.select({ name: project.name }).from(project).where(eq(project.id, projectId)).limit(1)

  const nodesData = await db.select().from(nodes).where(eq(nodes.projectId, projectId))
  const nodeIds   = nodesData.map((n) => n.id)

  const [fieldMetaData, nodeRelationsData, recordsData, mediaData] = await Promise.all([
    nodeIds.length > 0 ? db.select().from(fieldMeta).where(inArray(fieldMeta.nodeId, nodeIds)) : Promise.resolve([]),
    nodeIds.length > 0 ? db.select().from(nodeRelations).where(inArray(nodeRelations.sourceNodeId, nodeIds)) : Promise.resolve([]),
    nodeIds.length > 0 ? db.select().from(records).where(inArray(records.nodeId, nodeIds)) : Promise.resolve([]),
    db.select().from(media).where(eq(media.projectId, projectId)),
  ])

  const backup: ProjectBackup = {
    type:         'cartum-project',
    version:      '1.0',
    exportedAt:   new Date().toISOString(),
    projectName:  proj?.name ?? 'project',
    nodes:        nodesData,
    fieldMeta:    fieldMetaData,
    nodeRelations: nodeRelationsData,
    records:      recordsData,
    media:        mediaData,
  }

  const safeName = (proj?.name ?? 'project').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const dateStr  = new Date().toISOString().slice(0, 10)
  const filename = `cartum-project-${safeName}-${dateStr}.json`

  return { success: true, data: { json: JSON.stringify(backup, null, 2), filename } }
}

// ── Import project (replace current project content, INTACTA — no ID remap) ──

export async function importProjectAction(raw: unknown): Promise<ActionResult<null>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  let projectId: string
  try { projectId = await requireProjectId() }
  catch { return { success: false, error: 'NO_PROJECT' } }

  const { projectMembershipsRepository } = await import('@/db/repositories/project-memberships.repository')
  const canAccess = session.user.isSuperAdmin
    || await projectMembershipsRepository.isMemberWithRole(session.user.id, projectId, 'admin')
  if (!canAccess) return { success: false, error: 'Forbidden' }

  if (
    typeof raw !== 'object' || raw === null ||
    (raw as Record<string, unknown>).type !== 'cartum-project' ||
    !Array.isArray((raw as Record<string, unknown>).nodes) ||
    !Array.isArray((raw as Record<string, unknown>).fieldMeta) ||
    !Array.isArray((raw as Record<string, unknown>).nodeRelations) ||
    !Array.isArray((raw as Record<string, unknown>).records) ||
    !Array.isArray((raw as Record<string, unknown>).media)
  ) {
    return { success: false, error: 'invalid_backup' }
  }

  const backup = raw as ProjectBackup

  // Validate item shapes
  for (const n of backup.nodes) {
    if (!isRecord(n) || typeof n.id !== 'string' || typeof n.name !== 'string' || typeof n.type !== 'string') {
      return { success: false, error: 'invalid_nodes' }
    }
  }
  for (const fm of backup.fieldMeta) {
    if (!isRecord(fm) || typeof fm.id !== 'string' || typeof fm.nodeId !== 'string') {
      return { success: false, error: 'invalid_field_meta' }
    }
  }
  for (const m of backup.media) {
    if (!isRecord(m) || typeof m.id !== 'string' || typeof m.key !== 'string') {
      return { success: false, error: 'invalid_media' }
    }
  }

  // Identify slugs from backup that conflict with OTHER projects
  // (current project slugs will be freed when we delete below — same transaction)
  const slugsInBackup = backup.nodes
    .filter((n) => isRecord(n) && typeof n.slug === 'string' && n.slug)
    .map((n) => (n as Record<string, unknown>).slug as string)

  const conflictingSlugs = new Set<string>()
  if (slugsInBackup.length > 0) {
    const existing = await db
      .select({ slug: nodes.slug })
      .from(nodes)
      .where(and(inArray(nodes.slug, slugsInBackup), not(eq(nodes.projectId, projectId))))
    existing.forEach((r) => r.slug && conflictingSlugs.add(r.slug))
  }

  // Prepare nodes: keep original IDs, update projectId, handle slug conflicts
  const preparedNodes = backup.nodes
    .filter((n) => isRecord(n) && typeof n.id === 'string')
    .map((n) => {
      const node = n as Record<string, unknown>
      const originalSlug = typeof node.slug === 'string' ? node.slug : null
      return {
        ...node,
        projectId,
        slug: originalSlug && !conflictingSlugs.has(originalSlug) ? originalSlug : null,
      }
    })

  // Prepare fieldMeta + nodeRelations + records: keep original IDs, no changes needed
  // (nodeIds still match since we preserved them above)
  const preparedFieldMeta = backup.fieldMeta.filter(
    (fm) => isRecord(fm) && typeof fm.nodeId === 'string',
  )
  const preparedRelations = backup.nodeRelations.filter(
    (rel) => isRecord(rel) && typeof rel.sourceNodeId === 'string' && typeof rel.targetNodeId === 'string',
  )
  const preparedRecords = backup.records.filter(
    (rec) => isRecord(rec) && typeof rec.nodeId === 'string',
  )

  // Prepare media: keep original IDs, update projectId + uploadedBy
  const preparedMedia = backup.media
    .filter((m) => isRecord(m) && typeof m.id === 'string')
    .map((m) => ({
      ...(m as Record<string, unknown>),
      projectId,
      uploadedBy: session.user.id,
    }))

  const sortedNodes = backfillSimpleName(topoSortNodes(preparedNodes))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Tx = any
  try {
    await db.transaction(async (tx: Tx) => {
      // Clear current project content
      // node CASCADE handles: fieldMeta, nodeRelations, records, rolePermissions
      await tx.delete(media).where(eq(media.projectId, projectId))
      await tx.delete(nodes).where(eq(nodes.projectId, projectId))

      // Insert with original IDs preserved — INTACTA restore
      const ins = async (table: unknown, rows: unknown[]) => {
        if (rows.length > 0) await (tx as Tx).insert(table).values(rows)
      }
      await ins(nodes,        sortedNodes)
      await ins(fieldMeta,    preparedFieldMeta)
      await ins(nodeRelations, preparedRelations)
      await ins(records,      preparedRecords)
      await ins(media,        preparedMedia)
    })
  } catch {
    return { success: false, error: 'db_error' }
  }

  return { success: true, data: null }
}

// ── Purge images ──────────────────────────────────────────────────────────────

export async function purgeAllImagesAction(): Promise<ActionResult<{ storagePurge: StoragePurgeResult }>> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

  let projectId: string
  try {
    projectId = await requireProjectId()
  } catch {
    return { success: false, error: 'NO_PROJECT' }
  }

  // Allow superAdmin or project admin
  const { projectMembershipsRepository } = await import('@/db/repositories/project-memberships.repository')
  const { ROLE_ADMIN } = await import('@/types/roles')
  const canAccess = session.user.isSuperAdmin
    || (session.user.roles ?? []).includes(ROLE_ADMIN)
    || await projectMembershipsRepository.isMemberWithRole(session.user.id, projectId, 'admin')
  if (!canAccess) return { success: false, error: 'Forbidden' }

  try {
    // Purge only this project's media from storage
    const storagePurge = await purgeProjectMediaStorage(projectId)

    // Delete only this project's media rows
    await db.delete(media).where(eq(media.projectId, projectId))

    return { success: true, data: { storagePurge } }
  } catch {
    return { success: false, error: 'db_error' }
  }
}

// ── Reset ─────────────────────────────────────────────────────────────────────

// Deletes all rows from a table, ignoring "relation does not exist" (42P01).
// This handles tables that haven't been migrated yet in the current environment.
// Any other DB error is re-thrown so it surfaces properly.
async function safeDelete(table: Parameters<typeof db.delete>[0]): Promise<void> {
  try {
    await db.delete(table)
  } catch (e: unknown) {
    const code = (e as { cause?: { code?: string } })?.cause?.code
    if (code !== '42P01') throw e
    // table doesn't exist — nothing to delete, continue
  }
}

async function purgeProjectMediaStorage(projectId: string): Promise<StoragePurgeResult> {
  let deleted     = 0
  let failed      = 0
  let r2Orphans   = 0
  let blobOrphans = 0

  let r2: Awaited<ReturnType<typeof getR2Client>> | null = null
  try { r2 = await getR2Client() } catch { /* not configured */ }

  const blobToken = await getSetting('blob_token', process.env.BLOB_READ_WRITE_TOKEN).catch(() => null)

  const rows = await db
    .select({ key: media.key, publicUrl: media.publicUrl, storageProvider: media.storageProvider })
    .from(media)
    .where(eq(media.projectId, projectId))

  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (row) => {
        try {
          if (row.storageProvider === 'blob') {
            if (!blobToken) { failed++; return }
            await blobDel(row.publicUrl, { token: blobToken })
          } else {
            if (!r2) { failed++; return }
            await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: row.key }))
          }
          deleted++
        } catch {
          failed++
        }
      }),
    )
  }

  // R2 sweep for project prefix orphans
  if (r2) {
    let continuationToken: string | undefined
    do {
      const listRes = await r2.client.send(new ListObjectsV2Command({
        Bucket:            r2.bucket,
        Prefix:            `uploads/${projectId}/`,
        ContinuationToken: continuationToken,
      }))
      const keys = (listRes.Contents ?? []).map((obj) => ({ Key: obj.Key! }))
      if (keys.length > 0) {
        await r2.client.send(new DeleteObjectsCommand({
          Bucket: r2.bucket,
          Delete: { Objects: keys, Quiet: true },
        }))
        r2Orphans += keys.length
      }
      continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined
    } while (continuationToken)
  }

  // Blob sweep for project prefix orphans
  if (blobToken) {
    let cursor: string | undefined
    do {
      const listRes = await blobList({ prefix: `uploads/${projectId}/`, cursor, token: blobToken })
      for (const blob of listRes.blobs) {
        try {
          await blobDel(blob.url, { token: blobToken })
          blobOrphans++
        } catch { /* best-effort */ }
      }
      cursor = listRes.hasMore ? listRes.cursor : undefined
    } while (cursor)
  }

  return { deleted, failed, r2Orphans, blobOrphans }
}

// ── Full CMS reset (super admin only — wipes everything) ──────────────────────

export async function resetCmsAction(): Promise<ActionResult<{ storagePurge: StoragePurgeResult } | null>> {
  const userId = await requireSuperAdmin()
  if (!userId) return { success: false, error: 'Unauthorized' }

  try {
    // Purge storage BEFORE wiping DB rows — rows are the inventory
    const storagePurge = await purgeAllMediaStorage()

    // FK-safe deletion. Users are protected by trigger — bypass for authorized full reset.
    await safeDelete(media)
    await safeDelete(emailOtpCodes)
    await safeDelete(passwordResetTokens)
    await safeDelete(apiTokens)
    await safeDelete(nodeRelations)
    await safeDelete(records)
    await safeDelete(fieldMeta)
    await safeDelete(nodes)
    await safeDelete(usersRoles)
    await safeDelete(projectMemberships)  // roleId → roles RESTRICT; must precede roles
    await safeDelete(rolePermissions)
    await safeDelete(appSettings)
    await safeDelete(projectSettings)     // projectId → project CASCADE
    await safeDelete(project)
    await safeDelete(roles)

    // Bypass the prevent_users_delete trigger.
    // SET LOCAL inside a separate tx.execute() doesn't persist to the next HTTP
    // request in neon-http mode — use a single DO block so set_config and DELETE
    // share the same PL/pgSQL execution context.
    await db.execute(sql`
      DO $$
      BEGIN
        PERFORM set_config('cartum.allow_user_delete', 'true', true);
        DELETE FROM users;
      END $$
    `)

    // Delete email registry ONLY on full reset (super admin clears history too)
    await safeDelete(userEmailRegistry)

    // Clear all cookies so stale sessions can't be used after reset
    try {
      const jar = await cookies()
      for (const cookie of jar.getAll()) {
        jar.delete(cookie.name)
      }
    } catch { /* cookies may not be available in some edge runtimes */ }

    return { success: true, data: { storagePurge } }
  } catch {
    return { success: false, error: 'db_error' }
  }
}
