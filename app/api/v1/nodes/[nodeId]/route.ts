import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { fieldMeta, nodes } from '@/db/schema'
import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders } from '@/lib/api/utils'
import { buildResolverContext } from '@/lib/services/node-schema-context'
import { resolveNodeSchema } from '@/lib/services/node-schema-resolver'
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
 * Container nodes return fully resolved fields + containers (inherited schema).
 * Field nodes return their own metadata only (no inheritance).
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
    const ctx = await buildResolverContext()
    const resolved = resolveNodeSchema(nodeId, ctx)
    const slug = row.slug ?? nodeNameToSlug(row.name)

    return Response.json(
      {
        data: {
          id:         row.id,
          name:       row.name,
          type:       row.type,
          slug,
          parentId:   row.parentId,
          createdAt:  row.createdAt,
          updatedAt:  row.updatedAt,
          fields:     resolved.fields,
          containers: resolved.containers,
        },
      },
      { headers: corsHeaders() },
    )
  }

  // Field node — return own metadata only (fields have no inheritance)
  const [meta] = await db
    .select()
    .from(fieldMeta)
    .where(eq(fieldMeta.nodeId, nodeId))
    .limit(1)

  return Response.json(
    {
      data: {
        id:           row.id,
        name:         row.name,
        type:         row.type,
        parentId:     row.parentId,
        fieldType:    (meta?.fieldType as FieldType) ?? null,
        required:     meta?.isRequired ?? false,
        defaultValue: meta?.defaultValue ?? null,
        createdAt:    row.createdAt,
        updatedAt:    row.updatedAt,
      },
    },
    { headers: corsHeaders() },
  )
}
