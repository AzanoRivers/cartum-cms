import { recordsRepository } from '@/db/repositories/records.repository'
import { mediaRepository } from '@/db/repositories/media.repository'
import { nodesRepository } from '@/db/repositories/nodes.repository'
import { toSimpleName } from '@/nodes/api-generator'
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

/**
 * Whether a deck/card matches a search query.
 *
 * Default (substring mode): matches if `query` is a substring of the display
 * `name` (case-insensitive) OR of `simpleName` (both normalized the same way
 * — lowercased, whitespace stripped — so "My Deck", "my deck" and "MyDeck"
 * all match "deck").
 *
 * Strict mode (`strict: true`): ignores `name` entirely and requires an
 * EXACT match against the normalized `simpleName` — "deck" no longer matches
 * "My Deck", only an exact "mydeck" does.
 */
export function matchesNameQuery(name: string, simpleName: string | null, query: string, strict = false): boolean {
  const q = query.trim()
  if (!q) return true

  const resolvedSimpleName = simpleName ?? toSimpleName(name)
  if (strict) return resolvedSimpleName === toSimpleName(q)

  if (name.toLowerCase().includes(q.toLowerCase())) return true
  return resolvedSimpleName.includes(toSimpleName(q))
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Whether `value` is a well-formed UUID. Every id path param that feeds a
 * raw `eq(uuidColumn, value)` query MUST be checked with this before the
 * query runs — Postgres throws a raw, uncaught type error (500, with the
 * query text in the response) for a non-UUID string, instead of a clean
 * 400/404. Route handlers should return 400 INVALID_ID when this is false.
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

/**
 * The simpleName of a deck/card's parent, for API responses that expose
 * `parentId` — resolves it in one extra lookup so consumers don't have to
 * make a second call just to know the parent's simpleName. Null when there
 * is no parent (a root deck).
 */
export async function getParentSimpleName(parentId: string | null, projectId: string): Promise<string | null> {
  if (!parentId) return null
  const parent = await nodesRepository.findById(parentId, projectId)
  return parent?.simpleName ?? null
}

export function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control':                'no-store',
  }
}
