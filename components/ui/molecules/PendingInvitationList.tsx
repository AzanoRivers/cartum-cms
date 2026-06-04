'use client'

import { useTransition } from 'react'
import { revokeInvitation, resendInvitation } from '@/lib/actions/invitations.actions'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { useToast } from '@/lib/hooks/useToast'
import { useState } from 'react'
import type { Dictionary } from '@/locales/en'

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
  d:         Dictionary['settings']['members']
  onRefresh: () => void
}

export function PendingInvitationList({ invites, d, onRefresh }: Props) {
  const [isPending, startTransition] = useTransition()
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)
  const toast = useToast()

  function handleRevoke() {
    if (!revokeTarget) return
    startTransition(async () => {
      const res = await revokeInvitation(revokeTarget)
      setRevokeTarget(null)
      if ('error' in res) toast.error(res.error)
      else { toast.success(d.revokeSuccess); onRefresh() }
    })
  }

  function handleResend(id: string) {
    startTransition(async () => {
      const res = await resendInvitation(id)
      if ('error' in res) toast.error(res.error)
      else toast.success(d.resendSuccess)
    })
  }

  if (!invites.length) {
    return <p className="font-mono text-xs text-muted py-4 text-center">{d.noPending}</p>
  }

  return (
    <>
      <div className="divide-y divide-border/60">
        {invites.map((inv) => (
          <div key={inv.id} className="flex flex-wrap items-center gap-2 py-3">
            <span className="flex-1 min-w-0 truncate font-mono text-xs text-muted">
              {inv.invitedEmail}
            </span>
            <span className="shrink-0 rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted">
              {d.builtInRoleLabels[inv.roleName as keyof typeof d.builtInRoleLabels] ?? inv.roleName}
            </span>
            <button
              onClick={() => handleResend(inv.id)}
              disabled={isPending}
              className="shrink-0 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              {d.resend}
            </button>
            <button
              onClick={() => setRevokeTarget(inv.id)}
              disabled={isPending}
              className="shrink-0 rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1 font-mono text-xs text-danger hover:bg-danger/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              {d.revoke}
            </button>
          </div>
        ))}
      </div>

      {revokeTarget && (
        <ConfirmDialog
          open
          title={d.revoke}
          description={d.revokeConfirm}
          confirmLabel={d.revoke}
          cancelLabel="Cancel"
          destructive
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </>
  )
}
