'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Trash2, ShieldCheck, ChevronDown } from 'lucide-react'
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
  getProjectMembersWithRole,
  reassignAndDeleteRole,
  getGalleryPermissionsAction,
  updateGalleryPermissionsAction,
  getSchemaPermissionsAction,
  updateSchemaPermissionsAction,
} from '@/lib/actions/roles.actions'
import type { GalleryPermissions, SchemaPermissions, SectionAccess } from '@/types/roles'
import { DEFAULT_GALLERY_PERMS_EDITOR, DEFAULT_GALLERY_PERMS_VIEWER, DEFAULT_SCHEMA_PERMS_WRITE, DEFAULT_SCHEMA_PERMS_READONLY } from '@/types/roles'
import { SectionPermissionList } from '@/components/ui/molecules/SectionPermissionList'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { DocLink } from '@/components/ui/atoms/DocLink'
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
  canActions?:  boolean
}

type DeleteTarget = {
  roleId:          string
  roleName:        string
  affectedUsers:   Array<{ userId: string; email: string }>
  reassignRoleId:  string
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

export function RolesSection({ d, navDict, isSuperAdmin, isAdmin, canActions = true }: RolesSectionProps) {
  const toast = useToast()

  const [roles, setRoles]               = useState<RoleWithCount[]>([])
  const [rolesLoaded, setRolesLoaded]   = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  const [perms, setPerms]               = useState<PermRow[]>([])
  const [permsLoaded, setPermsLoaded]   = useState(false)
  const [isProjectOverride, setIsProjectOverride] = useState(false)
  const [isSavingPerms, startSavePerms] = useTransition()

  const [sectionPerms, setSectionPerms] = useState<Partial<Record<SectionKey, SectionAccess>>>({})
  const [isSavingSec, startSaveSec]     = useTransition()

  const [wildcardActions, setWildcardActions] = useState<CrudKey[]>([])

  const [nodesOpen, setNodesOpen]       = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState(false)
  const [galleryOpen, setGalleryOpen]   = useState(false)
  const [schemaOpen,  setSchemaOpen]    = useState(false)

  const [galleryPerms, setGalleryPerms]         = useState<GalleryPermissions>(DEFAULT_GALLERY_PERMS_EDITOR)
  const [isSavingGallery, startSaveGallery]     = useTransition()

  const [schemaPerms, setSchemaPerms]           = useState<SchemaPermissions>(DEFAULT_SCHEMA_PERMS_WRITE)
  const [isSavingSchema, startSaveSchema]       = useTransition()

  const [newRoleName, setNewRoleName]   = useState('')
  const [showCreate, setShowCreate]     = useState(false)
  const [isCreating, startCreate]       = useTransition()

  const [deleteTarget, setDeleteTarget]   = useState<DeleteTarget>(null)
  const [loadingDelete, setLoadingDelete] = useState(false)

  // Load all roles on mount
  useEffect(() => {
    listRolesWithCount().then((res) => {
      if (res.success) setRoles(sortRoles(res.data.filter((r) => r.name !== ROLE_RESTRICTED)))
      setRolesLoaded(true)
    })
  }, [])

  // Load role permissions when selection changes
  useEffect(() => {
    if (!selectedId) return
    setPermsLoaded(false)
    setSectionPerms({})
    setWildcardActions([])
    setIsProjectOverride(false)

    Promise.all([
      getPermissionsForRole(selectedId),
      getSectionPermissionsAction(selectedId),
      getGalleryPermissionsAction(selectedId),
      getSchemaPermissionsAction(selectedId),
    ]).then(([nodeRes, sectionRes, galleryRes, schemaRes]) => {
      if (nodeRes.success) {
        // Pre-fill defaults for built-in editor / viewer (implicit full-project access)
        const roleName = roles.find((r) => r.id === selectedId)?.name
        const isAdmin  = roleName === ROLE_ADMIN
        const isEditor = roleName === ROLE_EDITOR
        const isViewer = roleName === ROLE_VIEWER
        const loadedPerms = (isAdmin || isEditor || isViewer)
          ? nodeRes.data.permissions.map((p) => ({
              ...p,
              canRead:   true,
              canCreate: isAdmin || isEditor,
              canUpdate: isAdmin || isEditor,
              canDelete: isAdmin || isEditor,
            }))
          : nodeRes.data.permissions
        setPerms(loadedPerms)
        setWildcardActions(nodeRes.data.wildcardActions)
        setIsProjectOverride(nodeRes.data.isProjectOverride)
      }
      if (sectionRes.success) {
        const roleName = roles.find((r) => r.id === selectedId)?.name
        const rIsAdmin  = roleName === ROLE_ADMIN
        const rIsEditor = roleName === ROLE_EDITOR
        const rIsViewer = roleName === ROLE_VIEWER

        // Sections where editor can view+act, viewer can only view
        const EDITOR_SECTIONS: SectionKey[] = ['project', 'appearance', 'account', 'webMigration', 'help', 'info']
        const VIEWER_SECTIONS:  SectionKey[] = ['project', 'appearance', 'account', 'help', 'info']
        // Sections where viewer also gets canActions (not just canView)
        const VIEWER_ACTION_SECTIONS: SectionKey[] = ['help']

        const map: Partial<Record<SectionKey, SectionAccess>> = {}

        if (rIsAdmin) {
          // Admin: all sections view+actions
          for (const sp of sectionRes.data) {
            map[sp.section as SectionKey] = { canView: true, canActions: true }
          }
        } else if (rIsEditor) {
          for (const sp of sectionRes.data) {
            const key = sp.section as SectionKey
            const inList = EDITOR_SECTIONS.includes(key)
            map[key] = { canView: inList, canActions: inList }
          }
        } else if (rIsViewer) {
          for (const sp of sectionRes.data) {
            const key = sp.section as SectionKey
            map[key] = {
              canView:    VIEWER_SECTIONS.includes(key),
              canActions: VIEWER_ACTION_SECTIONS.includes(key),
            }
          }
        } else {
          // Custom role or has project override — use exact DB values
          for (const sp of sectionRes.data) {
            map[sp.section as SectionKey] = { canView: sp.canAccess, canActions: sp.canActions }
          }
        }

        // Fallback: if help is not in sectionRes.data yet (seed not run),
        // ensure it appears with correct defaults for non-restricted roles
        if (map['help'] === undefined && (rIsAdmin || rIsEditor || rIsViewer)) {
          map['help'] = { canView: true, canActions: true }
        }

        setSectionPerms(map)
      }
      if (galleryRes.success) setGalleryPerms(galleryRes.data)
      if (schemaRes.success)  setSchemaPerms(schemaRes.data)
      setPermsLoaded(true)
    })
  }, [selectedId])

  function handleCreate() {
    if (!canActions || !newRoleName.trim()) return
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
    if (!canActions) return
    setLoadingDelete(true)
    const membersRes = await getProjectMembersWithRole(role.id)
    setLoadingDelete(false)
    // Default reassign target: first built-in role that's not the one being deleted
    const defaultReassign = roles.find((r) => r.isBuiltIn && r.id !== role.id)?.id ?? ''
    setDeleteTarget({
      roleId:          role.id,
      roleName:        role.name,
      affectedUsers:   membersRes.success ? membersRes.data : [],
      reassignRoleId:  defaultReassign,
    })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const res = deleteTarget.affectedUsers.length > 0
      ? await reassignAndDeleteRole(deleteTarget.roleId, deleteTarget.reassignRoleId)
      : await deleteRole(deleteTarget.roleId)
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
    if (!canActions || !selectedId) return
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
    if (!canActions || !selectedId) return
    startSaveSec(async () => {
      const permissions = (Object.entries(sectionPerms) as [SectionKey, SectionAccess][]).map(
        ([section, access]) => ({
          section,
          canAccess:  access.canView,
          canActions: access.canActions,
        }),
      )
      const res = await updateSectionPermissionsAction(selectedId, permissions)
      if (res.success) toast.success(d.sectionPermsSaved)
      else toast.error(d.sectionPermsError)
    })
  }

  function handleSaveGalleryPerms() {
    if (!canActions || !selectedId) return
    startSaveGallery(async () => {
      const res = await updateGalleryPermissionsAction(selectedId, galleryPerms)
      if (res.success) toast.success(d.gallerySaved)
      else toast.error(d.sectionPermsError)
    })
  }

  function handleSaveSchemaPerms() {
    if (!canActions || !selectedId) return
    startSaveSchema(async () => {
      const res = await updateSchemaPermissionsAction(selectedId, schemaPerms)
      if (res.success) toast.success(d.schemaSaved ?? 'Board permissions saved.')
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

      {/* Project-scope warning */}
      <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 font-mono text-[10px] text-warning/80 leading-relaxed">
        ⚠ {d.projectScopeWarning}
      </div>

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

          {/* New role button — admin or superAdmin */}
          {(isSuperAdmin || isAdmin) && (
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
                  {/* Project override indicator — only for built-in roles */}
                  {selectedRole.isBuiltIn && (
                    <span className={[
                      'rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider border',
                      isProjectOverride
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-surface-2/60 text-muted/50 border-border/40',
                    ].join(' ')}>
                      {isProjectOverride ? d.projectOverrideBadge : d.globalDefaultBadge}
                    </span>
                  )}
                </div>

                {!canEdit ? (
                  /* Admin message */
                  <div className="flex flex-1 items-center justify-center p-6">
                    <div className="rounded-xl border border-primary/30 bg-primary/5 px-6 py-5 text-center space-y-3 max-w-xs">
                      <ShieldCheck size={28} className="mx-auto text-primary/70" strokeWidth={1.5} />
                      <p className="font-mono text-xs md:text-sm text-primary/80 leading-relaxed">{d.noPermission}</p>
                      <p className="font-mono text-[10px] md:text-xs text-muted/60 leading-relaxed italic">{d.noPermissionSub}</p>
                    </div>
                  </div>
                ) : !permsLoaded ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Spinner size="sm" color="muted" />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">

                    {/* ── Accordion: Node permissions ──────────────────── */}
                    <div className="rounded-lg border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setNodesOpen((v) => !v)}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors cursor-pointer ${nodesOpen ? 'bg-primary/10' : 'bg-primary/5 hover:bg-primary/10'}`}
                      >
                        <span className={`font-mono text-xs font-semibold ${nodesOpen ? 'text-primary' : 'text-text'}`}>
                          {d.nodeAccessTab}
                        </span>
                        <ChevronDown size={13} className={`transition-transform duration-300 ${nodesOpen ? 'rotate-180 text-primary' : 'text-muted'}`} />
                      </button>
                      <div
                        className={`grid ${nodesOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                        style={{ transition: 'grid-template-rows 280ms cubic-bezier(0.4,0,0.2,1)' }}
                      >
                        <div className={`min-h-0 overflow-hidden transition-opacity duration-200 ${nodesOpen ? 'opacity-100 delay-75' : 'opacity-0'}`}>
                          <div className="border-t border-border px-3 pb-3 pt-2.5 space-y-3">
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
                                          <label className={`flex flex-col items-center gap-1 select-none ${!canActions ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                            <input
                                              type="checkbox"
                                              checked={allChecked}
                                              onChange={() => toggleAll(a.key)}
                                              disabled={!canActions}
                                              className="accent-primary cursor-pointer disabled:cursor-not-allowed"
                                              title={d[a.dictKey] as string}
                                            />
                                            <span>{d[a.dictKey] as string}</span>
                                          </label>
                                        </th>
                                      )
                                    })}
                                  </tr>
                                </thead>
                              </table>
                              {/* Scrollable body — max 240px so many nodes don't overflow */}
                              <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-left">
                                  <tbody>
                                    <tr className="border-b border-border/60 bg-primary/5">
                                      <td className="px-3 py-1.5 font-mono text-xs text-primary/70 italic min-w-24">{d.wildcardRow}</td>
                                      {CRUD_ACTIONS.map((a) => (
                                        <td key={a.key} className="px-2 py-1.5 text-center w-12">
                                          <input
                                            type="checkbox"
                                            checked={wildcardActions.includes(a.key)}
                                            onChange={() => toggleWildcard(a.key)}
                                            disabled={!canActions}
                                            className="accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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
                                              disabled={!canActions}
                                              className="accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveNodePerms}
                              disabled={isSavingPerms || !canActions}
                              className="h-7 rounded-md bg-primary/10 border border-primary/30 px-3 font-mono text-xs text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {isSavingPerms && <Spinner size="sm" color="primary" />}
                              {isSavingPerms ? d.savingPerms : d.savePerms}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Accordion: Section access ────────────────────── */}
                    <div className="rounded-lg border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setSectionsOpen((v) => !v)}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors cursor-pointer ${sectionsOpen ? 'bg-primary/10' : 'bg-primary/5 hover:bg-primary/10'}`}
                      >
                        <span className={`font-mono text-xs font-semibold ${sectionsOpen ? 'text-primary' : 'text-text'}`}>
                          {d.settingsAccessTab}
                        </span>
                        <ChevronDown size={13} className={`transition-transform duration-300 ${sectionsOpen ? 'rotate-180 text-primary' : 'text-muted'}`} />
                      </button>
                      <div
                        className={`grid ${sectionsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                        style={{ transition: 'grid-template-rows 280ms cubic-bezier(0.4,0,0.2,1)' }}
                      >
                        <div className={`min-h-0 overflow-hidden transition-opacity duration-200 ${sectionsOpen ? 'opacity-100 delay-75' : 'opacity-0'}`}>
                          <div className="border-t border-border px-3 pb-3 pt-2.5 space-y-3">
                            <div className="rounded-md border border-border/70 overflow-hidden">
                              <SectionPermissionList
                                permissions={sectionPerms}
                                onChange={(section, field, value) =>
                                  setSectionPerms((prev) => ({
                                    ...prev,
                                    [section]: {
                                      canView:    field === 'canView'    ? value : (prev[section]?.canView    ?? false),
                                      canActions: field === 'canActions' ? value : (prev[section]?.canActions ?? false),
                                    },
                                  }))
                                }
                                readonly={!canEdit}
                                navDict={navDict}
                                colView={d.sectionColView ?? 'Ver'}
                                colActions={d.sectionColActions ?? 'Acciones'}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveSectionPerms}
                              disabled={isSavingSec || !canActions}
                              className="h-7 rounded-md bg-primary/10 border border-primary/30 px-3 font-mono text-xs text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {isSavingSec && <Spinner size="sm" color="primary" />}
                              {isSavingSec ? d.savingSectionPerms : d.saveSectionPerms}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Accordion: Gallery Access ────────────────────── */}
                    <div className="rounded-lg border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setGalleryOpen((v) => !v)}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors cursor-pointer ${galleryOpen ? 'bg-primary/10' : 'bg-primary/5 hover:bg-primary/10'}`}
                      >
                        <span className={`font-mono text-xs font-semibold ${galleryOpen ? 'text-primary' : 'text-text'}`}>
                          {d.galleryAccessTab}
                        </span>
                        <ChevronDown size={13} className={`transition-transform duration-300 ${galleryOpen ? 'rotate-180 text-primary' : 'text-muted'}`} />
                      </button>
                      <div
                        className={`grid ${galleryOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                        style={{ transition: 'grid-template-rows 280ms cubic-bezier(0.4,0,0.2,1)' }}
                      >
                        <div className={`min-h-0 overflow-hidden transition-opacity duration-200 ${galleryOpen ? 'opacity-100 delay-75' : 'opacity-0'}`}>
                          <div className="border-t border-border px-3 pb-3 pt-2.5 space-y-3">
                            <div className="overflow-x-auto rounded-md border border-border/70">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="border-b border-border/70 bg-surface-2/60">
                                    <th className="px-3 py-2 font-mono text-[10px] text-muted uppercase tracking-wider min-w-24"></th>
                                    {([d.galleryView, d.galleryUpload, d.galleryDelete] as const).map((col) => (
                                      <th key={col} className="px-2 py-2 font-mono text-[10px] text-muted uppercase tracking-wider text-center w-14">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(['images', 'videos'] as const).map((media) => (
                                    <tr key={media} className="border-b border-border/40 last:border-0 hover:bg-surface-2/30 transition-colors">
                                      <td className="px-3 py-2 font-mono text-xs text-text">
                                        {media === 'images' ? d.galleryImages : d.galleryVideos}
                                      </td>
                                      {(['canView', 'canUpload', 'canDelete'] as const).map((perm) => (
                                        <td key={perm} className="px-2 py-2 text-center">
                                          <input
                                            type="checkbox"
                                            checked={galleryPerms[media][perm]}
                                            onChange={() => setGalleryPerms((prev) => ({
                                              ...prev,
                                              [media]: { ...prev[media], [perm]: !prev[media][perm] },
                                            }))}
                                            disabled={!canActions}
                                            className="accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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
                              onClick={handleSaveGalleryPerms}
                              disabled={isSavingGallery || !canActions}
                              className="h-7 rounded-md bg-primary/10 border border-primary/30 px-3 font-mono text-xs text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {isSavingGallery && <Spinner size="sm" color="primary" />}
                              {isSavingGallery ? d.gallerySaving : d.gallerySave}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Schema / Board permissions accordion */}
                    <div className="rounded-md border border-border/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setSchemaOpen((v) => !v)}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors cursor-pointer ${schemaOpen ? 'bg-primary/10' : 'bg-primary/5 hover:bg-primary/10'}`}
                      >
                        <span className={`font-mono text-xs font-semibold ${schemaOpen ? 'text-primary' : 'text-text'}`}>
                          {d.schemaAccessTab ?? 'Acceso al Tablero'}
                        </span>
                        <ChevronDown size={13} className={`transition-transform duration-300 ${schemaOpen ? 'rotate-180 text-primary' : 'text-muted'}`} />
                      </button>
                      <div
                        className={`grid ${schemaOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                        style={{ transition: 'grid-template-rows 280ms cubic-bezier(0.4,0,0.2,1)' }}
                      >
                        <div className={`min-h-0 overflow-hidden transition-opacity duration-200 ${schemaOpen ? 'opacity-100 delay-75' : 'opacity-0'}`}>
                          <div className="border-t border-border px-3 pb-3 pt-2.5 space-y-3">
                            <p className="font-mono text-[11px] text-muted">
                              {d.schemaViewNote ?? 'Por defecto todos los roles pueden ver el tablero.'}
                            </p>
                            <div className="overflow-x-auto rounded-md border border-border/70">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-border/70 bg-surface-2/60">
                                    <th className="px-3 py-2 font-mono text-[10px] text-muted uppercase tracking-wider min-w-24"></th>
                                    {(['canCreate', 'canUpdate', 'canDelete', 'canConnect'] as const).map((col) => (
                                      <th key={col} className="px-2 py-2 font-mono text-[10px] text-muted uppercase tracking-wider text-center w-14">
                                        {d[`schema_${col}` as keyof typeof d] as string ?? col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b border-border/40 last:border-0 hover:bg-surface-2/30 transition-colors">
                                    <td className="px-3 py-2 font-mono text-xs text-text">
                                      {d.schemaBoardRow ?? 'Tablero'}
                                    </td>
                                    {(['canCreate', 'canUpdate', 'canDelete', 'canConnect'] as const).map((perm) => (
                                      <td key={perm} className="px-2 py-2 text-center">
                                        <input
                                          type="checkbox"
                                          checked={schemaPerms[perm]}
                                          disabled={!canEdit || !canActions}
                                          onChange={() => setSchemaPerms((prev) => ({ ...prev, [perm]: !prev[perm] }))}
                                          className="accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveSchemaPerms}
                              disabled={isSavingSchema || !canEdit || !canActions}
                              className="h-7 rounded-md bg-primary/10 border border-primary/30 px-3 font-mono text-xs text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {isSavingSchema && <Spinner size="sm" color="primary" />}
                              {isSavingSchema ? (d.gallerySaving ?? 'Saving…') : (d.gallerySave ?? 'Save')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delete button — custom roles only */}
                    {canEdit && !selectedRole.isBuiltIn && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => initiateDelete(selectedRole)}
                          disabled={loadingDelete || !canActions}
                          className="flex items-center gap-1.5 rounded-md border border-danger/30 px-3 py-1.5 font-mono text-xs text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {loadingDelete
                            ? <Spinner size="sm" color="muted" />
                            : <Trash2 size={12} />
                          }
                          {!loadingDelete && d.deleteButton}
                        </button>
                      </div>
                    )}

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
            disabled={!canActions}
            className="flex-1 min-w-0 rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleCreate}
            disabled={isCreating || !newRoleName.trim() || !canActions}
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
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setDeleteTarget(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <VHSTransition duration="fast" className="w-full max-w-sm mx-4">
              <div
                role="dialog"
                aria-modal="true"
                className="pointer-events-auto relative w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-0.5 w-full bg-danger" />
                <div className="px-5 pt-5 pb-4 space-y-3">
                  <h2 className="font-mono text-sm font-semibold text-text leading-snug">
                    {t(d as unknown as Record<string, string>, 'confirmDeleteTitle', { name: deleteTarget.roleName })}
                  </h2>

                  {deleteTarget.affectedUsers.length > 0 ? (
                    <div className="space-y-3">
                      <p className="font-mono text-[11px] leading-relaxed text-muted">
                        {t(d as unknown as Record<string, string>, 'confirmDeleteAffected', { count: String(deleteTarget.affectedUsers.length) })}
                      </p>
                      <p className="font-mono text-[11px] text-muted">{d.reassignLabel}</p>
                      <select
                        value={deleteTarget.reassignRoleId}
                        onChange={(e) => setDeleteTarget((prev) => prev ? { ...prev, reassignRoleId: e.target.value } : prev)}
                        className="w-full rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text outline-none focus:border-primary/60 transition-colors cursor-pointer"
                      >
                        {roles
                          .filter((r) => r.id !== deleteTarget.roleId && r.isBuiltIn)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {d.builtInRoleLabels[r.name] ?? r.name}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  ) : (
                    <p className="font-mono text-[11px] leading-relaxed text-muted">{d.confirmDeleteNone}</p>
                  )}
                </div>
                <div className="mx-5 border-t border-border/40" />
                <div className="flex items-center justify-end gap-2 px-5 py-4">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-lg border border-border bg-surface-2 px-4 py-1.5 font-mono text-xs text-text hover:bg-surface hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    {d.cancel}
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleteTarget.affectedUsers.length > 0 && !deleteTarget.reassignRoleId}
                    className="flex items-center gap-1.5 rounded-lg bg-danger hover:bg-danger/85 border border-danger/60 px-4 py-1.5 font-mono text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={11} strokeWidth={2.5} />
                    {d.deleteButton}
                  </button>
                </div>
              </div>
            </VHSTransition>
          </div>
        </>
      )}

      <DocLink href="/docs#rolesGuide" label={d.docsLinkLabel} desc={d.docsLinkDesc} />
    </section>
  )
}
