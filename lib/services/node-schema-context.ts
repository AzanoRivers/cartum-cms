import { db } from '@/db'
import { fieldMeta, nodeRelations, nodes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { nodeNameToSlug } from '@/nodes/api-generator'
import type { ResolverContext } from '@/types/nodes'

/**
 * Builds the in-memory resolver context in exactly 3 parallel DB queries.
 * All schema resolution runs against this snapshot — no N+1 queries.
 */
export async function buildResolverContext(): Promise<ResolverContext> {
  const [allNodes, allFields, allRelations] = await Promise.all([
    db.select().from(nodes),
    db.select().from(nodes).innerJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id)),
    db.select().from(nodeRelations),
  ])

  const containerSlugMap = new Map<string, string>(
    allNodes
      .filter((n) => n.type === 'container')
      .map((n) => [n.id, n.slug ?? nodeNameToSlug(n.name)]),
  )

  return { allNodes, allFields, allRelations, containerSlugMap }
}
