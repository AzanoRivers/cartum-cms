'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  listUsers,
  inviteUser,
  updateUserRole,
  removeUser,
  listRolesWithCount,
  type UserWithRole,
} from '@/lib/actions/settings.actions'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { useToast } from '@/lib/hooks/useToast'
import type { Dictionary } from '@/locales/en'

export type UsersSectionProps = {
  currentUserId: string
  isSuperAdmin: boolean
  d: Dictionary['settings']['users']
}

type TempPasswordModal = { email: string; password: string; copied: boolean } | null

export function UsersSection({ currentUserId, isSuperAdmin, d }: UsersSectionProps) {
  const [userList, setUserList]       = useState<UserWithRole[]>([])
  const [roleOptions, setRoleOptions] = useState<Array<{ id: string; name: string }>>([])
  const [loaded, setLoaded]           = useState(false)
  const [tempModal, setTempModal]     = useState<TempPasswordModal>(null)
  const [removeTarget, setRemoveTarget] = useState<UserWithRole | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')

  const [isInviting, startInvite]     = useTransition()
  const [updatingId, setUpdatingId]   = useState<string | null>(null)
  const [removingId, setRemovingId]   = useState<string | null>(null)

  const toast = useToast()

  useEffect(() => {
    Promise.all([listUsers(), listRolesWithCount()]).then(([usRes, rolesRes]) => {
      if (usRes.success) setUserList(usRes.data)
      if (rolesRes.success) {
        setRoleOptions(rolesRes.data.map((r) => ({ id: r.id, name: r.name })))
        if (rolesRes.data.length > 0) setInviteRoleId(rolesRes.data[0].id)
      }
      setLoaded(true)
    })
  }, [])

  function handleInvite() {
    if (!inviteEmail.trim() || !inviteRoleId) return
    startInvite(async () => {
      const res = await inviteUser({ email: inviteEmail.trim(), roleId: inviteRoleId })
      if (res.success) {
        toast.success(d.inviteSuccess)
        setInviteEmail('')
        // Refresh user list
        listUsers().then((r) => { if (r.success) setUserList(r.data) })
        if (res.data.tempPassword) {
          setTempModal({ email: inviteEmail.trim(), password: res.data.tempPassword, copied: false })
        }
      } else {
        toast.error(d.inviteError)
      }
    })
  }

  async function handleRoleChange(userId: string, roleId: string) {
    setUpdatingId(userId)
    const res = await updateUserRole(userId, roleId)
    setUpdatingId(null)
    if (res.success) {
      setUserList((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u
          const role = roleOptions.find((r) => r.id === roleId)
          return { ...u, roleId, roleName: role?.name ?? null }
        }),
      )
      toast.success(d.roleChanged)
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return
    setRemovingId(removeTarget.id)
    const res = await removeUser(removeTarget.id)
    setRemovingId(null)
    setRemoveTarget(null)
    if (res.success) {
      setUserList((prev) => prev.filter((u) => u.id !== removeTarget.id))
      toast.success(d.removeSuccess)
    }
  }

  if (!loaded) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="font-mono text-xs text-muted animate-pulse">Loading…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>

      {/* Invite form */}
      <div className="rounded-md border border-border/60 bg-surface-2/40 p-4 space-y-2">
        <p className="font-mono text-xs text-muted uppercase tracking-wider">{d.inviteTitle}</p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={d.emailPlaceholder}
            className="flex-1 min-w-40 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
          <select
            value={inviteRoleId}
            onChange={(e) => setInviteRoleId(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm text-text outline-none focus:border-primary/60 transition-colors cursor-pointer"
          >
            {roleOptions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            onClick={handleInvite}
            disabled={isInviting || !inviteEmail.trim() || !inviteRoleId}
            className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isInviting ? d.inviting : d.inviteButton}
          </button>
        </div>
      </div>

      {/* User list */}
      {userList.length === 0 ? (
        <p className="font-mono text-xs text-muted/50">{d.empty}</p>
      ) : (
        <div className="space-y-1">
          {userList.map((user) => {
            const isYou = user.id === currentUserId
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-md border border-border/50 bg-surface-2/30 px-3 py-2 hover:bg-surface-2/60 transition-colors"
              >
                {/* Avatar */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-mono text-[10px] text-muted uppercase">
                  {user.email.slice(0, 2)}
                </div>

                {/* Email */}
                <span className="flex-1 truncate font-mono text-xs text-text">
                  {user.email}
                  {isYou && (
                    <span className="ml-1.5 text-muted/50">{d.youLabel}</span>
                  )}
                </span>

                {/* Role dropdown — disabled for self or super_admin */}
                {isSuperAdmin && !user.isSuperAdmin ? (
                  <select
                    value={user.roleId ?? ''}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={updatingId === user.id}
                    className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-text outline-none focus:border-primary/60 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {roleOptions.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="font-mono text-xs text-muted">
                    {user.roleName ?? (user.isSuperAdmin ? 'super_admin' : '—')}
                  </span>
                )}

                {/* Remove — super_admin only, not self */}
                {isSuperAdmin && !isYou && !user.isSuperAdmin && (
                  <button
                    onClick={() => setRemoveTarget(user)}
                    disabled={removingId === user.id}
                    className="font-mono text-xs text-danger/60 hover:text-danger transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {removingId === user.id ? d.removing : d.removeButton}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Remove confirmation */}
      {removeTarget && (
        <ConfirmDialog
          open
          title={d.removeConfirmTitle}
          description={d.removeConfirmDesc}
          confirmLabel={d.removeButton}
          cancelLabel={d.close}
          destructive
          onConfirm={confirmRemove}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      {/* Temp password modal */}
      {tempModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <p className="font-mono text-xs text-muted leading-relaxed">{d.noEmailNotice}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-accent select-all">
                {tempModal.password}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempModal.password)
                  setTempModal((m) => m ? { ...m, copied: true } : null)
                }}
                className="shrink-0 rounded-md border border-border px-3 py-2 font-mono text-xs text-muted hover:text-text transition-colors cursor-pointer"
              >
                {tempModal.copied ? '✓' : d.copyPassword}
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setTempModal(null)}
                className="rounded-md border border-border px-4 py-1.5 font-mono text-xs text-muted hover:text-text transition-colors cursor-pointer"
              >
                {d.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
