import { count, eq } from 'drizzle-orm'
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

export const recordsRepository = {
  findByNodeId,
  findById,
  create,
  update,
  delete: deleteRecord,
  countByNodeId,
}
