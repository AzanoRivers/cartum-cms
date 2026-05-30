import crypto from 'node:crypto'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { project } from '@/db/schema'
import { getDictionary } from '@/locales'
import { getTheme } from '@/lib/settings/get-setting'
import { projectInvitationsRepository } from '@/db/repositories/project-invitations.repository'
import { usersRepository } from '@/db/repositories/users.repository'
import { AcceptInviteCard } from '@/components/ui/organisms/AcceptInviteCard'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { SupportedLocale } from '@/types/project'

type Props = { params: Promise<{ token: string }> }

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const invite    = await projectInvitationsRepository.findByTokenHash(tokenHash)

  if (!invite) return notFound()

  const now      = new Date()
  const expired  = invite.expiresAt < now
  const consumed = !!invite.acceptedAt

  const [session, existingUser, [proj], theme] = await Promise.all([
    auth(),
    usersRepository.findByEmail(invite.invitedEmail),
    db.select({ name: project.name, locale: project.defaultLocale })
      .from(project)
      .where(eq(project.id, invite.projectId))
      .limit(1),
    getTheme(invite.projectId),
  ])

  const locale = (proj?.locale ?? 'en') as SupportedLocale
  const dict   = getDictionary(locale).auth.invite

  return (
    <main
      data-theme={theme}
      className="relative min-h-dvh flex items-center justify-center bg-bg px-4 py-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <VHSTransition duration="full" className="relative z-[1] w-full max-w-sm">
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
          dict={dict}
        />
      </VHSTransition>
    </main>
  )
}
