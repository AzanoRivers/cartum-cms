'use server'

import { requirePermission } from '@/lib/rbac/guard'
import { requireProjectId, assertProjectAccess } from '@/lib/auth/get-project-id'
import { recordsService } from '@/lib/services/records.service'
import { recordsRepository } from '@/db/repositories/records.repository'
import type { ActionResult } from '@/types/actions'
import type { ContentRecord, RecordInput } from '@/types/records'

export async function createRecord(
  nodeId: string,
  input:  RecordInput,
): Promise<ActionResult<ContentRecord>> {
  try {
    const projectId = await requireProjectId()
    await requirePermission(nodeId, 'create')
    const record = await recordsService.create(nodeId, input, projectId)
    return { success: true, data: record }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function updateRecord(
  nodeId:   string,
  recordId: string,
  input:    RecordInput,
): Promise<ActionResult<ContentRecord>> {
  try {
    const projectId = await requireProjectId()
    await requirePermission(nodeId, 'update')
    const record = await recordsService.update(nodeId, recordId, input, projectId)
    return { success: true, data: record }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function deleteRecord(
  nodeId:   string,
  recordId: string,
): Promise<ActionResult<void>> {
  try {
    await requirePermission(nodeId, 'delete')
    await recordsService.delete(nodeId, recordId)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function getNodeRecords(
  nodeId: string,
): Promise<ActionResult<ContentRecord[]>> {
  try {
    await requirePermission(nodeId, 'read')
    const list = await recordsService.getByNodeId(nodeId)
    return { success: true, data: list }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function getRecord(
  nodeId:   string,
  recordId: string,
): Promise<ActionResult<ContentRecord>> {
  try {
    await requirePermission(nodeId, 'read')
    const record = await recordsService.getById(nodeId, recordId)
    if (!record) return { success: false, error: 'RECORD_NOT_FOUND' }
    return { success: true, data: record }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function getRelatedRecords(
  targetNodeId: string,
): Promise<ActionResult<ContentRecord[]>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const rows = await recordsRepository.findByNodeId(targetNodeId)
    const records: ContentRecord[] = rows.map((r) => ({
      id:        r.id,
      nodeId:    r.nodeId,
      data:      (r.data as Record<string, import('@/types/records').RecordValue>) ?? {},
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
    return { success: true, data: records }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}
