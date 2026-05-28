'use server'

import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { ACTIVE_PROJECT_COOKIE } from '@/lib/auth/constants'

/**
 * Returns the active projectId for the current request.
 * Cookie cartum-active-project is the authoritative source (survives JWT staleness).
 * Falls back to session.user.currentProjectId for first-login sessions where
 * the cookie hasn't been set yet.
 */
export async function requireProjectId(): Promise<string> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const cookieStore = await cookies()
  const id = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? session.user.currentProjectId
  if (!id) throw new Error('NO_PROJECT_CONTEXT')
  return id
}

/**
 * Verifies the calling user is a member of the given projectId.
 * Super admins bypass the membership check.
 */
export async function assertProjectAccess(projectId: string): Promise<void> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  if (session.user.isSuperAdmin) return
  const isMember = await projectMembershipsRepository.isMember(session.user.id, projectId)
  if (!isMember) throw new Error('FORBIDDEN')
}
