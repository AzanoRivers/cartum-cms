'use server'

import { auth } from '@/auth'
import { generateToken, hashToken } from '@/lib/api/auth'
import { apiTokensRepository } from '@/db/repositories/api-tokens.repository'
import type { ActionResult } from '@/types/actions'
import type { ApiToken, CreateApiTokenInput } from '@/types/api-tokens'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user.isSuperAdmin) throw new Error('FORBIDDEN')
  return session
}

export async function createApiToken(
  input: CreateApiTokenInput,
): Promise<ActionResult<{ token: string; meta: ApiToken }>> {
  try {
    await requireSuperAdmin()

    const rawToken = generateToken()
    const tokenHash = hashToken(rawToken)

    const meta = await apiTokensRepository.create({
      name:      input.name,
      tokenHash,
      roleId:    input.roleId,
      expiresAt: input.expiresAt,
    })

    // Raw token is returned ONCE — only the hash is stored in DB
    return { success: true, data: { token: rawToken, meta } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function listApiTokens(): Promise<ActionResult<ApiToken[]>> {
  try {
    await requireSuperAdmin()
    const tokens = await apiTokensRepository.findAll()
    return { success: true, data: tokens }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function revokeApiToken(tokenId: string): Promise<ActionResult<void>> {
  try {
    await requireSuperAdmin()
    await apiTokensRepository.revoke(tokenId)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}
