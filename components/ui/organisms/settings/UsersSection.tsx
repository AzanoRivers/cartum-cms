'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  listAllUsersAdmin,
  banUserAction,
  unbanUserAction,
  removeUser,
  grantSubscriptionAction,
  revokeSubscriptionAction,
  type GlobalUserRow,
} from '@/lib/actions/settings.actions'
import { Clock } from 'lucide-react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { useToast } from '@/lib/hooks/useToast'
import { SectionLoader } from '@/components/ui/atoms/SectionLoader'
import type { Dictionary } from '@/locales/en'

export type UsersSectionProps = {
  currentUserId: string
  isSuperAdmin:  boolean
  isAdmin:       boolean
  d:             Dictionary['settings']['users']
  loadingText:   string
}

const TRIAL_SECONDS = 7 * 86_400
const MONTH_OPTIONS = [1, 3, 6, 12] as const

function daysLeft(user: GlobalUserRow): number {
  const now = Date.now() / 1000
  return Math.max(0, Math.floor((user.cartumSuscriptorTime + TRIAL_SECONDS - now) / 86_400))
}

function subIsActive(user: GlobalUserRow): boolean {
  return user.cartumSuscriptor && daysLeft(user) > 0
}

type ModalKind =
  | { type: 'ban';   user: GlobalUserRow }
  | { type: 'unban'; user: GlobalUserRow }
  | { type: 'delete'; user: GlobalUserRow }
  | { type: 'sub';   user: GlobalUserRow; months: number }
  | { type: 'revokeSub'; user: GlobalUserRow }
  | null

