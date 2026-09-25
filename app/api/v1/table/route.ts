import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders, getParentSimpleName, matchesNameQuery } from '@/lib/api/utils'
import { buildResolverContext } from '@/lib/services/node-schema-context'
import { resolveNodeSchema } from '@/lib/services/node-schema-resolver'
import { nodeService } from '@/lib/services/nodes.service'
import { rolesService } from '@/lib/services/roles.service'
import { CreateContainerSchema } from '@/lib/actions/nodes.schemas'
import { nodeNameToSlug, toSimpleName } from '@/nodes/api-generator'

function apiError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('read')) return apiError('FORBIDDEN', 'Token scope does not allow read.', 403)

  const url    = new URL(req.url)
  const search = url.searchParams.get('search') ?? ''
  const strict = url.searchParams.get('strict') === 'true'

  const ctx = await buildResolverContext(apiAuth.projectId)
  const rootDecks = ctx.allNodes.filter(
    (n) =>
      n.type === 'container' &&
      n.parentId === null &&
      !apiAuth.excludedNodeIds.includes(n.id) &&
      matchesNameQuery(n.name, n.simpleName, search, strict),
  )

  // Silently drop decks the token's role cannot read, never 403 the whole
  // list for one restricted deck among many.
  const readable = await Promise.all(
    rootDecks.map(async (deck) => ({
      deck,
      allowed: await rolesService.canPerformByRole(apiAuth.roleId, deck.id, 'read', apiAuth.projectId),
    })),
  )

  const decks = readable
    .filter((r) => r.allowed)
    .map(({ deck }) => {
      const resolved = resolveNodeSchema(deck.id, ctx)
      return {
        id:         deck.id,
        name:       deck.name,
        simpleName: deck.simpleName,
        slug:       deck.slug ?? nodeNameToSlug(deck.name),
        updatedAt:  deck.updatedAt,
        cards:      resolved.fields,
        decks:      resolved.containers,
      }
    })

  return Response.json({ decks }, { headers: corsHeaders() })
}

export async function POST(req: Request) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('write')) return apiError('FORBIDDEN', 'Token scope does not allow write.', 403)

  const schemaPerms = await rolesService.resolveSchemaPermissionsByRole(apiAuth.roleId, apiAuth.projectId)
  if (!schemaPerms.canCreate) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  let body: { name?: unknown; parentId?: unknown; parentSimpleName?: unknown }
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400)
  }

  const parsed = CreateContainerSchema.safeParse({
    name:             body.name,
    parentId:         body.parentId,
    parentSimpleName: body.parentSimpleName,
  })
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input.', 422)
  }

  // parentId (a real id) always wins if given. Otherwise, parentSimpleName
  // (v1-API-only convenience) is resolved to a real container id. Neither
  // given means "create at the root of the table" (parentId stays null).
  let parentId = parsed.data.parentId
  if (parentId === null && parsed.data.parentSimpleName) {
    const wanted = toSimpleName(parsed.data.parentSimpleName)
    const ctx = await buildResolverContext(apiAuth.projectId)
    const matches = ctx.allNodes.filter((n) => n.type === 'container' && n.simpleName === wanted)

    if (matches.length === 0) {
      return apiError('NOT_FOUND', `No deck with simpleName '${parsed.data.parentSimpleName}' was found.`, 404)
    }
    if (matches.length > 1) {
      return apiError(
        'AMBIGUOUS_PARENT',
        `${matches.length} decks share simpleName '${parsed.data.parentSimpleName}'. Use parentId instead.`,
        409,
      )
    }
    parentId = matches[0].id
  }

  if (parentId && apiAuth.excludedNodeIds.includes(parentId)) {
    return apiError('FORBIDDEN', 'Access to the parent deck is excluded by token policy.', 403)
  }

  try {
    const node = await nodeService.createContainer({ ...parsed.data, parentId }, apiAuth.projectId)
    const parentSimpleName = await getParentSimpleName(node.parentId, apiAuth.projectId)
    return Response.json(
      { data: { id: node.id, name: node.name, simpleName: node.simpleName, parentId: node.parentId, parentSimpleName, createdAt: node.createdAt, updatedAt: node.updatedAt } },
      { status: 201, headers: corsHeaders() },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error.'
    return apiError('VALIDATION_ERROR', msg, 422)
  }
}
