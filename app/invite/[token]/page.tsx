import crypto from 'node:crypto'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { project } from '@/db/schema'
import { projectInvitationsRepository } from '@/db/repositories/project-invitations.repository'
import { usersRepository } from '@/db/repositories/users.repository'
import { AcceptInviteCard } from '@/components/ui/organisms/AcceptInviteCard'

type Props = { params: Promise<{ token: string }> }

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const invite    = await projectInvitationsRepository.findByTokenHash(tokenHash)

  if (!invite) return notFound()

  const now      = new Date()
  const expired  = invite.expiresAt < now
  const consumed = !!invite.acceptedAt

  const [session, existingUser, [proj]] = await Promise.all([
    auth(),
    usersRepository.findByEmail(invite.invitedEmail),
    db.select({ name: project.name })
      .from(project)
      .where(eq(project.id, invite.projectId))
      .limit(1),
  ])

  return (
    <AcceptInviteCard
      token={token}
      invite={{
        invitedEmail: invite.invitedEmail,
        projectName:  proj?.name ?? 'Unknown Project',
        roleName:     invite.roleName,
        expired,
        consumed,
      }}
      sessionEmail={session?.user?.email ?? null}
      existingUser={!!existingUser}
    />
  )
}
