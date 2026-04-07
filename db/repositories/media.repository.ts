import { and, desc, eq, ilike, lt, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { media } from '@/db/schema'
import type { MediaRecord, ListMediaAssetsInput, MediaAssetsPage, SaveMediaInput } from '@/types/media'

function toMediaRecord(row: typeof media.$inferSelect): MediaRecord {
  return {
    id:         row.id,
    key:        row.key,
    publicUrl:  row.publicUrl,
    mimeType:   row.mimeType,
    sizeBytes:  row.sizeBytes,
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
}
