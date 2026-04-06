import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { nodeRelations } from '@/db/schema'
import type { NodeConnection, RelationType } from '@/types/nodes'

function mapRow(row: typeof nodeRelations.$inferSelect): NodeConnection {
  return {
    id:           row.id,
    sourceNodeId: row.sourceNodeId,
    targetNodeId: row.targetNodeId,
    relationType: row.relationType as RelationType,
  }
}

async function create(
  sourceNodeId: string,
  targetNodeId: string,
  relationType: RelationType,
): Promise<NodeConnection> {
  const [row] = await db
    .insert(nodeRelations)
    .values({ sourceNodeId, targetNodeId, relationType })
    .returning()
  return mapRow(row)
}

async function findById(id: string): Promise<NodeConnection | null> {
  const [row] = await db
    .select()
    .from(nodeRelations)
    .where(eq(nodeRelations.id, id))
    .limit(1)
  return row ? mapRow(row) : null
}

async function findBySourceOrTarget(nodeId: string): Promise<NodeConnection[]> {
  const rows = await db
    .select()
    .from(nodeRelations)
    .where(
      and(
        eq(nodeRelations.sourceNodeId, nodeId),
      ),
    )
  // also fetch where target
  const rows2 = await db
    .select()
    .from(nodeRelations)
    .where(eq(nodeRelations.targetNodeId, nodeId))

  return [...rows, ...rows2].map(mapRow)
}

async function findDuplicate(
  sourceNodeId: string,
  targetNodeId: string,
): Promise<NodeConnection | null> {
  const [row] = await db
    .select()
    .from(nodeRelations)
    .where(
      and(
        eq(nodeRelations.sourceNodeId, sourceNodeId),
        eq(nodeRelations.targetNodeId, targetNodeId),
      ),
    )
    .limit(1)
  return row ? mapRow(row) : null
}

async function deleteConnection(id: string): Promise<void> {
  await db.delete(nodeRelations).where(eq(nodeRelations.id, id))
}

export const connectionsRepository = {
  create,
  findById,
  findBySourceOrTarget,
  findDuplicate,
  delete: deleteConnection,
}
