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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  const { deckId } = await params

  if (apiAuth.excludedNodeIds.includes(deckId)) {
    return apiError('FORBIDDEN', 'Access to this deck is excluded by token policy.', 403)
  }

  const ctx = await buildResolverContext(apiAuth.projectId)
  const deck = ctx.allNodes.find((n) => n.id === deckId)

  if (!deck) return apiError('NOT_FOUND', 'Deck not found.', 404)
  if (deck.type !== 'container') return apiError('BAD_REQUEST', 'Node is not a deck.', 400)

  const resolved = resolveNodeSchema(deckId, ctx)

  return Response.json(
    {
      deck: {
        id:        deck.id,
        name:      deck.name,
        slug:      deck.slug ?? nodeNameToSlug(deck.name),
        updatedAt: deck.updatedAt,
        cards:     resolved.fields,
        decks:     resolved.containers,
      },
    },
    { headers: corsHeaders() },
  )
}
