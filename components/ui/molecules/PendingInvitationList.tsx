'use client'

import { useTransition } from 'react'
import { revokeInvitation, resendInvitation } from '@/lib/actions/invitations.actions'
import { useToast } from '@/lib/hooks/useToast'

export type PendingInviteRow = {
  id:           string
  invitedEmail: string
  roleId:       string
  roleName:     string
  expiresAt:    Date
  createdAt:    Date
}

type Props = {
  invites:   PendingInviteRow[]
  onRefresh: () => void
}

export function PendingInvitationList({ invites, onRefresh }: Props) {
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  function handleRevoke(id: string) {
    if (!confirm('Revoke this invitation?')) return
    startTransition(async () => {
      const res = await revokeInvitation(id)
      if ('error' in res) toast.error(res.error)
      else { toast.success('Invitation revoked.'); onRefresh() }
    })
  }

  function handleResend(id: string) {
    startTransition(async () => {
      const res = await resendInvitation(id)
      if ('error' in res) toast.error(res.error)
      else toast.success('Invitation resent.')
    })
  }

  if (!invites.length) {
    return <p className="font-mono text-xs text-muted py-4 text-center">No pending invitations.</p>
  }

  return (
    <div className="divide-y divide-border/60">
      {invites.map((inv) => (
        <div key={inv.id} className="flex items-center gap-3 py-3">
          <span className="text-muted shrink-0 text-base">📨</span>
          <span className="flex-1 min-w-0 truncate font-mono text-xs text-muted">
            {inv.invitedEmail}
          </span>
          <span className="shrink-0 rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted">
            {inv.roleName}
          </span>
          <button
            onClick={() => handleResend(inv.id)}
            disabled={isPending}
            className="shrink-0 font-mono text-xs text-primary hover:underline cursor-pointer disabled:opacity-50"
          >
            Resend
          </button>
          <button
            onClick={() => handleRevoke(inv.id)}
            disabled={isPending}
            className="shrink-0 font-mono text-xs text-danger hover:underline cursor-pointer disabled:opacity-50"
          >
            Revoke
          </button>
        </div>
      ))}
    </div>
  )
}
