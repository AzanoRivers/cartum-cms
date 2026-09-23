import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders, matchesNameQuery } from '@/lib/api/utils'
import { buildResolverContext } from '@/lib/services/node-schema-context'
import { rolesService } from '@/lib/services/roles.service'
import { nodeNameToSlug } from '@/nodes/api-generator'

function apiError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

/**
 * GET /api/v1/deck?search=&strict= - searches decks project-wide, at ANY
 * nesting level (unlike GET /api/v1/table, which only searches root decks).
 * Returns lightweight deck info only, never cards/decks, the same shallow
 * shape a related/nested deck gets elsewhere in the API. Fetch a matched
 * deck's own content separately with GET /api/v1/table/{deckId}.
 */
export async function GET(req: Request) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('read')) return apiError('FORBIDDEN', 'Token scope does not allow read.', 403)

  const url    = new URL(req.url)
  const search = url.searchParams.get('search') ?? ''
  const strict = url.searchParams.get('strict') === 'true'

  const ctx = await buildResolverContext(apiAuth.projectId)
  const decks = ctx.allNodes.filter(
    (n) =>
      n.type === 'container' &&
      !apiAuth.excludedNodeIds.includes(n.id) &&
      matchesNameQuery(n.name, n.simpleName, search, strict),
  )

  // Never 403 the whole search for one restricted deck among many.
  const readable = await Promise.all(
    decks.map(async (deck) => ({
      deck,
      allowed: await rolesService.canPerformByRole(apiAuth.roleId, deck.id, 'read', apiAuth.projectId),
    })),
  )

  const data = readable
    .filter((r) => r.allowed)
    .map(({ deck }) => ({
      id:               deck.id,
      name:             deck.name,
      simpleName:       deck.simpleName,
      slug:             deck.slug ?? nodeNameToSlug(deck.name),
      parentId:         deck.parentId,
      parentSimpleName: deck.parentId ? (ctx.allNodes.find((n) => n.id === deck.parentId)?.simpleName ?? null) : null,
      updatedAt:        deck.updatedAt,
    }))

  return Response.json({ data }, { headers: corsHeaders() })
}
