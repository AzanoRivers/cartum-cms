import { recordsRepository } from '@/db/repositories/records.repository'
import { mediaRepository } from '@/db/repositories/media.repository'
import type { ContentRecord, RecordValue } from '@/types/records'
import type { FieldNode, GalleryItem } from '@/types/nodes'

export interface ParsedApiQuery {
  page:    number
  limit:   number
  sort:    string
  order:   'asc' | 'desc'
  include: string[]
  filters: Record<string, string>
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

  // Parse filter[fieldName]=value — enables 1:N queries (e.g. ?filter[authorId]=<id>)
  const filters: Record<string, string> = {}
  for (const [key, value] of url.searchParams) {
    const match = key.match(/^filter\[(.+)\]$/)
    if (match?.[1] && value) {
      filters[match[1]] = value
    }
  }

  return { page, limit, sort, order, include, filters }
}

/**
 * Expands relation, image, video, and gallery fields in a record one level deep.
 *
 * - relation → replaces stored ID with { id, ...data } of the related record
 * - image/video → replaces stored media ID with media metadata object
 * - gallery → replaces array of GalleryItems with expanded media metadata per item
 *
 * Only fields listed in includeNames are expanded. Fields not in includeNames
 * are returned as-is from record.data.
 */
export async function expandRelations(
  record:       ContentRecord,
  fields:       FieldNode[],
  includeNames: string[],
  projectId:    string,
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = { ...record.data }

  for (const fieldName of includeNames) {
    const field = fields.find((f) => f.name === fieldName)
    if (!field) continue

    const rawValue = record.data[fieldName]

    if (field.fieldType === 'relation') {
      if (!rawValue || typeof rawValue !== 'string') continue
      const relRow = await recordsRepository.findById(rawValue)
      // Validate the related record actually belongs to the expected target node
      if (!relRow || relRow.nodeId !== field.relationTargetId) continue
      result[fieldName] = { id: relRow.id, ...(relRow.data as Record<string, unknown>) }

    } else if (field.fieldType === 'image' || field.fieldType === 'video') {
      if (!rawValue || typeof rawValue !== 'string') continue
      const mediaRow = await mediaRepository.findById(rawValue, projectId)
      if (!mediaRow) continue
      result[fieldName] = {
        id:              mediaRow.id,
        url:             mediaRow.publicUrl,
        mimeType:        mediaRow.mimeType,
        storageProvider: mediaRow.storageProvider,
        sizeBytes:       mediaRow.sizeBytes,
      }

    } else if (field.fieldType === 'gallery') {
      // gallery stores GalleryItem[] in JSONB — rawValue is an array at runtime
      // despite RecordValue typing (JSONB accepts any JSON value)
      const items = rawValue as unknown as GalleryItem[] | null
      if (!Array.isArray(items)) continue
      result[fieldName] = await Promise.all(
        items.map(async (item) => {
          if (!item.mediaId) return item
          const mediaRow = await mediaRepository.findById(item.mediaId, projectId)
          if (!mediaRow) return item
          return {
            mediaId:         mediaRow.id,
            url:             mediaRow.publicUrl,
            mimeType:        mediaRow.mimeType,
            storageProvider: mediaRow.storageProvider,
            sizeBytes:       mediaRow.sizeBytes,
          }
        }),
      )
    }
  }

  return result
}

/**
 * Flattens a ContentRecord into a plain API response object.
 * Merges id, createdAt, updatedAt at the top level alongside field data.
 */
export function flattenRecord(
  record:       ContentRecord,
  expandedData?: Record<string, unknown>,
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
