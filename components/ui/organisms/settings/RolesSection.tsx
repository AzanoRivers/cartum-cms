'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  listRolesWithCount,
  getPermissionsForRole,
  saveRolePermissions,
  getUsersForRole,
  type RoleWithCount,
  type NodePermissionRow,
} from '@/lib/actions/settings.actions'
import { createRole, deleteRole } from '@/lib/actions/roles.actions'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { useToast } from '@/lib/hooks/useToast'
import { t } from '@/lib/i18n/t'
import type { Dictionary } from '@/locales/en'
import type { RolePermissionMatrix } from '@/types/settings'

export type RolesSectionProps = {
  d: Dictionary['settings']['roles']
}

type DeleteTarget = {
  roleId: string
  roleName: string
  affectedUsers: Array<{ id: string; email: string }>
} | null

type PermRow = NodePermissionRow
type WildcardState = { read: boolean; create: boolean; update: boolean; delete: boolean }

const ACTIONS: Array<{ key: keyof WildcardState; label: keyof Dictionary['settings']['roles'] }> = [
  { key: 'read',   label: 'readCol'   },
  { key: 'create', label: 'createCol' },
  { key: 'update', label: 'updateCol' },
  { key: 'delete', label: 'deleteCol' },
]

export function RolesSection({ d }: RolesSectionProps) {
  const [roles, setRoles]               = useState<RoleWithCount[]>([])
  const [loaded, setLoaded]             = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [perms, setPerms]               = useState<PermRow[]>([])
  const [wildcard, setWildcard]         = useState<WildcardState>({ read: false, create: false, update: false, delete: false })
  const [permsLoaded, setPermsLoaded]   = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [newRoleName, setNewRoleName]   = useState('')
  const [isCreating, startCreate]       = useTransition()
  const [isSavingPerms, startSavePerms] = useTransition()
  const toast = useToast()

  useEffect(() => {
    listRolesWithCount().then((res) => {
      if (res.success) setRoles(res.data)
      setLoaded(true)
    })
  }, [])

  function selectRole(roleId: string) {
    setSelectedRoleId(roleId)
    setPermsLoaded(false)
    getPermissionsForRole(roleId).then((res) => {
      if (res.success) {
        setPerms(res.data.permissions)
        const wa = res.data.wildcardActions
        setWildcard({
          read:   wa.includes('read'),
          create: wa.includes('create'),
          update: wa.includes('update'),
          delete: wa.includes('delete'),
        })
      }
      setPermsLoaded(true)
    })
  }

  function handleCreate() {
    if (!newRoleName.trim()) return
    startCreate(async () => {
      const res = await createRole({ name: newRoleName.trim() })
      if (res.success) {
        toast.success(d.createSuccess)
        setNewRoleName('')
        listRolesWithCount().then((r) => { if (r.success) setRoles(r.data) })
      } else {
        toast.error(d.createError)
      }
    })
  }

  async function initiateDelete(role: RoleWithCount) {
    const usersRes = await getUsersForRole(role.id)
    setDeleteTarget({
      roleId: role.id,
      roleName: role.name,
      affectedUsers: usersRes.success ? usersRes.data : [],
    })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const res = await deleteRole(deleteTarget.roleId)
    if (res.success) {
      toast.success(d.deleteSuccess)
      setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.roleId))
      if (selectedRoleId === deleteTarget.roleId) setSelectedRoleId(null)
    } else {
      toast.error(d.deleteError)
    }
    setDeleteTarget(null)
  }

  function togglePerm(nodeId: string, action: keyof WildcardState) {
    setPerms((prev) =>
      prev.map((p) => {
        if (p.nodeId !== nodeId) return p
        return { ...p, [`can${capitalize(action)}`]: !p[`can${capitalize(action)}` as keyof PermRow] }
      }),
    )
  }

  function toggleWildcard(action: keyof WildcardState) {
    setWildcard((prev) => ({ ...prev, [action]: !prev[action] }))
  }

  function handleSavePerms() {
    if (!selectedRoleId) return
    startSavePerms(async () => {
      const matrix: RolePermissionMatrix = {
        roleId: selectedRoleId,
        nodePermissions: [
          ...perms.map((p) => ({
            nodeId: p.nodeId,
            actions: [
              ...(p.canRead   ? ['read'   as const] : []),
              ...(p.canCreate ? ['create' as const] : []),
              ...(p.canUpdate ? ['update' as const] : []),
              ...(p.canDelete ? ['delete' as const] : []),
            ],
          })),
          {
            nodeId: '*',
            actions: [
              ...(wildcard.read   ? ['read'   as const] : []),
              ...(wildcard.create ? ['create' as const] : []),
              ...(wildcard.update ? ['update' as const] : []),
              ...(wildcard.delete ? ['delete' as const] : []),
            ],
          },
        ],
      }
      const res = await saveRolePermissions(matrix)
      if (res.success) toast.success(d.permsSaved)
      else toast.error(d.permsError)
    })
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId)

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

      {/* Role list */}
      <div className="space-y-1">
        {roles.length === 0 && (
          <p className="font-mono text-xs text-muted/50">{d.noCustomRoles}</p>
        )}
        {roles.map((role) => (
          <div
            key={role.id}
            className={[
              'flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors',
              selectedRoleId === role.id
                ? 'border-primary/30 bg-primary/10'
                : 'border-border/50 bg-surface-2/30 hover:bg-surface-2/60',
            ].join(' ')}
            onClick={() => !role.isBuiltIn && selectRole(role.id)}
          >
            <span className="flex-1 font-mono text-xs text-text">{role.name}</span>
            <span className="font-mono text-[10px] text-muted/60">
              {role.isBuiltIn ? d.builtIn : d.custom}
            </span>
            {!role.isBuiltIn && (
              <button
                onClick={(e) => { e.stopPropagation(); initiateDelete(role) }}
                className="ml-1 font-mono text-[10px] text-danger/60 hover:text-danger transition-colors cursor-pointer"
              >
                {d.deleteButton}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* New role form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder={d.roleNamePlaceholder}
          className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
        />
        <button
          onClick={handleCreate}
          disabled={isCreating || !newRoleName.trim()}
          className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isCreating ? d.creating : d.createButton}
        </button>
      </div>

      {/* Permission matrix */}
      {selectedRole && !selectedRole.isBuiltIn && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-muted">
              {t(d as unknown as Record<string, string>, 'permissionsTitle', { name: selectedRole.name })}
            </p>
            <button
              onClick={handleSavePerms}
              disabled={isSavingPerms}
              className="rounded-md bg-primary px-3 py-1 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSavingPerms ? d.savingPerms : d.savePerms}
            </button>
          </div>

          {!permsLoaded ? (
            <span className="font-mono text-xs text-muted animate-pulse">Loading…</span>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="px-3 py-2 font-mono text-[11px] text-muted uppercase tracking-wider min-w-28">{d.nodeCol}</th>
                    {ACTIONS.map((a) => (
                      <th key={a.key} className="px-3 py-2 font-mono text-[11px] text-muted uppercase tracking-wider text-center w-14">
                        {d[a.label] as string}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perms.map((row) => (
                    <tr key={row.nodeId} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs text-text">{row.nodeName}</td>
                      {ACTIONS.map((a) => (
                        <td key={a.key} className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={!!row[`can${capitalize(a.key)}` as keyof PermRow]}
                            onChange={() => togglePerm(row.nodeId, a.key)}
                            className="accent-primary cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Wildcard row */}
                  <tr className="border-t border-dashed border-border/60 hover:bg-surface-2/40 transition-colors">
                    <td className="px-3 py-2 font-mono text-[11px] text-muted/60 italic">{d.wildcardRow}</td>
                    {ACTIONS.map((a) => (
                      <td key={a.key} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={wildcard[a.key]}
                          onChange={() => toggleWildcard(a.key)}
                          className="accent-primary cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!selectedRoleId && !selectedRole && roles.some((r) => !r.isBuiltIn) && (
        <p className="font-mono text-[11px] text-muted/50 italic">{d.selectToEdit}</p>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          open
          title={t(d as unknown as Record<string, string>, 'confirmDeleteTitle', { name: deleteTarget.roleName })}
          description={
            deleteTarget.affectedUsers.length > 0
              ? `${t(d as unknown as Record<string, string>, 'confirmDeleteAffected', { count: String(deleteTarget.affectedUsers.length) })}\n${deleteTarget.affectedUsers.map((u) => u.email).join(', ')}`
              : d.confirmDeleteNone
          }
          confirmLabel={d.deleteButton}
          cancelLabel="Cancel"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
