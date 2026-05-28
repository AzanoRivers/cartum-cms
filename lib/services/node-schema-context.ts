import { db } from '@/db'
import { fieldMeta, nodeRelations, nodes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { nodeNameToSlug } from '@/nodes/api-generator'
import type { ResolverContext } from '@/types/nodes'

export async function buildResolverContext(projectId: string): Promise<ResolverContext> {
  const [allNodes, allFields, allRelations] = await Promise.all([
    db.select().from(nodes).where(eq(nodes.projectId, projectId)),
    db.select().from(nodes)
      .innerJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
      .where(eq(nodes.projectId, projectId)),
    db.select().from(nodeRelations),
  ])

  const containerSlugMap = new Map<string, string>(
    allNodes
      .filter((n) => n.type === 'container')
      .map((n) => [n.id, n.slug ?? nodeNameToSlug(n.name)]),
  )

  return { allNodes, allFields, allRelations, containerSlugMap }
}
