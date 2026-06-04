import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { project } from '@/db/schema'
import { projectInvitationsRepository } from '@/db/repositories/project-invitations.repository'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { usersRepository } from '@/db/repositories/users.repository'
import { hashPassword } from '@/lib/services/auth.service'
import { sendInvitationEmail } from '@/lib/email/templates/invitation'
import type { SupportedLocale } from '@/types/project'

const INVITE_EXPIRY_DAYS = 7

export const invitationsService = {

  async sendInvite({
    projectId,
    invitedEmail,
    roleId,
    invitedBy,
  }: {
    projectId:    string
    invitedEmail: string
    roleId:       string
    invitedBy:    string
  }): Promise<void> {
    const existingMember = await projectMembershipsRepository.findByEmail(projectId, invitedEmail)
    if (existingMember) throw new Error('USER_ALREADY_MEMBER')

    const rawToken  = crypto.randomBytes(32).toString('base64url')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86_400_000)

    await projectInvitationsRepository.upsert({
      projectId,
      invitedEmail,
      roleId,
      invitedBy,
      tokenHash,
      expiresAt,
    })

    const [proj] = await db
      .select({ name: project.name, locale: project.defaultLocale })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)

    const baseUrl = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')

    await sendInvitationEmail({
      to:          invitedEmail,
      projectName: proj?.name ?? 'a project',
      inviteUrl:   `${baseUrl}/invite/${rawToken}`,
      expiryDays:  INVITE_EXPIRY_DAYS,
      locale:      (proj?.locale ?? 'en') as SupportedLocale,
      baseUrl,
      projectId,
    })
  },

  async acceptInvite(
    rawToken:  string,
    newUser?: { password: string },
  ): Promise<{ projectId: string }> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const invite    = await projectInvitationsRepository.findByTokenHash(tokenHash)

    if (!invite)                      throw new Error('INVITE_NOT_FOUND')
    if (invite.acceptedAt)            throw new Error('INVITE_ALREADY_USED')
    if (invite.expiresAt < new Date()) throw new Error('INVITE_EXPIRED')

    let userId: string
    const existing = await usersRepository.findByEmail(invite.invitedEmail)

    if (existing) {
      userId = existing.id
    } else {
      if (!newUser) throw new Error('REGISTRATION_REQUIRED')
      const passwordHash = await hashPassword(newUser.password)
      const created = await usersRepository.create({
        email:        invite.invitedEmail,
        passwordHash,
        isSuperAdmin: false,
      })
      userId = created.id
    }

    await projectMembershipsRepository.addMember(userId, invite.projectId, invite.roleId)
    await projectInvitationsRepository.markAccepted(invite.id)

    return { projectId: invite.projectId }
  },

  async revokeInvite(invitationId: string, projectId: string): Promise<void> {
    await projectInvitationsRepository.delete(invitationId, projectId)
  },

  async resendInvite(invitationId: string, projectId: string): Promise<void> {
    const invite = await projectInvitationsRepository.findById(invitationId, projectId)
    if (!invite || invite.acceptedAt) throw new Error('INVITE_NOT_RESENDABLE')

    const rawToken  = crypto.randomBytes(32).toString('base64url')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86_400_000)

    await projectInvitationsRepository.refreshToken(invitationId, tokenHash, expiresAt)

    const [proj] = await db
      .select({ name: project.name, locale: project.defaultLocale })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)

    const baseUrl = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')

    await sendInvitationEmail({
      to:          invite.invitedEmail,
      projectName: proj?.name ?? 'a project',
      inviteUrl:   `${baseUrl}/invite/${rawToken}`,
      expiryDays:  INVITE_EXPIRY_DAYS,
      locale:      (proj?.locale ?? 'en') as SupportedLocale,
      baseUrl,
    })
  },
}
