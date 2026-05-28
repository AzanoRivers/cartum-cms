import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders } from '@/lib/api/utils'
import { buildResolverContext } from '@/lib/services/node-schema-context'
import { resolveNodeSchema } from '@/lib/services/node-schema-resolver'
import { nodeNameToSlug } from '@/nodes/api-generator'

function apiError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  const ctx = await buildResolverContext(apiAuth.projectId)
  const rootDecks = ctx.allNodes.filter(
    (n) => n.type === 'container' && n.parentId === null && !apiAuth.excludedNodeIds.includes(n.id),
  )

  const decks = rootDecks.map((deck) => {
    const resolved = resolveNodeSchema(deck.id, ctx)
    return {
      id:         deck.id,
      name:       deck.name,
      slug:       deck.slug ?? nodeNameToSlug(deck.name),
      updatedAt:  deck.updatedAt,
      cards:      resolved.fields,
      decks:      resolved.containers,
    }
  })

  return Response.json({ decks }, { headers: corsHeaders() })
}
