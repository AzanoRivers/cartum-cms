'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  listRolesWithCount,
  getPermissionsForRole,
  saveRolePermissions,
  getUsersForRole,
  type RoleWithCount,
  type NodePermissionRow,
} from '@/lib/actions/settings.actions'
import {
  createRole,
  deleteRole,
  getSectionPermissionsAction,
  updateSectionPermissionsAction,
} from '@/lib/actions/roles.actions'
import { SectionPermissionList } from '@/components/ui/molecules/SectionPermissionList'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { useToast } from '@/lib/hooks/useToast'
import { t } from '@/lib/i18n/t'
import type { Dictionary } from '@/locales/en'
import type { RolePermissionMatrix } from '@/types/settings'
import type { SectionKey } from '@/types/roles'
import { ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER, ROLE_RESTRICTED } from '@/types/roles'

const BUILT_IN_ORDER = [ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER, ROLE_RESTRICTED]

function sortRoles(list: RoleWithCount[]): RoleWithCount[] {
  return [...list].sort((a, b) => {
    const ai = BUILT_IN_ORDER.indexOf(a.name as typeof BUILT_IN_ORDER[number])
    const bi = BUILT_IN_ORDER.indexOf(b.name as typeof BUILT_IN_ORDER[number])
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.name.localeCompare(b.name)
  })
}

export type RolesSectionProps = {
  d:            Dictionary['settings']['roles']
  navDict:      Dictionary['settings']['nav']
  isSuperAdmin: boolean
  isAdmin:      boolean
}

type DeleteTarget = {
  roleId:        string
  roleName:      string
  affectedUsers: Array<{ id: string; email: string }>
} | null

type CrudKey = 'read' | 'create' | 'update' | 'delete'
type PermRow = NodePermissionRow

const CRUD_ACTIONS: Array<{ key: CrudKey; dictKey: keyof Dictionary['settings']['roles'] }> = [
  { key: 'read',   dictKey: 'readCol'   },
  { key: 'create', dictKey: 'createCol' },
  { key: 'update', dictKey: 'updateCol' },
  { key: 'delete', dictKey: 'deleteCol' },
]

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function isEditable(role: RoleWithCount, isSuperAdmin: boolean, isAdmin: boolean): boolean {
  if (isSuperAdmin) return true
  if (isAdmin) return role.name !== ROLE_ADMIN
  return false
}

