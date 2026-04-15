import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { apiTokens } from '@/db/schema'
import type { ApiToken } from '@/types/api-tokens'

type Row = typeof apiTokens.$inferSelect

function mapRow(r: Row): ApiToken {
  return {
    id:         r.id,
    name:       r.name,
    roleId:     r.roleId,
    createdAt:  r.createdAt,
    lastUsedAt: r.lastUsedAt ?? null,
    expiresAt:  r.expiresAt ?? null,
    revokedAt:  r.revokedAt ?? null,
  }
}

async function findByHash(hash: string): Promise<Row | null> {
  const rows = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, hash))
    .limit(1)
  return rows[0] ?? null
}

async function findAll(): Promise<ApiToken[]> {
  const rows = await db
    .select()
    .from(apiTokens)
    .orderBy(desc(apiTokens.createdAt))
  return rows.map(mapRow)
}

async function create(input: {
  name:       string
  tokenHash:  string
  roleId:     string
  expiresAt?: Date
}): Promise<ApiToken> {
  const [row] = await db
    .insert(apiTokens)
    .values({
      name:      input.name,
      tokenHash: input.tokenHash,
      roleId:    input.roleId,
      expiresAt: input.expiresAt ?? null,
    })
    .returning()
  return mapRow(row)
}

async function revoke(id: string): Promise<void> {
  await db
    .delete(apiTokens)
    .where(eq(apiTokens.id, id))
}

async function updateLastUsed(id: string): Promise<void> {
  await db
    .update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, id))
}

export const apiTokensRepository = {
  findByHash,
  findAll,
  create,
  revoke,
  updateLastUsed,
}
