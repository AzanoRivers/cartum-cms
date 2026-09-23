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
    id:         row.nodes.id,
    name:       row.nodes.name,
    simpleName: row.nodes.simpleName,
    type:       row.field_meta.fieldType as FieldType,
    required:   row.field_meta.isRequired,
    edit:       row.nodes.updatedAt,
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
 * Own-direct content of a single node: fields and containers whose parentId
 * is exactly this node. No inheritance, no relations, no recursion — a single
 * flat lookup. This is the only "unit" ever borrowed by another node, whether
 * via structural parent→child inheritance or via a relation.
 */
function ownDirect(nodeId: string, ctx: ResolverContext): ResolvedNodeContent {
  const fields: ResolvedField[] = ctx.allFields
    .filter((f) => f.nodes.parentId === nodeId)
    .map((f) => mapToResolvedField(f, ctx.containerSlugMap))

  const containers: ResolvedContainer[] = ctx.allNodes
    .filter((n) => n.parentId === nodeId && n.type === 'container')
    .map((n) => ({ id: n.id, name: n.name, simpleName: n.simpleName, edit: n.updatedAt }))

  return { fields, containers }
}

// ── Core resolver ─────────────────────────────────────────────────────────────

/**
 * Resolves the schema a node exposes through the public API: its own cards
 * (fields) plus cards borrowed through exactly one hop of inheritance —
 * never more. This keeps every response bounded: a single API call can never
 * cascade into an unbounded chain of nested decks or transitively-inherited
 * fields.
 *
 * Two independent borrowing channels, both single-hop and non-recursive:
 *
 * 1. Structural parent → child: a nested deck sees its direct parent's own
 *    cards AND own sub-decks (siblings), excluding itself. Mirrors the
 *    board's visual nesting — "one level up", never the grandparent.
 *
 * 2. Relations (1:1 / 1:n / n:m): a deck sees the OTHER side's own-direct
 *    CARDS ONLY — never its decks, never anything that side itself borrowed
 *    from a relation or from its own parent. This is the deliberate fix for
 *    the ambiguity a transitive "decks + cards" relation would create (if a
 *    relation propagated decks too, those decks' own children would then
 *    need propagating as well, with no natural stopping point). Relations
 *    are a data join between two tables, not a merge of two schemas — they
 *    never hand over the other table's children.
 *
 * `decks`/`containers` in the response are ALWAYS shallow references
 * (id/name/edit only). A consumer fetches a nested or related deck's own
 * schema with a separate call — never inline, never cascading.
 */
export function resolveNodeSchema(
  nodeId: string,
  ctx:    ResolverContext,
): ResolvedNodeContent {
  const node = ctx.allNodes.find((n) => n.id === nodeId)
  if (!node) return { fields: [], containers: [] }

  const own = ownDirect(nodeId, ctx)

  // ── Structural inheritance: parent → child (one level only) ───────────────
  let parentFields:     ResolvedField[]     = []
  let parentContainers: ResolvedContainer[] = []

  if (node.parentId && node.parentId !== nodeId) {
    const parentOwn = ownDirect(node.parentId, ctx)
    parentFields     = parentOwn.fields
    parentContainers = parentOwn.containers.filter((c) => c.id !== nodeId)
  }

  // ── Relation-based inheritance: cards only, single hop, no recursion ──────
  const relFields: ResolvedField[] = []

  for (const rel of ctx.allRelations) {
    if (rel.sourceNodeId !== nodeId && rel.targetNodeId !== nodeId) continue
    const otherId = rel.sourceNodeId === nodeId ? rel.targetNodeId : rel.sourceNodeId
    if (otherId === nodeId) continue // self-relation guard

    if (rel.relationType === '1:1') {
      // Bidirectional: each side sees the other's own-direct cards.
      relFields.push(...ownDirect(otherId, ctx).fields)

    } else if (rel.relationType === '1:n' && rel.targetNodeId === nodeId) {
      // This node is the TARGET ("many") — receives the source's own-direct cards.
      relFields.push(...ownDirect(rel.sourceNodeId, ctx).fields)

    } else if (rel.relationType === '1:n' && rel.sourceNodeId === nodeId) {
      // This node is the SOURCE ("one") — gives, never receives back.
      continue

    } else if (rel.relationType === 'n:m') {
      // Bidirectional: each side sees the other's own-direct cards.
      relFields.push(...ownDirect(otherId, ctx).fields)
    }
  }

  // ── Union + deduplication ─────────────────────────────────────────────────
  const fields     = dedup([...own.fields, ...parentFields, ...relFields])
  const containers = dedup([...own.containers, ...parentContainers])
    .filter((c) => c.id !== nodeId) // never self-reference

  return { fields, containers }
}