export function RolesSection({ d, navDict, isSuperAdmin, isAdmin }: RolesSectionProps) {
  const toast = useToast()

  const [roles, setRoles]               = useState<RoleWithCount[]>([])
  const [rolesLoaded, setRolesLoaded]   = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  const [perms, setPerms]               = useState<PermRow[]>([])
  const [permsLoaded, setPermsLoaded]   = useState(false)
  const [isSavingPerms, startSavePerms] = useTransition()

  const [sectionPerms, setSectionPerms] = useState<Partial<Record<SectionKey, boolean>>>({})
  const [isSavingSec, startSaveSec]     = useTransition()

  const [wildcardActions, setWildcardActions] = useState<CrudKey[]>([])

  const [newRoleName, setNewRoleName]   = useState('')
  const [showCreate, setShowCreate]     = useState(false)
  const [isCreating, startCreate]       = useTransition()

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

  // Load all roles on mount
  useEffect(() => {
    listRolesWithCount().then((res) => {
      if (res.success) setRoles(sortRoles(res.data))
      setRolesLoaded(true)
    })
  }, [])

  // Load role permissions when selection changes
  useEffect(() => {
    if (!selectedId) return
    setPermsLoaded(false)
    setSectionPerms({})
    setWildcardActions([])

    Promise.all([
      getPermissionsForRole(selectedId),
      getSectionPermissionsAction(selectedId),
    ]).then(([nodeRes, sectionRes]) => {
      if (nodeRes.success) {
        setPerms(nodeRes.data.permissions)
        setWildcardActions(nodeRes.data.wildcardActions)
      }
      if (sectionRes.success) {
        const map: Partial<Record<SectionKey, boolean>> = {}
        for (const sp of sectionRes.data) {
          map[sp.section as SectionKey] = sp.canAccess
        }
        setSectionPerms(map)
      }
      setPermsLoaded(true)
    })
  }, [selectedId])

  function handleCreate() {
    if (!newRoleName.trim()) return
    startCreate(async () => {
      const res = await createRole({ name: newRoleName.trim() })
      if (res.success) {
        toast.success(d.createSuccess)
        setNewRoleName('')
        setShowCreate(false)
        listRolesWithCount().then((r) => { if (r.success) setRoles(r.data) })
      } else {
        toast.error(d.createError)
      }
    })
  }

  async function initiateDelete(role: RoleWithCount) {
    const usersRes = await getUsersForRole(role.id)
    setDeleteTarget({
      roleId:        role.id,
      roleName:      role.name,
      affectedUsers: usersRes.success ? usersRes.data : [],
    })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const res = await deleteRole(deleteTarget.roleId)
    if (res.success) {
      toast.success(d.deleteSuccess)
      setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.roleId))
      if (selectedId === deleteTarget.roleId) setSelectedId(null)
    } else {
      toast.error(d.deleteError)
    }
    setDeleteTarget(null)
  }

  function togglePerm(nodeId: string, action: CrudKey) {
    setPerms((prev) =>
      prev.map((p) =>
        p.nodeId !== nodeId
          ? p
          : { ...p, [`can${capitalize(action)}`]: !p[`can${capitalize(action)}` as keyof PermRow] },
      ),
    )
  }

  function toggleAll(action: CrudKey) {
    const key = `can${capitalize(action)}` as keyof PermRow
    const allChecked = perms.every((p) => !!p[key])
    setPerms((prev) => prev.map((p) => ({ ...p, [key]: !allChecked })))
  }

  function toggleWildcard(action: CrudKey) {
    setWildcardActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action],
    )
  }

  function handleSaveNodePerms() {
    if (!selectedId) return
    startSavePerms(async () => {
      const matrix: RolePermissionMatrix = {
        roleId: selectedId,
        nodePermissions: [
          { nodeId: '*', actions: wildcardActions },
          ...perms.map((p) => ({
            nodeId:  p.nodeId,
            actions: [
              ...(p.canRead   ? ['read'   as const] : []),
              ...(p.canCreate ? ['create' as const] : []),
              ...(p.canUpdate ? ['update' as const] : []),
              ...(p.canDelete ? ['delete' as const] : []),
            ],
          })),
        ],
      }
      const res = await saveRolePermissions(matrix)
      if (res.success) toast.success(d.permsSaved)
      else toast.error(d.permsError)
    })
  }

  function handleSaveSectionPerms() {
    if (!selectedId) return
    startSaveSec(async () => {
      const permissions = (Object.entries(sectionPerms) as [SectionKey, boolean][]).map(
        ([section, canAccess]) => ({ section, canAccess }),
      )
      const res = await updateSectionPermissionsAction(selectedId, permissions)
      if (res.success) toast.success(d.sectionPermsSaved)
      else toast.error(d.sectionPermsError)
    })
  }

  const selectedRole = roles.find((r) => r.id === selectedId) ?? null
  const canEdit      = selectedRole ? isEditable(selectedRole, isSuperAdmin, isAdmin) : false

  if (!rolesLoaded) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner size="sm" color="muted" />
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>

      {/* Two-panel layout — vertical on mobile, horizontal on md+ */}
      <div className="flex flex-col gap-3 md:flex-row md:gap-4 md:min-h-120">

        {/* ── Role list ────────────────────────────────────────────────────────── */}
        <div className="flex flex-row gap-1.5 overflow-x-auto pb-1 shrink-0 md:flex-col md:w-36 md:overflow-x-visible md:pb-0">
          {roles.map((role) => {
            const selected = role.id === selectedId
            const editable = isEditable(role, isSuperAdmin, isAdmin)

            return (
              <div
                key={role.id}
                onClick={() => setSelectedId(role.id)}
                className={[
                  'group flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-2 cursor-pointer transition-colors',
                  'md:shrink md:w-full',
                  selected
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-border/40 bg-surface-2/20 hover:bg-surface-2/50',
                ].join(' ')}
              >
                <span className={[
                  'flex-1 font-mono text-xs truncate',
                  selected ? 'text-primary' : 'text-text',
                ].join(' ')}>
                  {d.builtInRoleLabels[role.name] ?? role.name}
                </span>

                {/* Delete button — superAdmin only, non-built-in roles */}
                {isSuperAdmin && !role.isBuiltIn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); initiateDelete(role) }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-danger/50 hover:text-danger transition-all cursor-pointer"
                    aria-label={d.deleteButton}
                  >
                    <Trash2 size={11} />
                  </button>
                )}

                {/* "cannot edit" indicator */}
                {!editable && selected && (
                  <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-muted/40" />
                )}
              </div>
            )
          })}

          {/* New role button */}
          {isSuperAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="shrink-0 flex items-center gap-1 rounded-md border border-dashed border-border/40 px-2.5 py-2 font-mono text-xs text-muted hover:text-text hover:border-border transition-colors cursor-pointer md:mt-1 md:w-full"
            >
              <Plus size={11} />
              {d.createButton}
            </button>
          )}
        </div>

        {/* ── Right: role detail ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 min-h-64 rounded-lg border border-border bg-surface overflow-hidden md:min-h-auto">
          {!selectedRole ? (
            <div className="flex h-full items-center justify-center">
              <p className="font-mono text-xs text-muted/50 text-center px-4">{d.selectToEdit}</p>
            </div>
          ) : (
            <VHSTransition duration="fast" trigger={selectedId} className="flex flex-col h-full">
              <div className="flex flex-col h-full overflow-y-auto">
                {/* Role header */}
                <div className="flex items-center gap-2 border-b border-border px-4 py-3 shrink-0">
                  <span className="font-mono text-sm text-text font-semibold">{d.builtInRoleLabels[selectedRole.name] ?? selectedRole.name}</span>
                  <span className={[
                    'rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider border',
                    selectedRole.isBuiltIn
                      ? 'bg-surface-2 text-muted border-border/60'
                      : 'bg-accent/10 text-accent border-accent/30',
                  ].join(' ')}>
                    {selectedRole.isBuiltIn ? d.systemBadge : d.custom}
                  </span>
                  {selectedRole.userCount > 0 && (
                    <span className="ml-auto font-mono text-[11px] text-muted/60">
                      {t(d as unknown as Record<string, string>, 'userCount', { count: String(selectedRole.userCount) })}
                    </span>
                  )}
                </div>

                {!canEdit ? (
                  /* Cannot edit this role */
                  <div className="flex flex-1 items-center justify-center">
                    <p className="font-mono text-xs text-muted/60 text-center px-6">{d.noPermission}</p>
                  </div>
                ) : !permsLoaded ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Spinner size="sm" color="muted" />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* Node permissions matrix */}
                    <div className="space-y-3">
                      <p className="font-mono text-[11px] text-muted uppercase tracking-wider">
                        {t(d as unknown as Record<string, string>, 'permissionsTitle', { name: selectedRole.name })}
                      </p>

                      <div className="overflow-x-auto rounded-md border border-border/70">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-border/70 bg-surface-2/60">
                              <th className="px-3 py-2 font-mono text-[10px] text-muted uppercase tracking-wider min-w-24">
                                {d.nodeCol}
                              </th>
                              {CRUD_ACTIONS.map((a) => {
                                const key = `can${capitalize(a.key)}` as keyof PermRow
                                const allChecked = perms.length > 0 && perms.every((p) => !!p[key])
                                return (
                                  <th key={a.key} className="px-2 py-2 font-mono text-[10px] text-muted uppercase tracking-wider text-center w-12">
                                    <label className="flex flex-col items-center gap-1 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={allChecked}
                                        onChange={() => toggleAll(a.key)}
                                        className="accent-primary cursor-pointer"
                                        title={d[a.dictKey] as string}
                                      />
                                      <span>{d[a.dictKey] as string}</span>
                                    </label>
                                  </th>
                                )
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {/* Wildcard row — applies to all nodes */}
                            <tr className="border-b border-border/60 bg-primary/5">
                              <td className="px-3 py-1.5 font-mono text-xs text-primary/70 italic">{d.wildcardRow}</td>
                              {CRUD_ACTIONS.map((a) => (
                                <td key={a.key} className="px-2 py-1.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={wildcardActions.includes(a.key)}
                                    onChange={() => toggleWildcard(a.key)}
                                    className="accent-primary cursor-pointer"
                                  />
                                </td>
                              ))}
                            </tr>
                            {perms.map((row) => (
                              <tr key={row.nodeId} className="border-b border-border/40 last:border-0 hover:bg-surface-2/30 transition-colors">
                                <td className="px-3 py-1.5 font-mono text-xs text-text">{row.nodeName}</td>
                                {CRUD_ACTIONS.map((a) => (
                                  <td key={a.key} className="px-2 py-1.5 text-center">
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
                          </tbody>
                        </table>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveNodePerms}
                        disabled={isSavingPerms}
                        className="h-7 rounded-md bg-primary/10 border border-primary/30 px-3 font-mono text-xs text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSavingPerms && <Spinner size="sm" color="primary" />}
                        {isSavingPerms ? d.savingPerms : d.savePerms}
                      </button>
                    </div>

                    {/* Section access */}
                    <div className="space-y-3">
                      <p className="font-mono text-[11px] text-muted uppercase tracking-wider">
                        {d.sectionPermissionsTitle}
                      </p>

                      <div className="rounded-md border border-border/70 overflow-hidden">
                        <SectionPermissionList
                          permissions={sectionPerms}
                          onChange={(section, value) =>
                            setSectionPerms((prev) => ({ ...prev, [section]: value }))
                          }
                          navDict={navDict}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveSectionPerms}
                        disabled={isSavingSec}
                        className="h-7 rounded-md bg-primary/10 border border-primary/30 px-3 font-mono text-xs text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSavingSec && <Spinner size="sm" color="primary" />}
                        {isSavingSec ? d.savingSectionPerms : d.saveSectionPerms}
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </VHSTransition>
          )}
        </div>
      </div>

      {/* ── Inline new role form ─────────────────────────────────────────────── */}
      {showCreate && (
        <div className="flex gap-2 items-center min-w-0">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setShowCreate(false); setNewRoleName('') }
            }}
            placeholder={d.roleNamePlaceholder}
            autoFocus
            className="flex-1 min-w-0 rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={isCreating || !newRoleName.trim()}
            className="h-8 rounded-md bg-primary px-4 font-mono text-xs text-white hover:bg-primary/80 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating && <Spinner size="sm" />}
            {isCreating ? d.creating : d.createButton}
          </button>
          <button
            onClick={() => { setShowCreate(false); setNewRoleName('') }}
            className="h-8 rounded-md border border-border px-3 font-mono text-xs text-muted hover:text-text transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Delete confirm ──────────────────────────────────────────────────── */}
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
          cancelLabel={d.cancel}
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  )
}
