import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { fieldMeta, nodes } from '@/db/schema'
import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders } from '@/lib/api/utils'
import { nodeService } from '@/lib/services/nodes.service'
import { rolesService } from '@/lib/services/roles.service'
import { nodesRepository } from '@/db/repositories/nodes.repository'
import { recordsRepository } from '@/db/repositories/records.repository'
import { mediaRepository } from '@/db/repositories/media.repository'
import { UpdateFieldMetaSchema } from '@/lib/actions/nodes.schemas'
import type { FieldType } from '@/types/nodes'

function apiError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('read')) return apiError('FORBIDDEN', 'Token scope does not allow read.', 403)

  const { cardId } = await params

  // Scoped to this token's project — a card ID from another project must 404,
  // never leak field metadata across projects.
  const [row] = await db
    .select()
    .from(nodes)
    .innerJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
    .where(and(eq(nodes.id, cardId), eq(nodes.type, 'field'), eq(nodes.projectId, apiAuth.projectId)))
    .limit(1)

  if (!row) return apiError('NOT_FOUND', 'Card not found.', 404)

  const parentId = row.nodes.parentId
  if (!parentId) return apiError('NOT_FOUND', 'Card not found.', 404)

  if (apiAuth.excludedNodeIds.includes(parentId)) {
    return apiError('FORBIDDEN', 'Access to this deck is excluded by token policy.', 403)
  }

  // Permissions are configured per deck (the card's parent container), not per card.
  const allowed = await rolesService.canPerformByRole(apiAuth.roleId, parentId, 'read', apiAuth.projectId)
  if (!allowed) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  return Response.json({
    data: {
      id:               row.nodes.id,
      name:             row.nodes.name,
      parentId:         row.nodes.parentId,
      fieldType:        row.field_meta.fieldType as FieldType,
      required:         row.field_meta.isRequired,
      defaultValue:     row.field_meta.defaultValue ?? null,
      relationTargetId: row.field_meta.relationTargetId ?? null,
      config:           row.field_meta.config ?? null,
      createdAt:        row.nodes.createdAt,
      updatedAt:        row.nodes.updatedAt,
    },
  }, { headers: corsHeaders() })
}

async function loadCard(cardId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(nodes)
    .innerJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
    .where(and(eq(nodes.id, cardId), eq(nodes.type, 'field'), eq(nodes.projectId, projectId)))
    .limit(1)
  return row ?? null
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('update')) return apiError('FORBIDDEN', 'Token scope does not allow update.', 403)

  const { cardId } = await params
  const existing = await loadCard(cardId, apiAuth.projectId)
  if (!existing) return apiError('NOT_FOUND', 'Card not found.', 404)

  const parentId = existing.nodes.parentId
  if (!parentId) return apiError('NOT_FOUND', 'Card not found.', 404)
  if (apiAuth.excludedNodeIds.includes(parentId)) {
    return apiError('FORBIDDEN', 'Access to this deck is excluded by token policy.', 403)
  }

  const schemaPerms = await rolesService.resolveSchemaPermissionsByRole(apiAuth.roleId, apiAuth.projectId)
  if (!schemaPerms.canUpdate) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body.', 400)
  }

  const parsed = UpdateFieldMetaSchema.safeParse({ ...body, nodeId: cardId })
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input.', 422)
  }

  try {
    const node = await nodeService.updateFieldMeta(cardId, parsed.data, apiAuth.projectId)
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
          updatedAt:        node.updatedAt,
        },
      },
      { headers: corsHeaders() },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error.'
    if (msg === 'FIELD_NOT_FOUND') return apiError('NOT_FOUND', 'Card not found.', 404)
    return apiError('VALIDATION_ERROR', msg, 422)
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('delete')) return apiError('FORBIDDEN', 'Token scope does not allow delete.', 403)

  const { cardId } = await params
  const existing = await loadCard(cardId, apiAuth.projectId)
  if (!existing) return apiError('NOT_FOUND', 'Card not found.', 404)

  const parentId = existing.nodes.parentId
  if (!parentId) return apiError('NOT_FOUND', 'Card not found.', 404)
  if (apiAuth.excludedNodeIds.includes(parentId)) {
    return apiError('FORBIDDEN', 'Access to this deck is excluded by token policy.', 403)
  }

  const schemaPerms = await rolesService.resolveSchemaPermissionsByRole(apiAuth.roleId, apiAuth.projectId)
  if (!schemaPerms.canDelete) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  try {
    // Media referenced by this field's values across sibling records would
    // otherwise become orphaned (records keep the stale key, files stay in
    // storage forever) — purge them, then strip the key from every record.
    const fieldType = existing.field_meta.fieldType as FieldType
    if (fieldType === 'image' || fieldType === 'video' || fieldType === 'gallery') {
      const siblingRecords = await recordsRepository.findByNodeId(parentId)
      const mediaIds = new Set<string>()
      for (const rec of siblingRecords) {
        const value = (rec.data as Record<string, unknown>)[existing.nodes.name]
        if (fieldType === 'gallery' && Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && typeof (item as { mediaId?: unknown }).mediaId === 'string') {
              mediaIds.add((item as { mediaId: string }).mediaId)
            }
          }
        } else if (typeof value === 'string' && value) {
          mediaIds.add(value)
        }
      }
      if (mediaIds.size > 0) await mediaRepository.purgeMany([...mediaIds], apiAuth.projectId)
    }

    await recordsRepository.clearFieldData(parentId, existing.nodes.name)
    await nodesRepository.delete(cardId, apiAuth.projectId)

    return new Response(null, { status: 204, headers: corsHeaders() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error.'
    return apiError('SERVER_ERROR', msg, 500)
  }
}
