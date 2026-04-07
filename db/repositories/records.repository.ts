import { asc, count, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { records } from '@/db/schema'

type NewRecord = {
  nodeId: string
  data: Record<string, unknown>
}

type UpdateRecord = {
  data: Record<string, unknown>
}

type RecordRow = typeof records.$inferSelect

async function findByNodeId(nodeId: string): Promise<RecordRow[]> {
  return db.select().from(records).where(eq(records.nodeId, nodeId))
}

async function findById(id: string): Promise<RecordRow | null> {
  const rows = await db.select().from(records).where(eq(records.id, id)).limit(1)
  return rows[0] ?? null
}

async function create(input: NewRecord): Promise<RecordRow> {
  const [row] = await db
    .insert(records)
    .values({ nodeId: input.nodeId, data: input.data })
    .returning()
  return row
}

async function update(id: string, input: UpdateRecord): Promise<RecordRow | null> {
  const [row] = await db
    .update(records)
    .set({ data: input.data, updatedAt: new Date() })
    .where(eq(records.id, id))
    .returning()
  return row ?? null
}

async function deleteRecord(id: string): Promise<void> {
  await db.delete(records).where(eq(records.id, id))
}

async function countByNodeId(nodeId: string): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(records)
    .where(eq(records.nodeId, nodeId))
  return result?.value ?? 0
}

async function findByNodeIdPaginated(
  nodeId: string,
  opts: { page: number; limit: number; sort: string; order: 'asc' | 'desc' },
): Promise<{ rows: RecordRow[]; total: number }> {
  const offset   = (opts.page - 1) * opts.limit
  const orderFn  = opts.order === 'asc' ? asc : desc
  const orderCol = opts.sort === 'updated_at' ? records.updatedAt : records.createdAt

  const [rows, countResult] = await Promise.all([
    db.select().from(records)
      .where(eq(records.nodeId, nodeId))
      .orderBy(orderFn(orderCol))
      .limit(opts.limit)
      .offset(offset),
    db.select({ value: count() }).from(records).where(eq(records.nodeId, nodeId)),
  ])

  return { rows, total: countResult[0]?.value ?? 0 }
}

export const recordsRepository = {
  findByNodeId,
  findByNodeIdPaginated,
  findById,
  create,
  update,
  delete: deleteRecord,
  countByNodeId,
}
