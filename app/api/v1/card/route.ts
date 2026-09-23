import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { fieldMeta, nodes } from '@/db/schema'
import { resolveApiAuth } from '@/lib/api/auth'
import { corsHeaders, getParentSimpleName, isUuid, matchesNameQuery } from '@/lib/api/utils'
import { nodeService } from '@/lib/services/nodes.service'
import { rolesService } from '@/lib/services/roles.service'
import { CreateFieldSchema } from '@/lib/actions/nodes.schemas'
import type { FieldType } from '@/types/nodes'

function apiError(error: string, message: string, status: number) {
  return Response.json({ error, message }, { status, headers: corsHeaders() })
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

/**
 * GET /api/v1/card?search=&strict=&deckId= - searches cards project-wide,
 * or scoped to one deck's own cards with ?deckId=. Same search semantics as
 * GET /api/v1/table: substring on name/simpleName by default, exact
 * simpleName match with &strict=true.
 */
export async function GET(req: Request) {
  const apiAuth = await resolveApiAuth(req)
  if (!apiAuth) return apiError('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401)
  if (!apiAuth.scope.includes('read')) return apiError('FORBIDDEN', 'Token scope does not allow read.', 403)

  const url    = new URL(req.url)
  const search = url.searchParams.get('search') ?? ''
  const strict = url.searchParams.get('strict') === 'true'
  const deckId = url.searchParams.get('deckId')

  let scopedDeckSimpleName: string | null = null
  if (deckId) {
    if (!isUuid(deckId)) return apiError('NOT_FOUND', 'Deck not found.', 404)
    if (apiAuth.excludedNodeIds.includes(deckId)) {
      return apiError('FORBIDDEN', 'Access to this deck is excluded by token policy.', 403)
    }
    const allowed = await rolesService.canPerformByRole(apiAuth.roleId, deckId, 'read', apiAuth.projectId)
    if (!allowed) return apiError('FORBIDDEN', 'Insufficient permissions.', 403)
    scopedDeckSimpleName = await getParentSimpleName(deckId, apiAuth.projectId)
  }

  const rows = await db
    .select()
    .from(nodes)
    .innerJoin(fieldMeta, eq(fieldMeta.nodeId, nodes.id))
    .where(and(
      eq(nodes.type, 'field'),
      eq(nodes.projectId, apiAuth.projectId),
      ...(deckId ? [eq(nodes.parentId, deckId)] : []),
    ))

  // Never 403 the whole search for one restricted card among many.
  const data = (await Promise.all(rows.map(async (row) => {
    const n = row.nodes
    if (!matchesNameQuery(n.name, n.simpleName, search, strict)) return null
    if (!n.parentId) return null

    // Already checked once above when deckId is given, skip the repeat lookup.
    if (!deckId) {
      if (apiAuth.excludedNodeIds.includes(n.parentId)) return null
      const allowed = await rolesService.canPerformByRole(apiAuth.roleId, n.parentId, 'read', apiAuth.projectId)
      if (!allowed) return null
    }

    const m = row.field_meta
    return {
      id:               n.id,
      name:             n.name,
      simpleName:       n.simpleName,
      parentId:         n.parentId,
      parentSimpleName: deckId ? scopedDeckSimpleName : await getParentSimpleName(n.parentId, apiAuth.projectId),
      fieldType:        m.fieldType as FieldType,
      required:         m.isRequired,
      defaultValue:     m.defaultValue ?? null,
      relationTargetId: m.relationTargetId ?? null,
      updatedAt:        n.updatedAt,
    }
  }))).filter((r): r is NonNullable<typeof r> => r !== null)

  return Response.json({ data }, { headers: corsHeaders() })
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
    const parentSimpleName = await getParentSimpleName(node.parentId, apiAuth.projectId)
    return Response.json(
      {
        data: {
          id:               node.id,
          name:             node.name,
          simpleName:       node.simpleName,
          parentId:         node.parentId,
          parentSimpleName,
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
