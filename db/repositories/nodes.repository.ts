import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { nodes, fieldMeta } from '@/db/schema'
import type { AnyNode, ContainerNode, FieldNode, FieldType } from '@/types/nodes'

type NewContainerNode = {
  name: string
  parentId?: string | null
  positionX?: number
  positionY?: number
}

type NewFieldNode = {
  name: string
  parentId: string
  positionX?: number
  positionY?: number
  fieldType: FieldType
  isRequired?: boolean
  defaultValue?: string | null
  relationTargetId?: string | null
}

function mapRow(row: typeof nodes.$inferSelect): ContainerNode {
  return {
    id: row.id,
    name: row.name,
    type: 'container',
    parentId: row.parentId ?? null,
    positionX: row.positionX,
    positionY: row.positionY,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function findById(id: string): Promise<AnyNode | null> {
  const rows = await db
    .select()
    .from(nodes)
    .leftJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
    .where(eq(nodes.id, id))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  if (row.nodes.type === 'field' && row.field_meta) {
    const n = row.nodes
    const m = row.field_meta
    return {
      id: n.id,
      name: n.name,
      type: 'field',
      parentId: n.parentId ?? null,
      positionX: n.positionX,
      positionY: n.positionY,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      fieldType: m.fieldType as FieldType,
      isRequired: m.isRequired,
      defaultValue: m.defaultValue ?? null,
      relationTargetId: m.relationTargetId ?? null,
    } satisfies FieldNode
  }

  return mapRow(row.nodes)
}

async function findByParentId(parentId: string | null): Promise<ContainerNode[]> {
  const rows = await db
    .select()
    .from(nodes)
    .where(
      parentId === null
        ? and(isNull(nodes.parentId), eq(nodes.type, 'container'))
        : and(eq(nodes.parentId, parentId), eq(nodes.type, 'container')),
    )

  return rows.map(mapRow)
}

async function findFullTree(): Promise<ContainerNode[]> {
  // Recursive CTE — returns all container nodes with full ancestry path
  const result = await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT * FROM nodes WHERE parent_id IS NULL AND type = 'container'
      UNION ALL
      SELECT n.* FROM nodes n
      INNER JOIN tree t ON n.parent_id = t.id
      WHERE n.type = 'container'
    )
    SELECT * FROM tree ORDER BY created_at ASC
  `)

  // Neon returns { rows: [...] }, postgres-js returns the array directly
  const rawRows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  return (rawRows as typeof nodes.$inferSelect[]).map(mapRow)
}

async function create(input: NewContainerNode): Promise<ContainerNode> {
  const [row] = await db
    .insert(nodes)
    .values({
      name:      input.name,
      type:      'container',
      parentId:  input.parentId ?? null,
      positionX: input.positionX ?? 0,
      positionY: input.positionY ?? 0,
    })
    .returning()

  return mapRow(row)
}

async function updatePosition(
  id: string,
  positionX: number,
  positionY: number,
): Promise<void> {
  await db
    .update(nodes)
    .set({ positionX, positionY, updatedAt: new Date() })
    .where(eq(nodes.id, id))
}

async function updateName(id: string, name: string): Promise<void> {
  await db
    .update(nodes)
    .set({ name, updatedAt: new Date() })
    .where(eq(nodes.id, id))
}

async function deleteNode(id: string): Promise<void> {
  await db.delete(nodes).where(eq(nodes.id, id))
}

export const nodesRepository = {
  findById,
  findByParentId,
  findFullTree,
  create,
  updatePosition,
  updateName,
  delete: deleteNode,
}
