import { createHash, randomBytes } from 'crypto'
import { apiTokensRepository } from '@/db/repositories/api-tokens.repository'
import type { ApiAuth } from '@/types/api-tokens'

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function resolveApiAuth(req: Request): Promise<ApiAuth | null> {
  const raw = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!raw) return null

  const tokenHash = hashToken(raw)
  const token = await apiTokensRepository.findByHash(tokenHash)
  if (!token) return null
  if (token.revokedAt) return null
  if (token.expiresAt && token.expiresAt < new Date()) return null

  // Non-blocking last-used update — fire and forget
  void apiTokensRepository.updateLastUsed(token.id)

  return { roleId: token.roleId, tokenId: token.id }
}
