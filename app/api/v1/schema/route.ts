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
 * GET /api/v1/schema
 * Returns all root container nodes with their fully resolved schema.
 * Fields include all inherited content (parent, 1:1, 1:n, n:m).
 * Containers are shallow references only — never nested.
 * Any valid API token can call this endpoint (no node-level permission required).
 */
export async function GET(req: Request) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  const ctx = await buildResolverContext()
  const rootNodes = ctx.allNodes.filter((n) => n.type === 'container' && n.parentId === null)

  const schema = rootNodes.map((node) => {
    const resolved = resolveNodeSchema(node.id, ctx)
    return {
      id:         node.id,
      name:       node.name,
      slug:       node.slug ?? nodeNameToSlug(node.name),
      edit:       node.updatedAt,
      fields:     resolved.fields,
      containers: resolved.containers,
    }
  })

  return Response.json({ nodes: schema }, { headers: corsHeaders() })
}
