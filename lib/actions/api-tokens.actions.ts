'use server'

import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { generateToken, hashToken } from '@/lib/api/auth'
import { apiTokensRepository } from '@/db/repositories/api-tokens.repository'
import type { ActionResult } from '@/types/actions'
import type { ApiToken, CreateApiTokenInput } from '@/types/api-tokens'
import { ACTIVE_PROJECT_COOKIE } from '@/lib/auth/constants'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user.isSuperAdmin) throw new Error('FORBIDDEN')
  return session
}

export async function createApiToken(
  input: CreateApiTokenInput,
): Promise<ActionResult<{ token: string; meta: ApiToken }>> {
  try {
    const session    = await requireSuperAdmin()
    const cookieStore = await cookies()
    const projectId  = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? session.user.currentProjectId
    if (!projectId) throw new Error('NO_PROJECT_CONTEXT')

    const rawToken = generateToken()
    const tokenHash = hashToken(rawToken)

    const meta = await apiTokensRepository.create({
      name:            input.name,
      tokenHash,
      roleId:          input.roleId,
      projectId,
      scope:           input.scope,
      excludedNodeIds: input.excludedNodeIds,
      expiresAt:       input.expiresAt,
    })

    return { success: true, data: { token: rawToken, meta } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function listApiTokens(): Promise<ActionResult<ApiToken[]>> {
  try {
    const session    = await requireSuperAdmin()
    const cookieStore = await cookies()
    const projectId  = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? session.user.currentProjectId
    if (!projectId) throw new Error('NO_PROJECT_CONTEXT')
    const tokens = await apiTokensRepository.findByProject(projectId)
    return { success: true, data: tokens }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function revokeApiToken(tokenId: string): Promise<ActionResult<void>> {
  try {
    const session    = await requireSuperAdmin()
    const cookieStore = await cookies()
    const projectId  = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? session.user.currentProjectId
    if (!projectId) throw new Error('NO_PROJECT_CONTEXT')
    await apiTokensRepository.revoke(tokenId, projectId)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}
