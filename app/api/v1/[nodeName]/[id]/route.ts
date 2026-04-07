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
  { params }: { params: Promise<{ nodeName: string; id: string }> },
) {
  const { nodeName, id } = await params

  const node = await nodeService.findBySlug(nodeName)
  if (!node) return apiError('NOT_FOUND', `No node with slug '${nodeName}' was found.`, 404)

  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  const allowed = await rolesService.canPerformByRole(apiAuth.roleId, node.id, 'read')
  if (!allowed) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  const record = await recordsService.getById(node.id, id)
  if (!record) return apiError('NOT_FOUND', `Record '${id}' not found.`, 404)

  const { include } = parseQueryParams(req)
  let responseData: Record<string, unknown>

  if (include.length > 0) {
    const children = await nodesRepository.findChildren(node.id)
    const fields   = children.filter((n): n is FieldNode => n.type === 'field')
    const expanded = await expandRelations(record, fields, include)
    responseData   = flattenRecord(record, expanded)
  } else {
    responseData = flattenRecord(record)
  }

  return Response.json({ data: responseData }, { headers: corsHeaders() })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ nodeName: string; id: string }> },
) {
  const { nodeName, id } = await params

  const node = await nodeService.findBySlug(nodeName)
  if (!node) return apiError('NOT_FOUND', `No node with slug '${nodeName}' was found.`, 404)

  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  const allowed = await rolesService.canPerformByRole(apiAuth.roleId, node.id, 'update')
  if (!allowed) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  let body: Record<string, RecordValue>
  try {
    body = await req.json() as Record<string, RecordValue>
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400)
  }

  try {
    const record = await recordsService.update(node.id, id, { data: body })
    return Response.json({ data: flattenRecord(record) }, { headers: corsHeaders() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error.'
    if (msg === 'RECORD_NOT_FOUND') return apiError('NOT_FOUND', `Record '${id}' not found.`, 404)
    return apiError('VALIDATION_ERROR', msg, 422)
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ nodeName: string; id: string }> },
) {
  const { nodeName, id } = await params

  const node = await nodeService.findBySlug(nodeName)
  if (!node) return apiError('NOT_FOUND', `No node with slug '${nodeName}' was found.`, 404)

  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  const allowed = await rolesService.canPerformByRole(apiAuth.roleId, node.id, 'update')
  if (!allowed) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  const existing = await recordsService.getById(node.id, id)
  if (!existing) return apiError('NOT_FOUND', `Record '${id}' not found.`, 404)

  let patch: Record<string, RecordValue>
  try {
    patch = await req.json() as Record<string, RecordValue>
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400)
  }

  // PATCH: merge with existing data (partial update)
  const merged = { ...existing.data, ...patch }

  try {
    const record = await recordsService.update(node.id, id, { data: merged })
    return Response.json({ data: flattenRecord(record) }, { headers: corsHeaders() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error.'
    return apiError('VALIDATION_ERROR', msg, 422)
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ nodeName: string; id: string }> },
) {
  const { nodeName, id } = await params

  const node = await nodeService.findBySlug(nodeName)
  if (!node) return apiError('NOT_FOUND', `No node with slug '${nodeName}' was found.`, 404)

  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  const allowed = await rolesService.canPerformByRole(apiAuth.roleId, node.id, 'delete')
  if (!allowed) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  try {
    await recordsService.delete(node.id, id)
    return new Response(null, { status: 204, headers: corsHeaders() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error.'
    if (msg === 'RECORD_NOT_FOUND') return apiError('NOT_FOUND', `Record '${id}' not found.`, 404)
    return apiError('SERVER_ERROR', msg, 500)
  }
}
