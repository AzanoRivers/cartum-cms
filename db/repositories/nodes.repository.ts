import { and, count, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { nodes, fieldMeta } from '@/db/schema'
import { nodeNameToSlug } from '@/nodes/api-generator'
import type { AnyNode, BreadcrumbItem, ContainerNode, FieldConfig, FieldNode, FieldType } from '@/types/nodes'

type NewContainerNode = {
  projectId: string
  name: string
  parentId?: string | null
  positionX?: number
  positionY?: number
}

type NewFieldNode = {
  projectId: string
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
    id:        row.id,
    name:      row.name,
    type:      'container',
    parentId:  row.parentId ?? null,
    positionX: row.positionX,
    positionY: row.positionY,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function findById(id: string, projectId: string): Promise<AnyNode | null> {
  const rows = await db
    .select()
    .from(nodes)
    .leftJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
    .where(and(eq(nodes.id, id), eq(nodes.projectId, projectId)))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  if (row.nodes.type === 'field' && row.field_meta) {
    const n = row.nodes
    const m = row.field_meta
    return {
      id:               n.id,
      name:             n.name,
      type:             'field',
      parentId:         n.parentId ?? null,
      positionX:        n.positionX,
      positionY:        n.positionY,
      createdAt:        n.createdAt,
      updatedAt:        n.updatedAt,
      fieldType:        m.fieldType as FieldType,
      isRequired:       m.isRequired,
      defaultValue:     m.defaultValue ?? null,
      relationTargetId: m.relationTargetId ?? null,
      config:           (m.config as FieldConfig) ?? null,
    } satisfies FieldNode
  }

  return mapRow(row.nodes)
}

async function findByParentId(parentId: string | null, projectId: string): Promise<ContainerNode[]> {
  const rows = await db
    .select()
    .from(nodes)
    .where(
      parentId === null
        ? and(isNull(nodes.parentId), eq(nodes.type, 'container'), eq(nodes.projectId, projectId))
        : and(eq(nodes.parentId, parentId), eq(nodes.type, 'container'), eq(nodes.projectId, projectId)),
    )

  return rows.map(mapRow)
}

async function findFullTree(projectId: string): Promise<ContainerNode[]> {
  const result = await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT * FROM nodes
      WHERE parent_id IS NULL AND type = 'container' AND project_id = ${projectId}
      UNION ALL
      SELECT n.* FROM nodes n
      INNER JOIN tree t ON n.parent_id = t.id
      WHERE n.type = 'container'
    )
    SELECT * FROM tree ORDER BY created_at ASC
  `)

  const rawRows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  return (rawRows as typeof nodes.$inferSelect[]).map(mapRow)
}

async function create(input: NewContainerNode): Promise<ContainerNode> {
  const [row] = await db
    .insert(nodes)
    .values({
      projectId: input.projectId,
      name:      input.name,
      type:      'container',
      parentId:  input.parentId ?? null,
      positionX: input.positionX ?? 0,
      positionY: input.positionY ?? 0,
      slug:      input.parentId ? null : nodeNameToSlug(input.name),
    })
    .returning()

  return mapRow(row)
}

async function findBySlug(slug: string, projectId: string): Promise<ContainerNode | null> {
  const bySlug = await db
    .select()
    .from(nodes)
    .where(and(eq(nodes.slug, slug), isNull(nodes.parentId), eq(nodes.type, 'container'), eq(nodes.projectId, projectId)))
    .limit(1)

  if (bySlug[0]) return mapRow(bySlug[0])

  const roots = await db
    .select()
    .from(nodes)
    .where(and(isNull(nodes.parentId), eq(nodes.type, 'container'), eq(nodes.projectId, projectId)))

  const match = roots.find((r) => nodeNameToSlug(r.name) === slug)
  return match ? mapRow(match) : null
}

async function updatePosition(id: string, positionX: number, positionY: number, projectId: string): Promise<void> {
  await db
    .update(nodes)
    .set({ positionX, positionY, updatedAt: new Date() })
    .where(and(eq(nodes.id, id), eq(nodes.projectId, projectId)))
}

async function updateName(id: string, name: string, parentId: string | null, projectId: string): Promise<void> {
  const updated = await db
    .update(nodes)
    .set({
      name,
      ...(parentId === null && { slug: nodeNameToSlug(name) }),
      updatedAt: new Date(),
    })
    .where(and(eq(nodes.id, id), eq(nodes.projectId, projectId)))
    .returning()

  console.log('[updateName] id=%s name=%s → rows affected: %d', id, name, updated.length)
  if (updated.length === 0) {
    console.warn('[updateName] WARNING: no rows updated — id may not exist in DB')
  }
}

async function findByIds(ids: string[], projectId: string): Promise<ContainerNode[]> {
  if (ids.length === 0) return []
  const rows = await db
    .select()
    .from(nodes)
    .where(and(inArray(nodes.id, ids), eq(nodes.projectId, projectId)))
  return rows.map(mapRow)
}

async function deleteNode(id: string, projectId: string): Promise<void> {
  await db.delete(nodes).where(and(eq(nodes.id, id), eq(nodes.projectId, projectId)))
}

async function createField(input: {
  projectId: string
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
      projectId: input.projectId,
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
    config:           null,
  }
}

async function findChildren(parentId: string, projectId: string): Promise<AnyNode[]> {
  const rows = await db
    .select()
    .from(nodes)
    .leftJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
    .where(and(eq(nodes.parentId, parentId), eq(nodes.projectId, projectId)))

  return rows.map((row) => {
    if (row.nodes.type === 'field' && row.field_meta) {
      const n = row.nodes
      const m = row.field_meta
      return {
        id: n.id, name: n.name, type: 'field' as const,
        parentId:         n.parentId ?? null,
        positionX:        n.positionX, positionY: n.positionY,
        createdAt:        n.createdAt, updatedAt: n.updatedAt,
        fieldType:        m.fieldType as FieldType,
        isRequired:       m.isRequired,
        defaultValue:     m.defaultValue ?? null,
        relationTargetId: m.relationTargetId ?? null,
        config:           (m.config as FieldConfig) ?? null,
      } satisfies FieldNode
    }
    return mapRow(row.nodes)
  })
}

async function countChildren(parentId: string, projectId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(nodes)
    .where(and(eq(nodes.parentId, parentId), eq(nodes.projectId, projectId)))
  return row?.total ?? 0
}

async function countRelationReferences(nodeId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(fieldMeta)
    .where(eq(fieldMeta.relationTargetId, nodeId))
  return row?.total ?? 0
}

async function findSiblingByName(name: string, parentId: string | null, projectId: string): Promise<AnyNode | null> {
  const rows = await db
    .select()
    .from(nodes)
    .where(
      parentId === null
        ? and(isNull(nodes.parentId), eq(nodes.name, name), eq(nodes.projectId, projectId))
        : and(eq(nodes.parentId, parentId), eq(nodes.name, name), eq(nodes.projectId, projectId)),
    )
    .limit(1)

  if (!rows[0]) return null
  return mapRow(rows[0])
}

async function findAncestors(nodeId: string): Promise<BreadcrumbItem[]> {
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

async function findAll(projectId: string): Promise<AnyNode[]> {
  const rows = await db
    .select()
    .from(nodes)
    .leftJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
    .where(eq(nodes.projectId, projectId))

  return rows.map((row) => {
    if (row.nodes.type === 'field' && row.field_meta) {
      const n = row.nodes
      const m = row.field_meta
      return {
        id: n.id, name: n.name, type: 'field' as const,
        parentId:         n.parentId ?? null,
        positionX:        n.positionX, positionY: n.positionY,
        createdAt:        n.createdAt, updatedAt: n.updatedAt,
        fieldType:        m.fieldType as FieldType,
        isRequired:       m.isRequired,
        defaultValue:     m.defaultValue ?? null,
        relationTargetId: m.relationTargetId ?? null,
        config:           (m.config as FieldConfig) ?? null,
      } satisfies FieldNode
    }
    return mapRow(row.nodes)
  })
}

async function updateFieldMeta(nodeId: string, projectId: string, patch: {
  name?: string
  fieldType?: FieldType
  isRequired?: boolean
  defaultValue?: string | null
  relationTargetId?: string | null
  config?: FieldConfig | null
}): Promise<FieldNode> {
  if (patch.name !== undefined) {
    await db
      .update(nodes)
      .set({ name: patch.name, updatedAt: new Date() })
      .where(and(eq(nodes.id, nodeId), eq(nodes.projectId, projectId)))
  }

  const metaPatch: Partial<{
    fieldType: string
    isRequired: boolean
    defaultValue: string | null
    relationTargetId: string | null
    config: unknown
  }> = {}
  if (patch.fieldType !== undefined)   metaPatch.fieldType = patch.fieldType
  if (patch.isRequired !== undefined)  metaPatch.isRequired = patch.isRequired
  if ('defaultValue' in patch)         metaPatch.defaultValue = patch.defaultValue ?? null
  if ('relationTargetId' in patch)     metaPatch.relationTargetId = patch.relationTargetId ?? null
  if ('config' in patch)               metaPatch.config = patch.config

  if (Object.keys(metaPatch).length > 0) {
    await db.update(fieldMeta).set(metaPatch).where(eq(fieldMeta.nodeId, nodeId))
  }

  const updated = await findById(nodeId, projectId)
  if (!updated || updated.type !== 'field') throw new Error('NODE_NOT_FOUND')
  return updated
}

export const nodesRepository = {
  findById,
  findByIds,
  findByParentId,
  findBySlug,
  findChildren,
  findSiblingByName,
  findAncestors,
  findAll,
  findFullTree,
  countChildren,
  countRelationReferences,
  create,
  createField,
  updateFieldMeta,
  updatePosition,
  updateName,
  delete: deleteNode,
}
