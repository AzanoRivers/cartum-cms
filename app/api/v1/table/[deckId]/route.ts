import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders, getParentSimpleName, isUuid, matchesNameQuery } from '@/lib/api/utils'
import { buildResolverContext } from '@/lib/services/node-schema-context'
import { resolveNodeSchema } from '@/lib/services/node-schema-resolver'
import { nodeService } from '@/lib/services/nodes.service'
import { rolesService } from '@/lib/services/roles.service'
import { nodesRepository } from '@/db/repositories/nodes.repository'
import { RenameNodeSchema } from '@/lib/actions/nodes.schemas'
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
  if (!apiAuth.scope.includes('read')) return apiError('FORBIDDEN', 'Token scope does not allow read.', 403)

  const { deckId } = await params
  if (!isUuid(deckId)) return apiError('NOT_FOUND', 'Deck not found.', 404)

  if (apiAuth.excludedNodeIds.includes(deckId)) {
    return apiError('FORBIDDEN', 'Access to this deck is excluded by token policy.', 403)
  }

  const allowed = await rolesService.canPerformByRole(apiAuth.roleId, deckId, 'read', apiAuth.projectId)
  if (!allowed) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  // ctx is already scoped to apiAuth.projectId - a deckId from another
  // project simply won't be found here, never leaked.
  const ctx = await buildResolverContext(apiAuth.projectId)
  const deck = ctx.allNodes.find((n) => n.id === deckId)

  if (!deck) return apiError('NOT_FOUND', 'Deck not found.', 404)
  if (deck.type !== 'container') return apiError('BAD_REQUEST', 'Node is not a deck.', 400)

  const resolved = resolveNodeSchema(deckId, ctx)
  const url      = new URL(req.url)
  const search   = url.searchParams.get('search') ?? ''
  const strict   = url.searchParams.get('strict') === 'true'

  return Response.json(
    {
      deck: {
        id:         deck.id,
        name:       deck.name,
        simpleName: deck.simpleName,
        slug:       deck.slug ?? nodeNameToSlug(deck.name),
        updatedAt:  deck.updatedAt,
        cards:      resolved.fields.filter((f) => matchesNameQuery(f.name, f.simpleName, search, strict)),
        decks:      resolved.containers.filter((c) => matchesNameQuery(c.name, c.simpleName, search, strict)),
      },
    },
    { headers: corsHeaders() },
  )
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('update')) return apiError('FORBIDDEN', 'Token scope does not allow update.', 403)

  const { deckId } = await params
  if (!isUuid(deckId)) return apiError('NOT_FOUND', 'Deck not found.', 404)

  if (apiAuth.excludedNodeIds.includes(deckId)) {
    return apiError('FORBIDDEN', 'Access to this deck is excluded by token policy.', 403)
  }

  const schemaPerms = await rolesService.resolveSchemaPermissionsByRole(apiAuth.roleId, apiAuth.projectId)
  if (!schemaPerms.canUpdate) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  const existing = await nodesRepository.findById(deckId, apiAuth.projectId)
  if (!existing) return apiError('NOT_FOUND', 'Deck not found.', 404)
  if (existing.type !== 'container') return apiError('BAD_REQUEST', 'Node is not a deck.', 400)

  let body: { name?: unknown }
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400)
  }

  const parsed = RenameNodeSchema.safeParse({ id: deckId, name: body.name })
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input.', 422)
  }

  try {
    const node = await nodeService.rename(deckId, parsed.data.name, apiAuth.projectId)
    const parentSimpleName = await getParentSimpleName(node.parentId, apiAuth.projectId)
    return Response.json(
      { data: { id: node.id, name: node.name, simpleName: node.simpleName, parentId: node.parentId, parentSimpleName, updatedAt: node.updatedAt } },
      { headers: corsHeaders() },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error.'
    if (msg === 'NODE_NOT_FOUND') return apiError('NOT_FOUND', 'Deck not found.', 404)
    return apiError('VALIDATION_ERROR', msg, 422)
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('delete')) return apiError('FORBIDDEN', 'Token scope does not allow delete.', 403)

  const { deckId } = await params
  if (!isUuid(deckId)) return apiError('NOT_FOUND', 'Deck not found.', 404)

  if (apiAuth.excludedNodeIds.includes(deckId)) {
    return apiError('FORBIDDEN', 'Access to this deck is excluded by token policy.', 403)
  }

  const schemaPerms = await rolesService.resolveSchemaPermissionsByRole(apiAuth.roleId, apiAuth.projectId)
  if (!schemaPerms.canDelete) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  const existing = await nodesRepository.findById(deckId, apiAuth.projectId)
  if (!existing) return apiError('NOT_FOUND', 'Deck not found.', 404)
  if (existing.type !== 'container') return apiError('BAD_REQUEST', 'Node is not a deck.', 400)

  const url     = new URL(req.url)
  const cascade = url.searchParams.get('cascade') === 'true'

  try {
    const result = await nodeService.delete(deckId, apiAuth.projectId, cascade)
    return Response.json(
      { data: { deleted: true, mediaPurged: result.mediaPurged, mediaFailed: result.mediaFailed } },
      { headers: corsHeaders() },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error.'
    const [code, countStr] = msg.split(':')
    if (code === 'NODE_HAS_CHILDREN' || code === 'NODE_HAS_CONNECTIONS') {
      return Response.json(
        {
          error:   code,
          message: code === 'NODE_HAS_CHILDREN'
            ? `This deck contains ${countStr} nested card(s)/deck(s). Pass ?cascade=true to delete them along with it.`
            : `This deck has ${countStr} active relation(s) with other decks. Pass ?cascade=true to delete it anyway.`,
          count: Number(countStr),
        },
        { status: 409, headers: corsHeaders() },
      )
    }
    if (code === 'NODE_NOT_FOUND') return apiError('NOT_FOUND', 'Deck not found.', 404)
    return apiError('SERVER_ERROR', msg, 500)
  }
}
