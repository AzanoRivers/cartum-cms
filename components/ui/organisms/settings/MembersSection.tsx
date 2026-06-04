'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getMembersForProject,
  getPendingInvitations,
  listRolesForInvite,
  getMyAdminProjects,
  sendInvitation,
} from '@/lib/actions/invitations.actions'
import { MemberList, type MemberRow } from '@/components/ui/molecules/MemberList'
import { PendingInvitationList, type PendingInviteRow } from '@/components/ui/molecules/PendingInvitationList'
import { SectionLoader } from '@/components/ui/atoms/SectionLoader'
import { DocLink } from '@/components/ui/atoms/DocLink'
import { useToast } from '@/lib/hooks/useToast'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { Dictionary } from '@/locales/en'

type RoleOption    = { id: string; name: string }
type ProjectOption = { id: string; name: string }

type Props = {
  userId:       string
  isSuperAdmin: boolean
  isAdmin:      boolean
  d:            Dictionary['settings']['members']
  loadingText:  string
  canActions?:  boolean
}

export function MembersSection({ userId, isSuperAdmin, isAdmin, d, loadingText, canActions = true }: Props) {
  const [members,   setMembers]   = useState<MemberRow[]>([])
  const [ownerId,   setOwnerId]   = useState<string | null>(null)
  const [pending,   setPending]   = useState<PendingInviteRow[]>([])
  const [roles,     setRoles]     = useState<RoleOption[]>([])
  const [projects,  setProjects]  = useState<ProjectOption[]>([])
  const [loaded,    setLoaded]    = useState(false)

  const [email,     setEmail]     = useState('')
  const [roleId,    setRoleId]    = useState('')
  const [projectId, setProjectId] = useState('')

  const [isInviting, startInvite] = useTransition()
  const toast = useToast()

  async function loadData() {
    const [m, p, r, proj] = await Promise.all([
      getMembersForProject(),
      getPendingInvitations(),
      listRolesForInvite(),
      getMyAdminProjects(),
    ])
    setMembers(m.members as MemberRow[])
    setOwnerId(m.ownerId)
    setPending(p as PendingInviteRow[])
    setRoles(r)
    setProjects(proj)
    if (r.length && !roleId)    setRoleId(r[0]!.id)
    if (proj.length && !projectId) setProjectId(proj[0]!.id)
    setLoaded(true)
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleInvite() {
    if (!canActions || !email.trim() || !roleId || !projectId) return
    const fd = new FormData()
    fd.set('email', email.trim())
    fd.set('roleId', roleId)
    fd.set('projectId', projectId)

    startInvite(async () => {
      const res = await sendInvitation(fd)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success(d.inviteSuccess)
        setEmail('')
        loadData()
      }
    })
  }

  if (!loaded) {
    return (
      <SectionLoader text={loadingText} />
    )
  }

  return (
    <VHSTransition duration="fast" trigger className="space-y-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-mono text-sm font-semibold text-text">{d.title}</h2>
          <p className="font-mono text-[11px] text-muted/70">{d.subtitle}</p>
        </div>
        <DocLink href="/docs#rolesGuide" label={d.docsLinkLabel} desc={d.docsLinkDesc} />
      </div>

      {/* ── Invite form ──────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <p className="font-mono text-xs text-muted">{d.inviteLabel}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
          {/* Email */}
          <div className="flex flex-col gap-1 flex-1 min-w-44">
            <label className="font-mono text-[10px] text-muted/70 uppercase tracking-wider">{d.emailLabel}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={d.emailPlaceholder}
              disabled={isInviting || !canActions}
              className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          {/* Project selector — only when admin of multiple projects */}
          {projects.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] text-muted/70 uppercase tracking-wider">{d.projectLabel}</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={isInviting || !canActions}
                className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Role selector — exclude restricted, show translated names */}
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] text-muted/70 uppercase tracking-wider">{d.roleLabel}</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={isInviting || !canActions}
              className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {roles
                .filter((r) => r.name !== 'restricted')
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {d.builtInRoleLabels[r.name as keyof typeof d.builtInRoleLabels] ?? r.name}
                  </option>
                ))
              }
            </select>
          </div>
          {/* Invite button */}
          <button
            onClick={handleInvite}
            disabled={isInviting || !email.trim() || !roleId || !projectId || !canActions}
            className="rounded-md bg-primary px-4 py-2 font-mono text-xs text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed self-end"
          >
            {isInviting ? d.inviting : d.inviteButton}
          </button>
        </div>
      </div>

      {/* ── Current members ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-xs font-medium text-muted uppercase tracking-wide">
            {d.currentMembers}
          </p>
          <span className="font-mono text-[10px] text-muted">
            {members.length} {members.length === 1 ? d.memberSingular : d.memberPlural}
          </span>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 px-4">
          <MemberList
            members={members}
            roles={roles}
            currentUserId={userId}
            ownerId={ownerId}
            d={d}
            onRefresh={loadData}
          />
        </div>
      </div>

      {/* ── Pending invitations ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-xs font-medium text-muted uppercase tracking-wide">
            {d.pendingTitle}
          </p>
          {pending.length > 0 && (
            <span className="font-mono text-[10px] text-muted">{pending.length} {d.pending}</span>
          )}
        </div>
        <div className="rounded-lg border border-border bg-surface-2 px-4">
          <PendingInvitationList invites={pending} d={d} onRefresh={loadData} />
        </div>
      </div>
    </VHSTransition>
  )
}
