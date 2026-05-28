'use server'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'

import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { updateSessionProject } from '@/lib/auth/session-utils'
import {
  createProjectService,
  getUserProjectsService,
} from '@/lib/services/project.service'

export async function createProject(formData: FormData): Promise<never> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')

  const name        = formData.get('name') as string
  const description = (formData.get('description') as string) ?? ''
  const locale      = (formData.get('locale') as string) ?? 'en'

  const { projectId } = await createProjectService({
    name,
    description,
    locale,
    creatorId: session.user.id,
  })

  await updateSessionProject(projectId)
  redirect('/cms/board')
}

/**
 * Switches the active project in the session.
 * Does NOT redirect — the caller (ProjectSelector) handles navigation
 * via window.location.href so we always get a hard reload that
 * guarantees the jwt() callback reads the switch cookie in a fresh
 * request context.
 */
export async function switchProject(projectId: string): Promise<void> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')

  if (!session.user.isSuperAdmin) {
    const isMember = await projectMembershipsRepository.isMember(session.user.id, projectId)
    if (!isMember) throw new Error('FORBIDDEN')
  }

  await updateSessionProject(projectId)
}

export async function getMyProjects() {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')

  return getUserProjectsService(session.user.id)
}

