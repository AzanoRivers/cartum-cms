import { nodeNameToSlug } from '@/nodes/api-generator'
import type {
  FieldType,
  FieldWithMeta,
  ResolvedContainer,
  ResolvedField,
  ResolvedNodeContent,
  ResolverContext,
} from '@/types/nodes'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapToResolvedField(
  row: FieldWithMeta,
  containerSlugMap: Map<string, string>,
): ResolvedField {
  const field: ResolvedField = {
    id:       row.nodes.id,
    name:     row.nodes.name,
    type:     row.field_meta.fieldType as FieldType,
    required: row.field_meta.isRequired,
    edit:     row.nodes.updatedAt,
  }

  if (row.field_meta.defaultValue !== null && row.field_meta.defaultValue !== undefined) {
    field.defaultValue = row.field_meta.defaultValue
  }

  if (row.field_meta.fieldType === 'relation' && row.field_meta.relationTargetId) {
    const slug = containerSlugMap.get(row.field_meta.relationTargetId)
    if (slug) field.relatesTo = slug
  }

  return field
}

function dedup<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      result.push(item)
    }
  }
  return result
}

/**
 * BFS over 1:1 relations from `startId`, returning all reachable node IDs
 * (excluding `startId` itself and anything already in `visited`).
 */
function traverse1to1Chain(
  startId:  string,
  ctx:      ResolverContext,
  visited:  Set<string>,
): Set<string> {
  const result = new Set<string>()
  const seen   = new Set<string>([startId, ...visited])
  const queue  = [startId]

  while (queue.length > 0) {
    const current = queue.pop()!
    for (const rel of ctx.allRelations) {
      if (rel.relationType !== '1:1') continue
      if (rel.sourceNodeId !== current && rel.targetNodeId !== current) continue
      const otherId = rel.sourceNodeId === current ? rel.targetNodeId : rel.sourceNodeId
      if (!seen.has(otherId)) {
        seen.add(otherId)
        result.add(otherId)
        queue.push(otherId)
      }
    }
  }

  return result
}

// ── Core resolver ─────────────────────────────────────────────────────────────

/**
 * Resolves the complete inherited schema for a node:
 *
 * - mode 'own-direct': returns only the node's own fields and containers
 *   (no inheritance, no relations). Used internally when a peer queries this
 *   node via 1:1 or 1:n.
 *
 * - mode 'full' (default): applies all inheritance rules:
 *   1. Structural parent→child (one level, own-direct of parent)
 *   2. 1:1 bidirectional (own-direct of each peer)
 *   3. 1:n unidirectional (own-direct of source injected into target + 1:1 chain)
 *   4. n:m bidirectional (full resolved of each side)
 *
 * `visitedIds` prevents infinite recursion on circular graphs.
 * Always pass a fresh `new Set()` from the call site for each independent branch.
 */
export function resolveNodeSchema(
  nodeId:     string,
  ctx:        ResolverContext,
  visitedIds: Set<string> = new Set(),
  mode:       'full' | 'own-direct' = 'full',
): ResolvedNodeContent {
  // ── Anti-cycle ────────────────────────────────────────────────────────────
  if (visitedIds.has(nodeId)) return { fields: [], containers: [] }
  visitedIds.add(nodeId)

  const node = ctx.allNodes.find((n) => n.id === nodeId)
  if (!node) return { fields: [], containers: [] }

  // ── Own direct content ────────────────────────────────────────────────────
  const ownFields: ResolvedField[] = ctx.allFields
    .filter((f) => f.nodes.parentId === nodeId)
    .map((f) => mapToResolvedField(f, ctx.containerSlugMap))

  const ownContainers: ResolvedContainer[] = ctx.allNodes
    .filter((n) => n.parentId === nodeId && n.type === 'container')
    .map((n) => ({ id: n.id, name: n.name, edit: n.updatedAt }))

  // mode='own-direct' stops here — no inheritance or relations
  if (mode === 'own-direct') {
    return {
      fields:     ownFields,
      containers: ownContainers.filter((c) => !visitedIds.has(c.id)),
    }
  }

  // ── Structural inheritance: parent → child (one level only) ───────────────
  const parentFields:     ResolvedField[]     = []
  const parentContainers: ResolvedContainer[] = []

  if (node.parentId && !visitedIds.has(node.parentId)) {
    const parentOwn = resolveNodeSchema(node.parentId, ctx, new Set(visitedIds), 'own-direct')
    parentFields.push(...parentOwn.fields)
    // Exclude the child itself from the inherited containers list (no self-reference)
    parentContainers.push(...parentOwn.containers.filter((c) => c.id !== nodeId))
  }

  // ── Relation-based inheritance ────────────────────────────────────────────
  const relFields:     ResolvedField[]     = []
  const relContainers: ResolvedContainer[] = []

  const relations = ctx.allRelations.filter(
    (r) => r.sourceNodeId === nodeId || r.targetNodeId === nodeId,
  )

  for (const rel of relations) {
    const otherId = rel.sourceNodeId === nodeId ? rel.targetNodeId : rel.sourceNodeId

    if (rel.relationType === '1:1') {
      // Bidirectional: each side sees the own-direct content of the other
      const otherOwn = resolveNodeSchema(otherId, ctx, new Set(visitedIds), 'own-direct')
      relFields.push(...otherOwn.fields)
      relContainers.push(...otherOwn.containers)

    } else if (rel.relationType === '1:n' && rel.targetNodeId === nodeId) {
      // This node is the TARGET — receive source's own-direct content
      const sourceOwn = resolveNodeSchema(rel.sourceNodeId, ctx, new Set(visitedIds), 'own-direct')
      relFields.push(...sourceOwn.fields)
      relContainers.push(...sourceOwn.containers)

    } else if (rel.relationType === '1:n' && rel.sourceNodeId === nodeId) {
      // This node is the SOURCE — skip (target receives on its own resolution)
      continue

    } else if (rel.relationType === 'n:m') {
      // Bidirectional: each side sees the fully resolved content of the other
      const otherFull = resolveNodeSchema(otherId, ctx, new Set(visitedIds), 'full')
      relFields.push(...otherFull.fields)
      relContainers.push(...otherFull.containers)
    }
  }

  // ── 1:n transitive injection via 1:1 chain ────────────────────────────────
  // If node X is reachable from this node via a chain of 1:1 relations,
  // and X is the target of a 1:n from source S, then S's own-direct content
  // is injected into this node (the 1:n traverses the 1:1 chain).
  const chainIds = traverse1to1Chain(nodeId, ctx, visitedIds)

  for (const chainNodeId of chainIds) {
    for (const rel of ctx.allRelations) {
      if (rel.relationType !== '1:n') continue
      if (rel.targetNodeId !== chainNodeId) continue
      if (visitedIds.has(rel.sourceNodeId)) continue

      const sourceOwn = resolveNodeSchema(rel.sourceNodeId, ctx, new Set(visitedIds), 'own-direct')
      relFields.push(...sourceOwn.fields)
      relContainers.push(...sourceOwn.containers)
    }
  }

  // ── Union + deduplication ─────────────────────────────────────────────────
  const allFields = dedup([...ownFields, ...parentFields, ...relFields])
  const allContainers = dedup([...ownContainers, ...parentContainers, ...relContainers])
    .filter((c) => c.id !== nodeId) // never self-reference

  return { fields: allFields, containers: allContainers }
}