// ── Inline VHS modal — project convention (no overlay) ────────────────────────
function InlineModal({
  title, desc, confirmLabel, cancelLabel, destructive, onConfirm, onCancel, children,
}: {
  title:        string
  desc:         string
  confirmLabel: string
  cancelLabel:  string
  destructive?: boolean
  onConfirm:    () => void
  onCancel:     () => void
  children?:    React.ReactNode
}) {
  return (
    <>
      <div className="fixed inset-0 z-60" aria-hidden onClick={onCancel} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none p-4">
        <VHSTransition duration="fast" className="w-full max-w-sm pointer-events-auto">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`h-0.5 w-full ${destructive ? 'bg-danger' : 'bg-accent'}`} />
            <div className="px-5 py-5 space-y-4">
              <div className="space-y-1">
                <h3 className="font-mono text-sm font-semibold text-text">{title}</h3>
                <p className="font-mono text-xs text-muted leading-relaxed">{desc}</p>
              </div>
              {children}
              <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
                <button
                  onClick={onCancel}
                  className="rounded-lg border border-border bg-surface-2 px-4 py-1.5 font-mono text-xs text-text hover:bg-surface hover:border-primary/40 transition-colors cursor-pointer"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`rounded-lg px-4 py-1.5 font-mono text-xs font-semibold text-white transition-colors cursor-pointer ${
                    destructive ? 'bg-danger hover:bg-danger/85' : 'bg-primary hover:bg-primary/85'
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </VHSTransition>
      </div>
    </>
  )
}

type SortKey = 'email' | 'createdAt' | 'createdAtDesc' | 'subDays' | 'projects' | 'owned'

export function UsersSection({ currentUserId, d, loadingText }: UsersSectionProps) {
  const [userList, setUserList] = useState<GlobalUserRow[]>([])
  const [loaded, setLoaded]     = useState(false)
  const [modal, setModal]       = useState<ModalKind>(null)
  const [search, setSearch]     = useState('')
  const [sortKey, setSortKey]   = useState<SortKey>('email')
  const [, startAction]         = useTransition()
  const toast = useToast()

  useEffect(() => {
    listAllUsersAdmin().then((r) => {
      if (r.success) setUserList(r.data)
      setLoaded(true)
    })
  }, [])

  function close() { setModal(null) }

  function handleConfirm() {
    if (!modal) return

    startAction(async () => {
      if (modal.type === 'ban') {
        const res = await banUserAction(modal.user.id)
        if (res.success) {
          setUserList((p) => p.map((u) => u.id === modal.user.id ? { ...u, isBanned: true } : u))
          toast.success(d.banSuccess)
        } else toast.error(res.error ?? 'Error')

      } else if (modal.type === 'unban') {
        const res = await unbanUserAction(modal.user.id)
        if (res.success) {
          setUserList((p) => p.map((u) => u.id === modal.user.id ? { ...u, isBanned: false } : u))
          toast.success(d.unbanSuccess)
        } else toast.error(res.error ?? 'Error')

      } else if (modal.type === 'delete') {
        const res = await removeUser(modal.user.id)
        if (res.success) {
          setUserList((p) => p.filter((u) => u.id !== modal.user.id))
          toast.success(d.deleteSuccess)
        } else toast.error(d.deleteError)

      } else if (modal.type === 'sub') {
        const res = await grantSubscriptionAction(modal.user.id, modal.months)
        if (res.success) {
          const nowSec = Math.floor(Date.now() / 1000)
          const newTime = nowSec + modal.months * 30 * 86_400 - TRIAL_SECONDS
          setUserList((p) => p.map((u) =>
            u.id === modal.user.id ? { ...u, cartumSuscriptor: true, cartumSuscriptorTime: newTime } : u,
          ))
          toast.success(d.grantSubSuccess)
        } else toast.error(d.grantSubError)

      } else if (modal.type === 'revokeSub') {
        const res = await revokeSubscriptionAction(modal.user.id)
        if (res.success) {
          setUserList((p) => p.map((u) =>
            u.id === modal.user.id ? { ...u, cartumSuscriptor: false, cartumSuscriptorTime: 0 } : u,
          ))
          toast.success(d.revokeSubSuccess)
        } else toast.error(d.grantSubError)
      }

      close()
    })
  }

  if (!loaded) return <SectionLoader text={loadingText} />

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'email',        label: d.sortEmail     },
    { key: 'createdAt',    label: d.sortCreated   },
    { key: 'createdAtDesc',label: d.sortNewest    },
    { key: 'subDays',      label: d.sortSub       },
    { key: 'projects',     label: d.sortProjects  },
    { key: 'owned',        label: d.sortOwned     },
  ]

  const filtered = userList
    .filter((u) => !search || u.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === 'email')         return a.email.localeCompare(b.email)
      if (sortKey === 'createdAt')     return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortKey === 'createdAtDesc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortKey === 'subDays')       return daysLeft(b) - daysLeft(a)
      if (sortKey === 'projects')      return b.projectCount - a.projectCount
      if (sortKey === 'owned')         return b.ownedCount - a.ownedCount
      return 0
    })

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest flex items-center gap-2">
          {d.title}
          <span className="font-mono text-[8px] text-warning/70 border border-warning/30 rounded px-1.5 py-px leading-none normal-case tracking-normal">super</span>
        </h2>
        <p className="font-mono text-[10px] text-muted/60">{d.subtitle}</p>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={d.filterSearch}
          className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs text-text placeholder:text-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[10px] text-muted/60">{d.filterSortLabel}:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-border bg-surface-2 px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-primary/60 transition-colors cursor-pointer"
          >
            {sortOptions.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {userList.length === 0 ? (
        <p className="font-mono text-xs text-muted/50">{d.empty}</p>
      ) : filtered.length === 0 ? (
        <p className="font-mono text-xs text-muted/50">{d.noResults}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => {
            const isYou  = user.id === currentUserId
            const active = subIsActive(user)
            const days   = daysLeft(user)

            return (
              <div
                key={user.id}
                className={[
                  'rounded-md border p-3 transition-colors',
                  user.isBanned
                    ? 'border-danger/30 bg-danger/5'
                    : 'border-border/50 bg-surface-2/30',
                ].join(' ')}
              >
                {/* Top row: avatar + email + badges */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-mono text-[10px] text-muted uppercase">
                    {user.email.slice(0, 2)}
                  </div>
                  <span className="flex-1 min-w-0 truncate font-mono text-xs text-text">
                    {user.email}
                    {isYou && <span className="ml-1.5 text-muted/50">{d.youLabel}</span>}
                  </span>
                  {user.isSuperAdmin && (
                    <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary">super_admin</span>
                  )}
                  {user.isBanned && (
                    <span className="shrink-0 rounded-full border border-danger/40 bg-danger/10 px-1.5 py-0.5 font-mono text-[9px] text-danger">{d.bannedBadge}</span>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap pl-9">
                  <span className="font-mono text-[10px] text-muted/60">
                    {d.colCreated}: <span className="text-muted">{new Date(user.createdAt).toLocaleDateString()}</span>
                  </span>
                  <span className="font-mono text-[10px] text-muted/60">
                    {d.colProjects}: <span className="text-muted">{user.projectCount}</span>
                  </span>
                  <span className="font-mono text-[10px] text-muted/60">
                    {d.colOwned}: <span className="text-muted">{user.ownedCount}</span>
                  </span>
                  {!user.isSuperAdmin && (
                    <span className={`font-mono text-[10px] flex items-center gap-1 ${active ? 'text-success' : 'text-muted/40'}`}>
                      {active ? `⏱ ${days}d` : <><Clock size={10} className="shrink-0" />{d.subExpired}</>}
                    </span>
                  )}
                </div>

                {/* Action buttons — real buttons, bigger on mobile */}
                {!isYou && !user.isSuperAdmin && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pl-9">
                    <button
                      onClick={() => setModal({ type: 'sub', user, months: 1 })}
                      className="flex-1 sm:flex-none rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs text-accent hover:bg-accent/20 transition-colors cursor-pointer"
                    >
                      {d.grantSubLabel}
                    </button>
                    <button
                      onClick={() => setModal({ type: user.isBanned ? 'unban' : 'ban', user })}
                      className={[
                        'flex-1 sm:flex-none rounded-md border px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer',
                        user.isBanned
                          ? 'border-success/40 bg-success/10 text-success hover:bg-success/20'
                          : 'border-warning/40 bg-warning/10 text-warning hover:bg-warning/20',
                      ].join(' ')}
                    >
                      {user.isBanned ? d.unbanButton : d.banButton}
                    </button>
                    <button
                      onClick={() => setModal({ type: 'delete', user })}
                      className="flex-1 sm:flex-none rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 font-mono text-xs text-danger hover:bg-danger/20 transition-colors cursor-pointer"
                    >
                      {d.deleteButton}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {modal?.type === 'ban' && (
        <InlineModal
          title={d.banConfirmTitle}
          desc={d.banConfirmDesc}
          confirmLabel={d.banButton}
          cancelLabel="Cancel"
          destructive
          onConfirm={handleConfirm}
          onCancel={close}
        />
      )}

      {modal?.type === 'unban' && (
        <InlineModal
          title={d.unbanConfirmTitle}
          desc={d.unbanConfirmDesc}
          confirmLabel={d.unbanButton}
          cancelLabel="Cancel"
          onConfirm={handleConfirm}
          onCancel={close}
        />
      )}

      {modal?.type === 'delete' && (
        <InlineModal
          title={d.deleteConfirmTitle}
          desc={`${modal.user.email} — ${d.deleteConfirmDesc}`}
          confirmLabel={d.deleteButton}
          cancelLabel="Cancel"
          destructive
          onConfirm={handleConfirm}
          onCancel={close}
        />
      )}

      {modal?.type === 'revokeSub' && (
        <InlineModal
          title={d.revokeSubConfirmTitle}
          desc={d.revokeSubConfirmDesc}
          confirmLabel={d.revokeSubButton}
          cancelLabel="Cancel"
          destructive
          onConfirm={handleConfirm}
          onCancel={close}
        />
      )}

      {modal?.type === 'sub' && (
        <InlineModal
          title={d.grantSubTitle}
          desc={modal.user.email}
          confirmLabel={d.grantSubButton}
          cancelLabel="Cancel"
          onConfirm={handleConfirm}
          onCancel={close}
        >
          {/* Month selector */}
          <div className="grid grid-cols-4 gap-2">
            {MONTH_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModal({ ...modal, months: m })}
                className={[
                  'rounded-md border py-2 font-mono text-xs transition-colors cursor-pointer',
                  modal.months === m
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border text-muted hover:text-text hover:border-border/80',
                ].join(' ')}
              >
                {d.grantSubMonths.replace('{n}', String(m))}
              </button>
            ))}
          </div>
          {/* Revoke option if subscription active */}
          {subIsActive(modal.user) && (
            <button
              type="button"
              onClick={() => setModal({ type: 'revokeSub', user: modal.user })}
              className="w-full text-left font-mono text-[10px] text-danger/70 hover:text-danger transition-colors cursor-pointer mt-1"
            >
              {d.revokeSubButton} →
            </button>
          )}
        </InlineModal>
      )}
    </div>
  )
}
