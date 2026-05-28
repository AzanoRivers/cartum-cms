import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { apiTokens } from '@/db/schema'
import { apiTokenExclusionsRepository } from '@/db/repositories/api-token-exclusions.repository'
import type { ApiToken, TokenScope } from '@/types/api-tokens'

type Row = typeof apiTokens.$inferSelect

async function mapRow(r: Row): Promise<ApiToken> {
  const excludedNodeIds = await apiTokenExclusionsRepository.findByToken(r.id)
  return {
    id:              r.id,
    name:            r.name,
    roleId:          r.roleId,
    projectId:       r.projectId,
    scope:           (r.scope as TokenScope[]) ?? ['read'],
    excludedNodeIds,
    createdAt:       r.createdAt,
    lastUsedAt:      r.lastUsedAt ?? null,
    expiresAt:       r.expiresAt ?? null,
    revokedAt:       r.revokedAt ?? null,
  }
}

async function findByHash(hash: string): Promise<(Row & { excludedNodeIds: string[] }) | null> {
  const rows = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, hash))
    .limit(1)
  if (!rows[0]) return null
  const row = rows[0]
  const excludedNodeIds = await apiTokenExclusionsRepository.findByToken(row.id)
  return { ...row, excludedNodeIds }
}

async function findByProject(projectId: string): Promise<ApiToken[]> {
  const rows = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.projectId, projectId))
    .orderBy(desc(apiTokens.createdAt))
  return Promise.all(rows.map(mapRow))
}

async function create(input: {
  name:            string
  tokenHash:       string
  roleId:          string
  projectId:       string
  scope:           TokenScope[]
  excludedNodeIds: string[]
  expiresAt?:      Date
}): Promise<ApiToken> {
  const [row] = await db
    .insert(apiTokens)
    .values({
      name:      input.name,
      tokenHash: input.tokenHash,
      roleId:    input.roleId,
      projectId: input.projectId,
      scope:     input.scope,
      expiresAt: input.expiresAt ?? null,
    })
    .returning()
  await apiTokenExclusionsRepository.setExclusions(row.id, input.excludedNodeIds)
  return mapRow(row)
}

async function revoke(id: string, projectId: string): Promise<void> {
  await db
    .delete(apiTokens)
    .where(and(eq(apiTokens.id, id), eq(apiTokens.projectId, projectId)))
}

async function updateLastUsed(id: string): Promise<void> {
  await db
    .update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, id))
}

export const apiTokensRepository = {
  findByHash,
  findByProject,
  create,
  revoke,
  updateLastUsed,
}
