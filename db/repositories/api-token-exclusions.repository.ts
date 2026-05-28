import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { apiTokenExclusions } from '@/db/schema'

async function findByToken(tokenId: string): Promise<string[]> {
  const rows = await db
    .select({ nodeId: apiTokenExclusions.nodeId })
    .from(apiTokenExclusions)
    .where(eq(apiTokenExclusions.tokenId, tokenId))
  return rows.map((r) => r.nodeId)
}

async function setExclusions(tokenId: string, nodeIds: string[]): Promise<void> {
  await db.delete(apiTokenExclusions).where(eq(apiTokenExclusions.tokenId, tokenId))
  if (nodeIds.length === 0) return
  await db.insert(apiTokenExclusions).values(
    nodeIds.map((nodeId) => ({ tokenId, nodeId })),
  )
}

export const apiTokenExclusionsRepository = {
  findByToken,
  setExclusions,
}
