import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders } from '@/lib/api/utils'
import { nodeService } from '@/lib/services/nodes.service'
import { rolesService } from '@/lib/services/roles.service'
import { CreateFieldSchema } from '@/lib/actions/nodes.schemas'

function apiError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function POST(req: Request) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('write')) return apiError('FORBIDDEN', 'Token scope does not allow write.', 403)

  const schemaPerms = await rolesService.resolveSchemaPermissionsByRole(apiAuth.roleId, apiAuth.projectId)
  if (!schemaPerms.canCreate) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400)
  }

  const parsed = CreateFieldSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input.', 422)
  }

  if (apiAuth.excludedNodeIds.includes(parsed.data.parentId)) {
    return apiError('FORBIDDEN', 'Access to the parent deck is excluded by token policy.', 403)
  }

  try {
    const node = await nodeService.createField(parsed.data, apiAuth.projectId)
    return Response.json(
      {
        data: {
          id:               node.id,
          name:             node.name,
          parentId:         node.parentId,
          fieldType:        node.fieldType,
          required:         node.isRequired,
          defaultValue:     node.defaultValue,
          relationTargetId: node.relationTargetId,
          createdAt:        node.createdAt,
          updatedAt:        node.updatedAt,
        },
      },
      { status: 201, headers: corsHeaders() },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error.'
    return apiError('VALIDATION_ERROR', msg, 422)
  }
}
