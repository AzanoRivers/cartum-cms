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
}

export function MembersSection({ userId, isSuperAdmin, isAdmin, d, loadingText }: Props) {
  const [members,   setMembers]   = useState<MemberRow[]>([])
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
    setMembers(m as MemberRow[])
    setPending(p as PendingInviteRow[])
    setRoles(r)
    setProjects(proj)
    if (r.length && !roleId)    setRoleId(r[0]!.id)
    if (proj.length && !projectId) setProjectId(proj[0]!.id)
    setLoaded(true)
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleInvite() {
    if (!email.trim() || !roleId || !projectId) return
    const fd = new FormData()
    fd.set('email', email.trim())
    fd.set('roleId', roleId)
    fd.set('projectId', projectId)

    startInvite(async () => {
      const res = await sendInvitation(fd)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success('Invitation sent.')
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
      <div className="space-y-1">
        <h2 className="font-mono text-sm font-semibold text-text">{d.title}</h2>
        <p className="font-mono text-[11px] text-muted/70">{d.subtitle}</p>
      </div>

      {/* ── Invite form ──────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <p className="font-mono text-xs text-muted">{d.inviteLabel}</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={d.emailPlaceholder}
            disabled={isInviting}
            className="flex-1 min-w-44 rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
          />
          {projects.length > 1 && (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={isInviting}
              className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            disabled={isInviting}
            className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 cursor-pointer"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            onClick={handleInvite}
            disabled={isInviting || !email.trim() || !roleId || !projectId}
            className="rounded-md bg-primary px-4 py-2 font-mono text-xs text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
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
          <PendingInvitationList invites={pending} onRefresh={loadData} />
        </div>
      </div>
    </VHSTransition>
  )
}
