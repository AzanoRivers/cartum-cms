'use server'

import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { signIn } from '@/auth'
import { auth } from '@/auth'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { project } from '@/db/schema'
import { invitationsService } from '@/lib/services/invitations.service'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { projectInvitationsRepository } from '@/db/repositories/project-invitations.repository'
import { usersRepository } from '@/db/repositories/users.repository'
import { hashPassword } from '@/lib/services/auth.service'
import { requireProjectId, assertProjectAccess } from '@/lib/auth/get-project-id'
import { updateSessionProject } from '@/lib/auth/session-utils'
import { InviteSchema, RegisterAndAcceptSchema } from './invitations.schemas'

// ── Helpers ───────────────────────────────────────────────────────────────────

function tokenHash(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// ── Data fetching ─────────────────────────────────────────────────────────────

export async function getMembersForProject() {
  const projectId = await requireProjectId()
  return projectMembershipsRepository.listMembers(projectId)
}

export async function getPendingInvitations() {
  const projectId = await requireProjectId()
  return projectInvitationsRepository.listPending(projectId)
}

export async function listRolesForInvite() {
  const { roles } = await import('@/db/schema')
  return db.select({ id: roles.id, name: roles.name }).from(roles)
}

export async function getMyAdminProjects() {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')

  if (session.user.isSuperAdmin) {
    return db
      .select({ id: project.id, name: project.name })
      .from(project)
      .orderBy(project.name)
  }

  const ids = await projectMembershipsRepository.listAdminProjectIds(session.user.id)
  if (!ids.length) return []

  return db
    .select({ id: project.id, name: project.name })
    .from(project)
    .where(inArray(project.id, ids))
    .orderBy(project.name)
}

// ── Invite ────────────────────────────────────────────────────────────────────

export async function sendInvitation(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')

  const parsed = InviteSchema.safeParse({
    email:     formData.get('email'),
    roleId:    formData.get('roleId'),
    projectId: formData.get('projectId'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const { email, roleId, projectId } = parsed.data

  await assertProjectAccess(projectId)

  const isAdmin = await projectMembershipsRepository.isMemberWithRole(
    session.user.id, projectId, 'admin',
  )
  if (!isAdmin && !session.user.isSuperAdmin) return { error: 'Only project admins can send invitations.' }

  try {
    await invitationsService.sendInvite({
      projectId,
      invitedEmail: email.toLowerCase().trim(),
      roleId,
      invitedBy: session.user.id,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'USER_ALREADY_MEMBER') return { error: 'This user is already a member of this project.' }
    if (msg === 'EMAIL_NOT_CONFIGURED') return { error: 'Email is not configured. Set up Resend in Settings → Sending.' }
    throw err
  }

  revalidatePath('/cms/settings')
  return { success: true }
}

// ── Revoke / resend ───────────────────────────────────────────────────────────

export async function revokeInvitation(
  invitationId: string,
): Promise<{ success: true } | { error: string }> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const projectId = await requireProjectId()
  await assertProjectAccess(projectId)
  await invitationsService.revokeInvite(invitationId, projectId)
  revalidatePath('/cms/settings')
  return { success: true }
}

export async function resendInvitation(
  invitationId: string,
): Promise<{ success: true } | { error: string }> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const projectId = await requireProjectId()
  await assertProjectAccess(projectId)
  try {
    await invitationsService.resendInvite(invitationId, projectId)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'EMAIL_NOT_CONFIGURED') return { error: 'Email is not configured.' }
    throw err
  }
  revalidatePath('/cms/settings')
  return { success: true }
}

// ── Member management ─────────────────────────────────────────────────────────

export async function updateMemberRole(
  userId: string, newRoleId: string,
): Promise<{ success: true } | { error: string }> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const projectId = await requireProjectId()
  await assertProjectAccess(projectId)
  await projectMembershipsRepository.addMember(userId, projectId, newRoleId)
  revalidatePath('/cms/settings')
  return { success: true }
}

export async function removeMember(
  userId: string,
): Promise<{ success: true } | { error: string }> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
  const projectId = await requireProjectId()
  await assertProjectAccess(projectId)

  const admins = await projectMembershipsRepository.getMembersByRole(projectId, 'admin')
  if (admins.some((a) => a.userId === userId) && admins.length === 1) {
    return { error: 'Cannot remove the only project admin.' }
  }

  await projectMembershipsRepository.removeMember(userId, projectId)
  revalidatePath('/cms/settings')
  return { success: true }
}

// ── Accept invitation flows ───────────────────────────────────────────────────

/** Case A — user is logged in and their email matches the invite */
export async function acceptAndJoin(token: string): Promise<never> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')

  const { projectId } = await invitationsService.acceptInvite(token)
  await updateSessionProject(projectId)
  redirect('/cms/board')
}

/** Case C — user is NOT logged in, email exists in DB; sign in then accept */
export async function signInAndAccept(
  token: string,
  password: string,
): Promise<{ error: string } | never> {
  const hash   = tokenHash(token)
  const invite = await projectInvitationsRepository.findByTokenHash(hash)

  if (!invite)                      return { error: 'Invalid invitation link.' }
  if (invite.acceptedAt)            return { error: 'This invitation has already been used.' }
  if (invite.expiresAt < new Date()) return { error: 'This invitation has expired.' }

  try {
    await signIn('credentials', {
      email:    invite.invitedEmail,
      password,
      redirect: false,
    })
  } catch {
    return { error: 'Incorrect password. Please try again.' }
  }

  const { projectId } = await invitationsService.acceptInvite(token)
  await updateSessionProject(projectId)
  redirect('/cms/board')
}

/** Case D — user is NOT logged in, email is new; create account then accept */
export async function registerAndAccept(
  _prev: unknown,
  formData: FormData,
): Promise<{ error: string } | never> {
  const parsed = RegisterAndAcceptSchema.safeParse({
    token:    formData.get('token'),
    name:     formData.get('name'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  const { token, password } = parsed.data

  const hash   = tokenHash(token)
  const invite = await projectInvitationsRepository.findByTokenHash(hash)

  if (!invite)                       return { error: 'Invalid invitation link.' }
  if (invite.acceptedAt)             return { error: 'This invitation has already been used.' }
  if (invite.expiresAt < new Date()) return { error: 'This invitation has expired.' }

  const existing = await usersRepository.findByEmail(invite.invitedEmail)
  if (existing) return { error: 'An account already exists for this email. Please sign in.' }

  const passwordHash = await hashPassword(password)
  await usersRepository.create({
    email:        invite.invitedEmail,
    passwordHash,
    isSuperAdmin: false,
  })

  const { projectId } = await invitationsService.acceptInvite(token, { password })
  await signIn('credentials', { email: invite.invitedEmail, password, redirect: false })
  await updateSessionProject(projectId)
  redirect('/cms/board')
}
