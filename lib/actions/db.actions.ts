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
  appSettings,
  project,
  roles,
  users,
} from '@/db/schema'
import type { ActionResult } from '@/types/actions'

// ── Auth guard ────────────────────────────────────────────────────────────────

async function requireSuperAdmin(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  if (!session.user.isSuperAdmin) return null
  return session.user.id
}

// ── Types ─────────────────────────────────────────────────────────────────────

type CmsBackup = {
  version:          string
  exportedAt:       string
  nodes:            unknown[]
  fieldMeta:        unknown[]
  nodeRelations:    unknown[]
  records:          unknown[]
  media:            unknown[]
  rolePermissions?: unknown[]   // optional — absent in backups created before v1.1
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportDatabaseAction(): Promise<ActionResult<{ json: string; filename: string }>> {
  const userId = await requireSuperAdmin()
  if (!userId) return { success: false, error: 'Unauthorized' }

  const [nodesData, fieldMetaData, nodeRelationsData, recordsData, mediaData, rolePermissionsData] =
    await Promise.all([
      db.select().from(nodes),
      db.select().from(fieldMeta),
      db.select().from(nodeRelations),
      db.select().from(records),
      db.select().from(media),
      db.select().from(rolePermissions),
    ])

  const backup: CmsBackup = {
    version:         '1.1',
    exportedAt:      new Date().toISOString(),
    nodes:           nodesData,
    fieldMeta:       fieldMetaData,
    nodeRelations:   nodeRelationsData,
    records:         recordsData,
    media:           mediaData,
    rolePermissions: rolePermissionsData,
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

  // Top-level structure check
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

  // Normalize: rolePermissions is optional (absent in v1.0 backups)
  const rawObj = raw as Record<string, unknown>
  const backup: CmsBackup = {
    ...(raw as Omit<CmsBackup, 'rolePermissions'>),
    rolePermissions: Array.isArray(rawObj.rolePermissions) ? rawObj.rolePermissions : [],
  }

  // Item-level shape validation
  const itemError = validateBackupItems(backup)
  if (itemError) return { success: false, error: itemError }

  // Sort nodes topologically (BFS from roots) to satisfy self-referential FK
  // on insertion. Handles arbitrary nesting depth, not just 2 levels.
  const sortedNodes = topoSortNodes(backup.nodes)

  try {
    await db.transaction(async (tx) => {
      // Wipe existing content in FK-safe order.
      // rolePermissions.nodeId → nodes.id CASCADE, so it is deleted automatically
      // when nodes are deleted, but we delete it explicitly first to be explicit
      // and to allow us to re-insert it cleanly below.
      await tx.delete(media)
      await tx.delete(nodeRelations)
      await tx.delete(rolePermissions)
      await tx.delete(records)
      await tx.delete(fieldMeta)
      await tx.delete(nodes)

      // Restore — insert only if arrays are non-empty
      if (sortedNodes.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.insert(nodes).values(sortedNodes as any[])
      }
      if (backup.fieldMeta.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.insert(fieldMeta).values(backup.fieldMeta as any[])
      }
      if (backup.nodeRelations.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.insert(nodeRelations).values(backup.nodeRelations as any[])
      }
      if (backup.records.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.insert(records).values(backup.records as any[])
      }
      if (backup.media.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.insert(media).values(backup.media as any[])
      }
      // Restore role permissions after nodes are inserted so FK is satisfied.
      // Skipped for v1.0 backups (rolePermissions array will be empty).
      if ((backup.rolePermissions ?? []).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.insert(rolePermissions).values(backup.rolePermissions as any[])
      }
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

export async function resetCmsAction(): Promise<ActionResult<null>> {
  const userId = await requireSuperAdmin()
  if (!userId) return { success: false, error: 'Unauthorized' }

  try {
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
  } catch {
    return { success: false, error: 'db_error' }
  }

  // Clear all cookies so stale sessions can't be used after reset
  try {
    const jar = await cookies()
    for (const cookie of jar.getAll()) {
      jar.delete(cookie.name)
    }
  } catch { /* cookies may not be available in some edge runtimes */ }

  return { success: true, data: null }
}
