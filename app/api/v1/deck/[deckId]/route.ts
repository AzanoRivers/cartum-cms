import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { fieldMeta, nodes } from '@/db/schema'
import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders, getParentSimpleName, isUuid } from '@/lib/api/utils'
import { buildResolverContext } from '@/lib/services/node-schema-context'
import { resolveNodeSchema } from '@/lib/services/node-schema-resolver'
import { rolesService } from '@/lib/services/roles.service'
import { nodeNameToSlug } from '@/nodes/api-generator'
import type { FieldType } from '@/types/nodes'

function apiError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('read')) return apiError('FORBIDDEN', 'Token scope does not allow read.', 403)

  const { deckId } = await params
  if (!isUuid(deckId)) return apiError('NOT_FOUND', 'Deck not found.', 404)

  if (apiAuth.excludedNodeIds.includes(deckId)) {
    return apiError('FORBIDDEN', 'Access to this deck is excluded by token policy.', 403)
  }

  const [row] = await db
    .select()
    .from(nodes)
    .where(and(eq(nodes.id, deckId), eq(nodes.projectId, apiAuth.projectId)))
    .limit(1)

  if (!row) return apiError('NOT_FOUND', 'Deck not found.', 404)

  // Permissions are configured per deck - for a card, check its parent deck.
  const permissionNodeId = row.type === 'container' ? row.id : row.parentId
  if (!permissionNodeId) return apiError('NOT_FOUND', 'Deck not found.', 404)
  const allowed = await rolesService.canPerformByRole(apiAuth.roleId, permissionNodeId, 'read', apiAuth.projectId)
  if (!allowed) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)

  if (row.type === 'container') {
    const ctx = await buildResolverContext(apiAuth.projectId)
    const resolved = resolveNodeSchema(deckId, ctx)
    const slug = row.slug ?? nodeNameToSlug(row.name)
    const parentSimpleName = row.parentId
      ? (ctx.allNodes.find((n) => n.id === row.parentId)?.simpleName ?? null)
      : null

    return Response.json(
      {
        data: {
          id:         row.id,
          name:       row.name,
          simpleName: row.simpleName,
          type:       row.type,
          slug,
          parentId:   row.parentId,
          parentSimpleName,
          createdAt:  row.createdAt,
          updatedAt:  row.updatedAt,
          cards:      resolved.fields,
          decks:      resolved.containers,
        },
      },
      { headers: corsHeaders() },
    )
  }

  const [meta] = await db
    .select()
    .from(fieldMeta)
    .where(eq(fieldMeta.nodeId, deckId))
    .limit(1)

  const parentSimpleName = await getParentSimpleName(row.parentId, apiAuth.projectId)

  return Response.json(
    {
      data: {
        id:           row.id,
        name:         row.name,
        simpleName:   row.simpleName,
        type:         row.type,
        parentId:     row.parentId,
        parentSimpleName,
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
