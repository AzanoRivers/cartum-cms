import { and, eq, isNull } from 'drizzle-orm'
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
 * GET /api/v1/schema
 * Returns all root container nodes with their fields.
 * Any valid API token can call this endpoint (no node-level permission required).
 */
export async function GET(req: Request) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)

  // All containers — needed both for root listing and slug resolution of relation targets
  const allContainers = await db
    .select()
    .from(nodes)
    .where(eq(nodes.type, 'container'))

  // Map id → slug for relation resolution
  const containerSlugMap = new Map(
    allContainers.map((n) => [n.id, n.slug ?? nodeNameToSlug(n.name)]),
  )

  const rootNodes = allContainers.filter((n) => n.parentId === null)

  // All field nodes with their meta — single query for all roots
  const allFields = await db
    .select()
    .from(nodes)
    .innerJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
    .where(eq(nodes.type, 'field'))

  // Group fields by their parent container id
  const fieldsByParent = new Map<string, typeof allFields>()
  for (const row of allFields) {
    const parentId = row.nodes.parentId
    if (!parentId) continue
    const group = fieldsByParent.get(parentId) ?? []
    group.push(row)
    fieldsByParent.set(parentId, group)
  }

  const schema = rootNodes.map((node) => {
    const slug = node.slug ?? nodeNameToSlug(node.name)

    const fields = (fieldsByParent.get(node.id) ?? []).map((row) => {
      const meta = row.field_meta
      const field: Record<string, unknown> = {
        name:     row.nodes.name,
        type:     meta.fieldType as FieldType,
        required: meta.isRequired,
      }

      if (meta.defaultValue !== null && meta.defaultValue !== undefined) {
        field.defaultValue = meta.defaultValue
      }

      // For relation fields, resolve the target node slug instead of exposing raw UUID
      if (meta.fieldType === 'relation' && meta.relationTargetId) {
        field.relatesTo = containerSlugMap.get(meta.relationTargetId) ?? null
      }

      return field
    })

    return {
      name:   node.name,
      slug,
      fields,
    }
  })

  return Response.json({ nodes: schema }, { headers: corsHeaders() })
}
