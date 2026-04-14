import { and, count, desc, eq, ilike, inArray, lt, sql } from 'drizzle-orm'
import { db } from '@/db'
import { media } from '@/db/schema'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client } from '@/lib/media/r2-client'
import type {
  MediaRecord,
  ListMediaAssetsInput,
  MediaAssetsPage,
  ListMediaAssetsPagedInput,
  MediaAssetsPagedResult,
  SaveMediaInput,
} from '@/types/media'

function toMediaRecord(row: typeof media.$inferSelect): MediaRecord {
  return {
    id:         row.id,
    key:        row.key,
    publicUrl:  row.publicUrl,
    mimeType:   row.mimeType,
    sizeBytes:  row.sizeBytes,
    name:       row.name ?? null,
    nodeId:     row.nodeId,
    recordId:   row.recordId,
    uploadedBy: row.uploadedBy,
    createdAt:  row.createdAt,
  }
}

export const mediaRepository = {
  async create(input: SaveMediaInput & { uploadedBy: string }): Promise<MediaRecord> {
    const [row] = await db
      .insert(media)
      .values({
        key:        input.key,
        publicUrl:  input.publicUrl,
        mimeType:   input.mimeType,
        sizeBytes:  input.sizeBytes,
        name:       input.name ?? null,
        nodeId:     input.nodeId ?? null,
        recordId:   input.recordId ?? null,
        uploadedBy: input.uploadedBy,
      })
      .returning()
    return toMediaRecord(row)
  },

  async findById(id: string): Promise<MediaRecord | null> {
    const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1)
    return row ? toMediaRecord(row) : null
  },

  async findByIds(ids: string[]): Promise<MediaRecord[]> {
    if (ids.length === 0) return []
    const rows = await db.select().from(media).where(inArray(media.id, ids))
    return rows.map(toMediaRecord)
  },

  async listPaginated(input: ListMediaAssetsInput): Promise<MediaAssetsPage> {
    const limit  = Math.min(input.limit ?? 24, 48)
    const typePrefix = input.filter === 'image' ? 'image/%' : 'video/%'

    const conditions = [sql`${media.mimeType} LIKE ${typePrefix}`]

    if (input.cursor) {
      conditions.push(lt(media.createdAt, new Date(input.cursor)))
    }
    if (input.search) {
      conditions.push(ilike(media.key, `%${input.search}%`))
    }

    const rows = await db
      .select()
      .from(media)
      .where(and(...conditions))
      .orderBy(desc(media.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const items   = hasMore ? rows.slice(0, limit) : rows

    return {
      assets:     items.map(toMediaRecord),
      nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
    }
  },

  async listPaginatedOffset(input: ListMediaAssetsPagedInput): Promise<MediaAssetsPagedResult> {
    const perPage    = Math.min(Math.max(input.perPage, 1), 40)
    const page       = Math.max(input.page, 1)
    const offset     = (page - 1) * perPage
    const typePrefix = input.filter === 'image' ? 'image/%' : 'video/%'

    const conditions = [sql`${media.mimeType} LIKE ${typePrefix}`]
    if (input.search) {
      conditions.push(ilike(media.key, `%${input.search}%`))
    }
    const where = and(...conditions)

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(media)
      .where(where)

    const rows = await db
      .select()
      .from(media)
      .where(where)
      .orderBy(desc(media.createdAt))
      .limit(perPage)
      .offset(offset)

    return {
      assets:     rows.map(toMediaRecord),
      total,
      page,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    }
  },

  async delete(id: string): Promise<void> {
    const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1)
    if (!row) throw new Error('MEDIA_NOT_FOUND')

    // Delete from R2 storage — best-effort (don't fail if R2 is unreachable)
    try {
      const { client, bucket } = await getR2Client()
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: row.key }))
    } catch {
      // ignore R2 errors — still remove DB record
    }

    await db.delete(media).where(eq(media.id, id))
  },
}
