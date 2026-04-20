'use server'

import { auth } from '@/auth'
import { db } from '@/db'
import { cookies } from 'next/headers'
import {
  nodes,
  fieldMeta,
  nodeRelations,
  records,
  media,
  apiTokens,
  emailOtpCodes,
  passwordResetTokens,
  usersRoles,
  rolePermissions,
  roleSectionPermissions,
  appSettings,
  project,
  roles,
  users,
} from '@/db/schema'
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
  apiTokens?:               unknown[]
  appSettings?:             unknown[]
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

  const [
    projectData, usersData, rolesData, usersRolesData, apiTokensData,
    appSettingsData, roleSectionPermissionsData,
    nodesData, fieldMetaData, nodeRelationsData, recordsData, mediaData, rolePermissionsData,
  ] = await Promise.all([
    db.select().from(project),
    db.select().from(users),
    db.select().from(roles),
    db.select().from(usersRoles),
    db.select().from(apiTokens),
    db.select().from(appSettings),
    db.select().from(roleSectionPermissions),
    db.select().from(nodes),
    db.select().from(fieldMeta),
    db.select().from(nodeRelations),
    db.select().from(records),
    db.select().from(media),
    db.select().from(rolePermissions),
  ])

  const backup: CmsBackup = {
    version:                 '1.2',
    exportedAt:              new Date().toISOString(),
    project:                 projectData,
    users:                   usersData,
    roles:                   rolesData,
    usersRoles:              usersRolesData,
    apiTokens:               apiTokensData,
    appSettings:             appSettingsData,
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
  return null
}

// ── Import ────────────────────────────────────────────────────────────────────

export async function importDatabaseAction(raw: unknown): Promise<ActionResult<null>> {
  const userId = await requireSuperAdmin()
  if (!userId) return { success: false, error: 'Unauthorized' }

  // Top-level structure check (only required fields — content layer)
  if (
    typeof raw !== 'object' || raw === null ||
    !('version' in raw) || !('nodes' in raw) ||
    !Array.isArray((raw as Record<string, unknown>).nodes) ||
    !Array.isArray((raw as Record<string, unknown>).fieldMeta) ||
    !Array.isArray((raw as Record<string, unknown>).nodeRelations) ||
    !Array.isArray((raw as Record<string, unknown>).records) ||
    !Array.isArray((raw as Record<string, unknown>).media)
  ) {
    return { success: false, error: 'invalid_backup' }
  }

  // Normalize optional arrays — v1.0/v1.1 backups lack config layer tables
  const rawObj = raw as Record<string, unknown>
  const arr    = (k: string) => Array.isArray(rawObj[k]) ? rawObj[k] as unknown[] : []

  const backup: CmsBackup = {
    ...(raw as CmsBackup),
    project:                arr('project'),
    users:                  arr('users'),
    roles:                  arr('roles'),
    usersRoles:             arr('usersRoles'),
    apiTokens:              arr('apiTokens'),
    appSettings:            arr('appSettings'),
    roleSectionPermissions: arr('roleSectionPermissions'),
    rolePermissions:        arr('rolePermissions'),
  }

  // Item-level shape validation
  const itemError = validateBackupItems(backup)
  if (itemError) return { success: false, error: itemError }

  // Sort nodes topologically (BFS from roots) to satisfy self-referential FK
  const sortedNodes = topoSortNodes(backup.nodes)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Tx = any

  try {
    await db.transaction(async (tx: Tx) => {
      // ── Wipe in FK-safe order (children before parents) ──────────────────
      await tx.delete(media)                  // uploadedBy → users RESTRICT
      await tx.delete(apiTokens)              // roleId → roles
      await tx.delete(usersRoles)             // userId → users, roleId → roles
      await tx.delete(roleSectionPermissions) // roleId → roles CASCADE
      await tx.delete(rolePermissions)        // roleId + nodeId CASCADE
      await tx.delete(nodeRelations)
      await tx.delete(records)
      await tx.delete(fieldMeta)
      await tx.delete(nodes)
      await tx.delete(appSettings)            // updatedBy → users SET NULL
      await tx.delete(project)
      await tx.delete(roles)
      await tx.delete(users)

      // ── Restore in FK-safe order (parents before children) ───────────────
      const ins = async (table: unknown, rows: unknown[]) => {
        if (rows.length > 0) await tx.insert(table).values(rows)
      }
      await ins(project,                backup.project!)
      await ins(roles,                  backup.roles!)
      await ins(users,                  backup.users!)
      await ins(usersRoles,             backup.usersRoles!)
      await ins(apiTokens,              backup.apiTokens!)
      await ins(roleSectionPermissions, backup.roleSectionPermissions!)
      await ins(nodes,                  sortedNodes)
      await ins(fieldMeta,              backup.fieldMeta)
      await ins(nodeRelations,          backup.nodeRelations)
      await ins(records,                backup.records)
      await ins(media,                  backup.media)
      await ins(rolePermissions,        backup.rolePermissions!)
      await ins(appSettings,            backup.appSettings!)
    })
  } catch {
    return { success: false, error: 'db_error' }
  }

  return { success: true, data: null }
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

export async function resetCmsAction(): Promise<ActionResult<{ storagePurge: StoragePurgeResult } | null>> {
  const userId = await requireSuperAdmin()
  if (!userId) return { success: false, error: 'Unauthorized' }

  try {
    // Purge storage BEFORE wiping DB rows — rows are the inventory
    const storagePurge = await purgeAllMediaStorage()

    // FK-safe deletion order:
    // 1. media (RESTRICT FK → users.id, must go before users)
    // 2. auth helper tables
    // 3. api tokens
    // 4. content tables (nodeRelations, records, fieldMeta, nodes cascade anyway)
    // 5. role assignments
    // 6. app_settings (FK updatedBy → users SET NULL, safe)
    // 7. project
    // 8. roles (cascades rolePermissions + usersRoles)
    // 9. users (last)
    await safeDelete(media)
    await safeDelete(emailOtpCodes)
    await safeDelete(passwordResetTokens)
    await safeDelete(apiTokens)
    await safeDelete(nodeRelations)
    await safeDelete(records)
    await safeDelete(fieldMeta)
    await safeDelete(nodes)
    await safeDelete(usersRoles)
    await safeDelete(rolePermissions)
    await safeDelete(appSettings)
    await safeDelete(project)
    await safeDelete(roles)
    await safeDelete(users)

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
