import { and, count, eq, inArray, or } from 'drizzle-orm'
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

async function countByNodeId(nodeId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(nodeRelations)
    .where(
      or(
        eq(nodeRelations.sourceNodeId, nodeId),
        eq(nodeRelations.targetNodeId, nodeId),
      ),
    )
  return row?.total ?? 0
}

async function deleteConnection(id: string): Promise<void> {
  await db.delete(nodeRelations).where(eq(nodeRelations.id, id))
}

async function updateRelationType(
  id: string,
  relationType: RelationType,
): Promise<NodeConnection> {
  const [row] = await db
    .update(nodeRelations)
    .set({ relationType })
    .where(eq(nodeRelations.id, id))
    .returning()
  return mapRow(row)
}

async function findBetweenNodes(nodeIds: string[]): Promise<NodeConnection[]> {
  if (nodeIds.length === 0) return []
  const rows = await db
    .select()
    .from(nodeRelations)
    .where(
      and(
        inArray(nodeRelations.sourceNodeId, nodeIds),
        inArray(nodeRelations.targetNodeId, nodeIds),
      ),
    )
  return rows.map(mapRow)
}

export const connectionsRepository = {
  create,
  findById,
  findBySourceOrTarget,
  findBetweenNodes,
  findDuplicate,
  countByNodeId,
  updateRelationType,
  delete: deleteConnection,
}
