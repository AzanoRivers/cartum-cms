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

/**
 * GET /api/v1/schema/:nodeId
 * Returns the fully resolved schema for a single container node by UUID.
 * Fields include all inherited content (parent, 1:1, 1:n, n:m).
 * Containers are shallow references only — never nested.
 * Any valid API token can call this endpoint.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  const { nodeId } = await params

  const ctx = await buildResolverContext()
  const node = ctx.allNodes.find((n) => n.id === nodeId)

  if (!node) return apiError('NOT_FOUND', 'Node not found.', 404)
  if (node.type !== 'container') return apiError('BAD_REQUEST', 'Node is not a container.', 400)

  const resolved = resolveNodeSchema(nodeId, ctx)

  return Response.json(
    {
      node: {
        id:         node.id,
        name:       node.name,
        slug:       node.slug ?? nodeNameToSlug(node.name),
        edit:       node.updatedAt,
        fields:     resolved.fields,
        containers: resolved.containers,
      },
    },
    { headers: corsHeaders() },
  )
}
