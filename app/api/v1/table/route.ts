import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders } from '@/lib/api/utils'
import { buildResolverContext } from '@/lib/services/node-schema-context'
import { resolveNodeSchema } from '@/lib/services/node-schema-resolver'
import { nodeService } from '@/lib/services/nodes.service'
import { rolesService } from '@/lib/services/roles.service'
import { CreateContainerSchema } from '@/lib/actions/nodes.schemas'
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
  if (!apiAuth.scope.includes('read')) return apiError('FORBIDDEN', 'Token scope does not allow read.', 403)

  const ctx = await buildResolverContext(apiAuth.projectId)
  const rootDecks = ctx.allNodes.filter(
    (n) => n.type === 'container' && n.parentId === null && !apiAuth.excludedNodeIds.includes(n.id),
  )

  // Silently drop decks the token's role cannot read — never 403 the whole
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

  let body: { name?: unknown; parentId?: unknown }
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400)
  }

  const parsed = CreateContainerSchema.safeParse({
    name:     body.name,
    parentId: body.parentId ?? null,
  })
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input.', 422)
  }

  if (parsed.data.parentId && apiAuth.excludedNodeIds.includes(parsed.data.parentId)) {
    return apiError('FORBIDDEN', 'Access to the parent deck is excluded by token policy.', 403)
  }

  try {
    const node = await nodeService.createContainer(parsed.data, apiAuth.projectId)
    return Response.json(
      { data: { id: node.id, name: node.name, parentId: node.parentId, createdAt: node.createdAt, updatedAt: node.updatedAt } },
      { status: 201, headers: corsHeaders() },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error.'
    return apiError('VALIDATION_ERROR', msg, 422)
  }
}
