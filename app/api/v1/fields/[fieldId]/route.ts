import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { fieldMeta, nodes } from '@/db/schema'
import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders } from '@/lib/api/utils'
import type { FieldType } from '@/types/nodes'

function apiError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

/**
 * GET /api/v1/fields/:fieldId
 * Returns metadata for a single field node by UUID.
 * Any valid API token can call this endpoint.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ fieldId: string }> },
) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  const { fieldId } = await params

  const [row] = await db
    .select()
    .from(nodes)
    .innerJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
    .where(and(eq(nodes.id, fieldId), eq(nodes.type, 'field')))
    .limit(1)

  if (!row) return apiError('NOT_FOUND', 'Field not found.', 404)

  return Response.json({
    data: {
      id:           row.nodes.id,
      name:         row.nodes.name,
      parentId:     row.nodes.parentId,
      fieldType:    row.field_meta.fieldType as FieldType,
      required:     row.field_meta.isRequired,
      defaultValue: row.field_meta.defaultValue ?? null,
      relationTargetId: row.field_meta.relationTargetId ?? null,
      config:       row.field_meta.config ?? null,
      createdAt:    row.nodes.createdAt,
      updatedAt:    row.nodes.updatedAt,
    },
  }, { headers: corsHeaders() })
}
