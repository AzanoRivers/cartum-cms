import { db } from '@/db'
import { fieldMeta, nodeRelations, nodes } from '@/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { nodeNameToSlug } from '@/nodes/api-generator'
import type { ResolverContext } from '@/types/nodes'

export async function buildResolverContext(projectId: string): Promise<ResolverContext> {
  // Every project's data is isolated: nodeRelations has no projectId column of
  // its own, so it is scoped here by requiring BOTH endpoints of the relation
  // to belong to this project's own nodes — never the whole instance.
  const projectNodeIds = db.select({ id: nodes.id }).from(nodes).where(eq(nodes.projectId, projectId))

  const [allNodes, allFields, allRelations] = await Promise.all([
    db.select().from(nodes).where(eq(nodes.projectId, projectId)),
    db.select().from(nodes)
      .innerJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
      .where(eq(nodes.projectId, projectId)),
    db.select().from(nodeRelations).where(
      and(
        inArray(nodeRelations.sourceNodeId, projectNodeIds),
        inArray(nodeRelations.targetNodeId, projectNodeIds),
      ),
    ),
  ])

  const containerSlugMap = new Map<string, string>(
    allNodes
      .filter((n) => n.type === 'container')
      .map((n) => [n.id, n.slug ?? nodeNameToSlug(n.name)]),
  )

  return { allNodes, allFields, allRelations, containerSlugMap }
}
