import { recordsRepository } from '@/db/repositories/records.repository'
import type { ContentRecord, RecordValue } from '@/types/records'
import type { FieldNode } from '@/types/nodes'

export interface ParsedApiQuery {
  page:    number
  limit:   number
  sort:    string
  order:   'asc' | 'desc'
  include: string[]
}

export function parseQueryParams(req: Request): ParsedApiQuery {
  const url      = new URL(req.url)
  const page     = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1',  10) || 1)
  const rawLimit = parseInt(url.searchParams.get('limit') ?? '20', 10) || 20
  const limit    = Math.min(100, Math.max(1, rawLimit))
  const sort     = url.searchParams.get('sort')  ?? 'created_at'
  const rawOrder = url.searchParams.get('order') ?? 'desc'
  const order    = (rawOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
  const rawInclude = url.searchParams.get('include') ?? ''
  const include  = rawInclude
    ? rawInclude.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  return { page, limit, sort, order, include }
}

/**
 * Expands relation fields in a record one level deep.
 * Replaces the stored relation ID with the full related record's data.
 */
export async function expandRelations(
  record:       ContentRecord,
  fields:       FieldNode[],
  includeNames: string[],
): Promise<Record<string, RecordValue | Record<string, RecordValue>>> {
  const result: Record<string, RecordValue | Record<string, RecordValue>> = { ...record.data }

  for (const fieldName of includeNames) {
    const field = fields.find((f) => f.name === fieldName && f.fieldType === 'relation')
    if (!field) continue

    const relId = record.data[fieldName]
    if (!relId || typeof relId !== 'string') continue

    const relRow = await recordsRepository.findById(relId)
    if (!relRow) continue

    result[fieldName] = relRow.data as Record<string, RecordValue>
  }

  return result
}

/**
 * Flattens a ContentRecord into a plain API response object.
 * Merges id, createdAt, updatedAt at the top level alongside field data.
 */
export function flattenRecord(
  record:       ContentRecord,
  expandedData?: Record<string, RecordValue | Record<string, RecordValue>>,
): Record<string, unknown> {
  return {
    id:        record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(expandedData ?? record.data),
  }
}

export function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control':                'no-store',
  }
}
