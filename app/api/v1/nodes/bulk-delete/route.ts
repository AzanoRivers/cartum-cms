import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders } from '@/lib/api/utils'
import { nodeService } from '@/lib/services/nodes.service'
import { rolesService } from '@/lib/services/roles.service'
import { DeleteNodesSchema } from '@/lib/actions/nodes.schemas'

function apiError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

/**
 * Bulk delete for decks and/or cards in one call — each cascades on its own
 * subtree (nested decks, their cards, their records, their media) exactly
 * like DELETE /api/v1/table/{deckId}?cascade=true. One failing ID never
 * blocks the rest: every ID gets its own success/error entry in the response.
 */
export async function POST(req: Request) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('delete')) return apiError('FORBIDDEN', 'Token scope does not allow delete.', 403)

  const schemaPerms = await rolesService.resolveSchemaPermissionsByRole(apiAuth.roleId, apiAuth.projectId)
  if (!schemaPerms.canDelete) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400)
  }

  const parsed = DeleteNodesSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input.', 422)
  }

  const results = await Promise.all(
    parsed.data.ids.map(async (id) => {
      if (apiAuth.excludedNodeIds.includes(id)) {
        return { id, success: false as const, error: 'FORBIDDEN' }
      }
      try {
        const result = await nodeService.delete(id, apiAuth.projectId, true)
        return { id, success: true as const, mediaPurged: result.mediaPurged, mediaFailed: result.mediaFailed }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error.'
        return { id, success: false as const, error: msg.split(':')[0] }
      }
    }),
  )

  return Response.json(
    {
      data: {
        deleted: results.filter((r) => r.success).length,
        failed:  results.filter((r) => !r.success).length,
        results,
      },
    },
    { headers: corsHeaders() },
  )
}
