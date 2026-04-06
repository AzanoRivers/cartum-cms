import { and, count, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { nodes, fieldMeta } from '@/db/schema'
import type { AnyNode, BreadcrumbItem, ContainerNode, FieldNode, FieldType } from '@/types/nodes'

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

async function findByIds(ids: string[]): Promise<ContainerNode[]> {
  if (ids.length === 0) return []
  const rows = await db
    .select()
    .from(nodes)
    .where(inArray(nodes.id, ids))
  return rows.map(mapRow)
}

async function deleteNode(id: string): Promise<void> {
  await db.delete(nodes).where(eq(nodes.id, id))
}

// ── Additional methods for Part 06 ───────────────────────────────────────────

async function createField(input: {
  name: string
  parentId: string
  positionX: number
  positionY: number
  fieldType: FieldType
  isRequired: boolean
  defaultValue: string | null
  relationTargetId: string | null
}): Promise<FieldNode> {
  const [nodeRow] = await db
    .insert(nodes)
    .values({
      name:      input.name,
      type:      'field',
      parentId:  input.parentId,
      positionX: input.positionX,
      positionY: input.positionY,
    })
    .returning()

  const [metaRow] = await db
    .insert(fieldMeta)
    .values({
      nodeId:           nodeRow.id,
      fieldType:        input.fieldType,
      isRequired:       input.isRequired,
      defaultValue:     input.defaultValue ?? undefined,
      relationTargetId: input.relationTargetId ?? undefined,
    })
    .returning()

  return {
    id:               nodeRow.id,
    name:             nodeRow.name,
    type:             'field',
    parentId:         nodeRow.parentId ?? null,
    positionX:        nodeRow.positionX,
    positionY:        nodeRow.positionY,
    createdAt:        nodeRow.createdAt,
    updatedAt:        nodeRow.updatedAt,
    fieldType:        metaRow.fieldType as FieldType,
    isRequired:       metaRow.isRequired,
    defaultValue:     metaRow.defaultValue ?? null,
    relationTargetId: metaRow.relationTargetId ?? null,
  }
}

async function findChildren(parentId: string): Promise<AnyNode[]> {
  const rows = await db
    .select()
    .from(nodes)
    .leftJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
    .where(eq(nodes.parentId, parentId))

  return rows.map((row) => {
    if (row.nodes.type === 'field' && row.field_meta) {
      const n = row.nodes
      const m = row.field_meta
      return {
        id: n.id, name: n.name, type: 'field' as const,
        parentId: n.parentId ?? null,
        positionX: n.positionX, positionY: n.positionY,
        createdAt: n.createdAt, updatedAt: n.updatedAt,
        fieldType: m.fieldType as FieldType,
        isRequired: m.isRequired,
        defaultValue: m.defaultValue ?? null,
        relationTargetId: m.relationTargetId ?? null,
      } satisfies FieldNode
    }
    return mapRow(row.nodes)
  })
}

async function countChildren(parentId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(nodes)
    .where(eq(nodes.parentId, parentId))
  return row?.total ?? 0
}

async function findSiblingByName(
  name: string,
  parentId: string | null,
): Promise<AnyNode | null> {
  const rows = await db
    .select()
    .from(nodes)
    .where(
      parentId === null
        ? and(isNull(nodes.parentId), eq(nodes.name, name))
        : and(eq(nodes.parentId, parentId), eq(nodes.name, name)),
    )
    .limit(1)

  if (!rows[0]) return null
  return mapRow(rows[0])
}

async function findAncestors(nodeId: string): Promise<BreadcrumbItem[]> {
  const result = await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, name, parent_id FROM nodes WHERE id = ${nodeId}
      UNION ALL
      SELECT n.id, n.name, n.parent_id
      FROM nodes n
      INNER JOIN ancestors a ON n.id = a.parent_id
    )
    SELECT id, name FROM ancestors ORDER BY id
  `)

  const rawRows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  const crumbs = (rawRows as { id: string; name: string }[]).map((r) => ({
    id:   r.id,
    name: r.name,
  }))

  // Walk the tree upward: reverse so root is first
  // The CTE returns unordered; we need to reconstruct parent chain order.
  // Re-query with path to get ordered list:
  const ordered = await db.execute(sql`
    WITH RECURSIVE path AS (
      SELECT id, name, parent_id, 0 AS depth FROM nodes WHERE id = ${nodeId}
      UNION ALL
      SELECT n.id, n.name, n.parent_id, p.depth + 1
      FROM nodes n
      INNER JOIN path p ON n.id = p.parent_id
    )
    SELECT id, name FROM path ORDER BY depth DESC
  `)

  const orderedRows = Array.isArray(ordered) ? ordered : (ordered as { rows: unknown[] }).rows
  return (orderedRows as { id: string; name: string }[]).map((r) => ({
    id:   r.id,
    name: r.name,
  }))
}

async function findAll(): Promise<AnyNode[]> {
  const rows = await db
    .select()
    .from(nodes)
    .leftJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))

  return rows.map((row) => {
    if (row.nodes.type === 'field' && row.field_meta) {
      const n = row.nodes
      const m = row.field_meta
      return {
        id: n.id, name: n.name, type: 'field' as const,
        parentId: n.parentId ?? null,
        positionX: n.positionX, positionY: n.positionY,
        createdAt: n.createdAt, updatedAt: n.updatedAt,
        fieldType: m.fieldType as FieldType,
        isRequired: m.isRequired,
        defaultValue: m.defaultValue ?? null,
        relationTargetId: m.relationTargetId ?? null,
      } satisfies FieldNode
    }
    return mapRow(row.nodes)
  })
}

export const nodesRepository = {
  findById,
  findByIds,
  findByParentId,
  findChildren,
  findSiblingByName,
  findAncestors,
  findAll,
  findFullTree,
  countChildren,
  create,
  createField,
  updatePosition,
  updateName,
  delete: deleteNode,
}
