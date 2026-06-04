'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { updateMemberRole, removeMember } from '@/lib/actions/invitations.actions'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { useToast } from '@/lib/hooks/useToast'
import type { Dictionary } from '@/locales/en'

export type MemberRow = {
  userId:       string
  email:        string
  roleId:       string
  roleName:     string
  joinedAt:     Date | null
  isSuperAdmin: boolean
}

type RoleOption = { id: string; name: string }

type Props = {
  members:       MemberRow[]
  roles:         RoleOption[]
  currentUserId: string
  ownerId?:      string | null
  d:             Dictionary['settings']['members']
  onRefresh:     () => void
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  admin:       'text-primary border-primary/40 bg-primary/10',
  editor:      'text-accent border-accent/40 bg-accent/10',
  viewer:      'text-muted border-border',
}

export function MemberList({ members, roles, currentUserId, ownerId, d, onRefresh }: Props) {
  const [openMenu, setOpenMenu]       = useState<string | null>(null)
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const toast = useToast()

  function handleRoleChange(userId: string, newRoleId: string) {
    startTransition(async () => {
      const res = await updateMemberRole(userId, newRoleId)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success(d.roleUpdated)
        onRefresh()
      }
    })
  }

  function handleRemoveConfirm() {
    if (!confirmUserId) return
    startTransition(async () => {
      const res = await removeMember(confirmUserId)
      setConfirmUserId(null)
      if ('error' in res) {
        toast.error(d.removeError)
      } else {
        toast.success(d.removeSuccess)
        onRefresh()
      }
    })
  }

  if (!members.length) {
    return <p className="font-mono text-xs text-muted py-4 text-center">{d.noMembers}</p>
  }

  return (
    <>
      <div className="divide-y divide-border/60">
        {members.map((m) => {
          const displayRole = m.isSuperAdmin ? 'super_admin' : m.roleName
          const badgeClass  = ROLE_COLORS[displayRole] ?? 'text-muted border-border'
          return (
            <div key={m.userId} className="flex items-center gap-3 py-3">
              {/* Avatar */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/40 font-mono text-[11px] text-primary">
                {m.email.slice(0, 2).toUpperCase()}
              </div>

              {/* Email */}
              <span className="flex-1 min-w-0 truncate font-mono text-xs text-text">
                {m.email}
                {m.userId === currentUserId && (
                  <span className="ml-1.5 text-muted">{d.youLabel}</span>
                )}
              </span>

              {/* Owner badge */}
              {ownerId && m.userId === ownerId && (
                <span className="shrink-0 rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 font-mono text-[9px] text-warning uppercase tracking-widest">
                  {d.ownerLabel}
                </span>
              )}

              {/* Role badge */}
              <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] ${badgeClass}`}>
                {displayRole}
              </span>

              {/* Context menu */}
              {m.userId !== currentUserId && !m.isSuperAdmin && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === m.userId ? null : m.userId)}
                    disabled={isPending}
                    className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <MoreHorizontal size={12} />
                  </button>
                  {openMenu === m.userId && (
                    <div className="absolute right-0 top-7 z-50 min-w-40 rounded-lg border border-border bg-surface shadow-xl py-1 overflow-hidden">
                      <div className="px-3 py-1.5 space-y-1">
                        <p className="font-mono text-[10px] text-muted uppercase tracking-wide mb-1">{d.changeRole}</p>
                        {roles.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => { setOpenMenu(null); handleRoleChange(m.userId, r.id) }}
                            className={`w-full text-left px-2 py-1 rounded font-mono text-xs transition-colors ${
                              r.id === m.roleId
                                ? 'bg-primary/20 text-primary'
                                : 'text-muted hover:text-text hover:bg-surface-2'
                            }`}
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                      <div className="h-px bg-border/60 my-1" />
                      <button
                        onClick={() => { setOpenMenu(null); setConfirmUserId(m.userId) }}
                        className="w-full px-3 py-2 text-left font-mono text-xs text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                      >
                        {d.removeButton}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Remove confirm — VHS, no overlay */}
      {confirmUserId && (
        <ConfirmDialog
          open
          title={d.removeConfirmTitle}
          description={d.removeConfirmDesc}
          confirmLabel={d.removeButton}
          cancelLabel="Cancel"
          destructive
          onConfirm={handleRemoveConfirm}
          onCancel={() => setConfirmUserId(null)}
        />
      )}
    </>
  )
}
