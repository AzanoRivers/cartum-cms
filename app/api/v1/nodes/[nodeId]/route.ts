import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { fieldMeta, nodes } from '@/db/schema'
import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders } from '@/lib/api/utils'
import { nodeNameToSlug } from '@/nodes/api-generator'
import type { FieldType } from '@/types/nodes'

function apiError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

/**
 * GET /api/v1/nodes/:nodeId
 * Returns metadata for a single node (container or field) by UUID.
 * Any valid API token can call this endpoint.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  const { nodeId } = await params

  const [row] = await db
    .select()
    .from(nodes)
    .where(eq(nodes.id, nodeId))
    .limit(1)

  if (!row) return apiError('NOT_FOUND', 'Node not found.', 404)

  if (row.type === 'container') {
    const slug = row.slug ?? nodeNameToSlug(row.name)

    const fieldRows = await db
      .select()
      .from(nodes)
      .innerJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
      .where(eq(nodes.parentId, nodeId))

    return Response.json({
      data: {
        id:        row.id,
        name:      row.name,
        type:      row.type,
        slug,
        parentId:  row.parentId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        fields: fieldRows.map((f) => ({
          id:           f.nodes.id,
          name:         f.nodes.name,
          type:         f.field_meta.fieldType as FieldType,
          required:     f.field_meta.isRequired,
          defaultValue: f.field_meta.defaultValue ?? null,
        })),
      },
    }, { headers: corsHeaders() })
  }

  // Field node — fetch its meta
  const [meta] = await db
    .select()
    .from(fieldMeta)
    .where(eq(fieldMeta.nodeId, nodeId))
    .limit(1)

  return Response.json({
    data: {
      id:           row.id,
      name:         row.name,
      type:         row.type,
      parentId:     row.parentId,
      fieldType:    meta?.fieldType as FieldType ?? null,
      required:     meta?.isRequired ?? false,
      defaultValue: meta?.defaultValue ?? null,
      createdAt:    row.createdAt,
      updatedAt:    row.updatedAt,
    },
  }, { headers: corsHeaders() })
}
