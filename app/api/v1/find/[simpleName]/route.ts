import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { fieldMeta, nodes } from '@/db/schema'
import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders, getParentSimpleName } from '@/lib/api/utils'
import { rolesService } from '@/lib/services/roles.service'
import { nodeNameToSlug, toSimpleName } from '@/nodes/api-generator'
import type { FieldType } from '@/types/nodes'

function apiError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

/**
 * GET /api/v1/find/:simpleName - looks up decks AND cards by simpleName
 * (case/space-insensitive: the path segment is normalized the same way the
 * column is). Not a unique key, so this always returns an array: a deck
 * and a card, or two siblings under different parents, can share one.
 *
 * A matched DECK returns only its own metadata (id, name, simpleName, slug,
 * parentId, updatedAt), never its cards/decks. Once you have its id, fetch
 * its content with GET /api/v1/table/{deckId}. A matched CARD returns its
 * full field metadata, same shape as GET /api/v1/card/{cardId}.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ simpleName: string }> },
) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('read')) return apiError('FORBIDDEN', 'Token scope does not allow read.', 403)

  const { simpleName: rawParam } = await params
  const simpleName = toSimpleName(decodeURIComponent(rawParam))

  const rows = await db
    .select()
    .from(nodes)
    .leftJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
    .where(and(eq(nodes.simpleName, simpleName), eq(nodes.projectId, apiAuth.projectId)))

  // Never 403 the whole lookup for one restricted match among several,
  // silently drop excluded/unreadable nodes, same as GET /api/v1/table.
  const data = (await Promise.all(rows.map(async (row) => {
    const n = row.nodes
    const permissionNodeId = n.type === 'container' ? n.id : n.parentId
    if (!permissionNodeId) return null
    if (apiAuth.excludedNodeIds.includes(permissionNodeId)) return null

    const allowed = await rolesService.canPerformByRole(apiAuth.roleId, permissionNodeId, 'read', apiAuth.projectId)
    if (!allowed) return null

    const parentSimpleName = await getParentSimpleName(n.parentId, apiAuth.projectId)

    if (n.type === 'container') {
      return {
        id:         n.id,
        name:       n.name,
        simpleName: n.simpleName,
        type:       'container' as const,
        slug:       n.slug ?? nodeNameToSlug(n.name),
        parentId:   n.parentId,
        parentSimpleName,
        updatedAt:  n.updatedAt,
      }
    }

    if (!row.field_meta) return null
    const m = row.field_meta
    return {
      id:               n.id,
      name:             n.name,
      simpleName:       n.simpleName,
      type:             'field' as const,
      parentId:         n.parentId,
      parentSimpleName,
      fieldType:        m.fieldType as FieldType,
      required:         m.isRequired,
      defaultValue:     m.defaultValue ?? null,
      relationTargetId: m.relationTargetId ?? null,
      updatedAt:        n.updatedAt,
    }
  }))).filter((r): r is NonNullable<typeof r> => r !== null)

  return Response.json({ data }, { headers: corsHeaders() })
}
