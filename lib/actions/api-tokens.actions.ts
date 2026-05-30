'use server'

import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { generateToken, hashToken } from '@/lib/api/auth'
import { apiTokensRepository } from '@/db/repositories/api-tokens.repository'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { ACTIVE_PROJECT_COOKIE } from '@/lib/auth/constants'
import { ROLE_ADMIN } from '@/types/roles'
import type { ActionResult } from '@/types/actions'
import type { ApiToken, CreateApiTokenInput } from '@/types/api-tokens'

async function requireTokenAccess() {
  const session    = await auth()
  if (!session) throw new Error('UNAUTHORIZED')

  const cookieStore = await cookies()
  const projectId   = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? session.user.currentProjectId
  if (!projectId) throw new Error('NO_PROJECT_CONTEXT')

  const canAccess = session.user.isSuperAdmin
    || (session.user.roles ?? []).includes(ROLE_ADMIN)
    || await projectMembershipsRepository.isMemberWithRole(session.user.id, projectId, 'admin')
  if (!canAccess) throw new Error('FORBIDDEN')

  return { session, projectId }
}

export async function createApiToken(
  input: CreateApiTokenInput,
): Promise<ActionResult<{ token: string; meta: ApiToken }>> {
  try {
    const { projectId } = await requireTokenAccess()

    const rawToken  = generateToken()
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
    const { projectId } = await requireTokenAccess()
    const tokens = await apiTokensRepository.findByProject(projectId)
    return { success: true, data: tokens }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function revokeApiToken(tokenId: string): Promise<ActionResult<void>> {
  try {
    const { projectId } = await requireTokenAccess()
    await apiTokensRepository.revoke(tokenId, projectId)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}
