import { nodesRepository } from '@/db/repositories/nodes.repository'
import { recordsRepository } from '@/db/repositories/records.repository'
import { records } from '@/db/schema'
import type { FieldNode, NumberFieldConfig } from '@/types/nodes'
import type { ContentRecord, PaginatedRecords, RecordInput } from '@/types/records'

type RecordRow = typeof records.$inferSelect

function mapRow(row: RecordRow): ContentRecord {
  return {
    id:        row.id,
    nodeId:    row.nodeId,
    data:      (row.data as Record<string, import('@/types/records').RecordValue>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function validateData(
  nodeId: string,
  data: Record<string, import('@/types/records').RecordValue>,
): Promise<void> {
  const children = await nodesRepository.findChildren(nodeId)
  const fields   = children.filter((n): n is FieldNode => n.type === 'field')

  for (const field of fields) {
    const value = data[field.name]

    if (field.isRequired && (value === null || value === undefined || value === '')) {
      throw new Error('FIELD_REQUIRED')
    }

    if (
      field.fieldType === 'number' &&
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      const num = Number(value)
      if (isNaN(num)) throw new Error('FIELD_INVALID_NUMBER')
      const cfg = (field.config ?? {}) as NumberFieldConfig
      if (
        (cfg.min !== undefined && num < cfg.min) ||
        (cfg.max !== undefined && num > cfg.max)
      ) {
        throw new Error('FIELD_NUMBER_RANGE')
      }
    }

    if (field.fieldType === 'relation' && value && field.relationTargetId) {
      const relRecord = await recordsRepository.findById(value as string)
      if (!relRecord || relRecord.nodeId !== field.relationTargetId) {
        throw new Error('FIELD_INVALID_RELATION')
      }
    }
  }
}

async function getByNodeId(nodeId: string): Promise<ContentRecord[]> {
  const rows = await recordsRepository.findByNodeId(nodeId)
  return rows.map(mapRow)
}

async function getById(nodeId: string, recordId: string): Promise<ContentRecord | null> {
  const row = await recordsRepository.findById(recordId)
  if (!row || row.nodeId !== nodeId) return null
  return mapRow(row)
}

async function create(nodeId: string, input: RecordInput): Promise<ContentRecord> {
  await validateData(nodeId, input.data)
  const row = await recordsRepository.create({ nodeId, data: input.data })
  return mapRow(row)
}

async function update(
  nodeId:   string,
  recordId: string,
  input:    RecordInput,
): Promise<ContentRecord> {
  const existing = await recordsRepository.findById(recordId)
  if (!existing || existing.nodeId !== nodeId) throw new Error('RECORD_NOT_FOUND')
  await validateData(nodeId, input.data)
  const row = await recordsRepository.update(recordId, { data: input.data })
  if (!row) throw new Error('RECORD_NOT_FOUND')
  return mapRow(row)
}

async function deleteById(nodeId: string, recordId: string): Promise<void> {
  const existing = await recordsRepository.findById(recordId)
  if (!existing || existing.nodeId !== nodeId) throw new Error('RECORD_NOT_FOUND')
  await recordsRepository.delete(recordId)
}

async function getPaginated(
  nodeId: string,
  opts:   { page: number; limit: number; sort: string; order: 'asc' | 'desc' },
): Promise<PaginatedRecords> {
  const { rows, total } = await recordsRepository.findByNodeIdPaginated(nodeId, opts)
  return {
    records: rows.map(mapRow),
    total,
    page:    opts.page,
    limit:   opts.limit,
  }
}

export const recordsService = {
  getByNodeId,
  getPaginated,
  getById,
  create,
  update,
  delete: deleteById,
}
