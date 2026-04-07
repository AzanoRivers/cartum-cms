import { nodeService } from '@/lib/services/nodes.service'
import { recordsService } from '@/lib/services/records.service'
import { rolesService } from '@/lib/services/roles.service'
import { nodesRepository } from '@/db/repositories/nodes.repository'
import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders, expandRelations, flattenRecord, parseQueryParams } from '@/lib/api/utils'
import type { FieldNode } from '@/types/nodes'
import type { RecordValue } from '@/types/records'

function apiError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ nodeName: string }> },
) {
  const { nodeName } = await params

  const node = await nodeService.findBySlug(nodeName)
  if (!node) return apiError('NOT_FOUND', `No node with slug '${nodeName}' was found.`, 404)

  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  const allowed = await rolesService.canPerformByRole(apiAuth.roleId, node.id, 'read')
  if (!allowed) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  const { page, limit, sort, order, include } = parseQueryParams(req)

  const children = await nodesRepository.findChildren(node.id)
  const fields   = children.filter((n): n is FieldNode => n.type === 'field')

  const paginated = await recordsService.getPaginated(node.id, { page, limit, sort, order })

  const data = await Promise.all(
    paginated.records.map(async (r) => {
      if (include.length > 0) {
        const expanded = await expandRelations(r, fields, include)
        return flattenRecord(r, expanded)
      }
      return flattenRecord(r)
    }),
  )

  return Response.json(
    {
      data,
      meta: {
        total:      paginated.total,
        page:       paginated.page,
        limit:      paginated.limit,
        totalPages: Math.ceil(paginated.total / paginated.limit),
      },
    },
    { headers: corsHeaders() },
  )
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ nodeName: string }> },
) {
  const { nodeName } = await params

  const node = await nodeService.findBySlug(nodeName)
  if (!node) return apiError('NOT_FOUND', `No node with slug '${nodeName}' was found.`, 404)

  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  const allowed = await rolesService.canPerformByRole(apiAuth.roleId, node.id, 'create')
  if (!allowed) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  let body: Record<string, RecordValue>
  try {
    body = await req.json() as Record<string, RecordValue>
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400)
  }

  try {
    const record = await recordsService.create(node.id, { data: body })
    return Response.json(
      { data: flattenRecord(record) },
      { status: 201, headers: corsHeaders() },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error.'
    return apiError('VALIDATION_ERROR', msg, 422)
  }
}
