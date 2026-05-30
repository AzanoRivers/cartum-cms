'use client'

import { useEffect, useState, useTransition } from 'react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { DocLink } from '@/components/ui/atoms/DocLink'
import { SectionLoader } from '@/components/ui/atoms/SectionLoader'
import { useToast } from '@/lib/hooks/useToast'
import {
  listCartumProjects,
  deleteCartumProject,
  type CartumProjectRow,
} from '@/lib/actions/settings.actions'
import type { Dictionary } from '@/locales/en'

type Props = {
  d:           Dictionary['settings']['cartumProjects']
  loadingText: string
}

type ConfirmState = { project: CartumProjectRow; input: string } | null

export function CartumProjectsSection({ d, loadingText }: Props) {
  const [projects, setProjects]   = useState<CartumProjectRow[]>([])
  const [loaded, setLoaded]       = useState(false)
  const [confirm, setConfirm]     = useState<ConfirmState>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  useEffect(() => {
    listCartumProjects().then((res) => {
      if (res.success) setProjects(res.data)
      setLoaded(true)
    })
  }, [])

  function handleDeleteClick(proj: CartumProjectRow) {
    setConfirm({ project: proj, input: '' })
  }

  function handleConfirmDelete() {
    if (!confirm) return
    const projectId = confirm.project.id
    setDeletingId(projectId)
    setConfirm(null)
    startTransition(async () => {
      const res = await deleteCartumProject(projectId)
      setDeletingId(null)
      if (res.success) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId))
        toast.success(d.deleteSuccess)
      } else {
        toast.error(d.deleteError)
      }
    })
  }

  if (!loaded) return <SectionLoader text={loadingText} />

  return (
    <VHSTransition duration="fast" className="space-y-5">
      <div>
        <h2 className="font-mono text-sm font-semibold text-text">{d.title}</h2>
        <p className="mt-1 font-mono text-xs text-muted leading-relaxed">{d.subtitle}</p>
      </div>

      {projects.length === 0 ? (
        <p className="font-mono text-xs text-muted">{d.noProjects}</p>
      ) : (
        <div className="space-y-2">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-mono text-sm text-text truncate">{proj.name}</p>
                  <span className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-muted">
                    {proj.memberCount} {proj.memberCount === 1 ? d.memberSingular ?? 'member' : d.memberPlural ?? 'members'}
                  </span>
                  {/* Subscription badge */}
                  {(() => {
                    if (proj.ownerIsSuperAdmin) {
                      return (
                        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                          super_admin
                        </span>
                      )
                    }
                    const TRIAL_SECONDS = 7 * 86_400
                    const isActive = proj.ownerSuscriptor
                      && proj.ownerSuscriptorTime != null
                      && (proj.ownerSuscriptorTime + TRIAL_SECONDS) > Date.now() / 1000
                    return (
                      <span className={[
                        'shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px]',
                        isActive
                          ? 'border-warning/40 bg-warning/10 text-warning'
                          : 'border-muted/20 bg-surface text-muted/50',
                      ].join(' ')}>
                        {isActive ? d.subActive : d.subExpired}
                      </span>
                    )
                  })()}
                </div>
                <p className="font-mono text-[11px] text-muted flex items-center gap-1.5 flex-wrap">
                  <span className="truncate">{d.ownerLabel}: {proj.ownerEmail ?? '—'}</span>
                  {proj.ownerIsSuperAdmin && (
                    <span className="rounded-sm bg-primary/15 px-1 py-0.5 font-mono text-[10px] font-semibold text-primary leading-none shrink-0">
                      {d.roleSuperAdmin}
                    </span>
                  )}
                </p>
                <p className="font-mono text-[10px] text-muted/60">
                  {d.createdLabel}: {new Date(proj.createdAt).toLocaleDateString()}
                </p>
              </div>
              {/* Super admin projects cannot be deleted from this UI — deletion must be done at the DB level */}
              <button
                type="button"
                disabled={deletingId === proj.id || isPending || !!proj.ownerIsSuperAdmin}
                onClick={() => handleDeleteClick(proj)}
                title={proj.ownerIsSuperAdmin ? d.cannotDeleteSuperAdmin : undefined}
                className="shrink-0 rounded-md border border-danger/40 px-3 py-1.5 font-mono text-xs text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deletingId === proj.id ? d.deleting : d.deleteButton}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Note: super admin projects are protected — the button is disabled for them */}
      {projects.length > 0 && (
        <p className="font-mono text-[10px] text-muted/60 leading-relaxed">
          * {d.cannotDeleteSuperAdmin}
        </p>
      )}

      {/* Docs link */}
      <DocLink href="/cms/docs#multiProject" label={d.docsLinkLabel} desc={d.docsLinkDesc} />

      {/* Confirm dialog — estándar del proyecto: sin overlay, VHSTransition */}
      {confirm && (
        <>
          <div className="fixed inset-0 z-[60]" aria-hidden="true" onClick={() => setConfirm(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none px-4">
            <VHSTransition duration="fast" className="w-full max-w-sm">
              <div
                role="dialog"
                aria-modal="true"
                className="pointer-events-auto w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-0.5 w-full bg-danger" />
                <div className="px-5 pt-5 pb-4 space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="font-mono text-sm font-semibold text-text leading-snug">
                      {d.confirmDialog.title.replace('{name}', confirm.project.name)}
                    </h3>
                    <p className="font-mono text-[11px] leading-relaxed text-muted">
                      {d.confirmDialog.desc}
                    </p>
                  </div>
                  <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 font-mono text-xs text-warning">
                    {d.confirmDialog.superAdminNote}
                  </p>
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs text-muted">
                      {d.confirmDialog.placeholder}:{' '}
                      <span className="text-danger font-semibold">{d.confirmDialog.confirmPhrase}</span>
                    </label>
                    <input
                      autoFocus
                      value={confirm.input}
                      onChange={(e) => setConfirm((s) => s ? { ...s, input: e.target.value } : s)}
                      className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted/50 focus:border-danger/60 focus:outline-none focus:ring-1 focus:ring-danger/30"
                    />
                  </div>
                </div>
                <div className="mx-5 border-t border-border/40" />
                <div className="flex items-center justify-end gap-2 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    className="rounded-lg border border-border bg-surface-2 px-4 py-1.5 font-mono text-xs text-text hover:bg-surface hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    {d.confirmDialog.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={confirm.input !== d.confirmDialog.confirmPhrase}
                    onClick={handleConfirmDelete}
                    className="rounded-lg bg-danger px-4 py-1.5 font-mono text-xs font-semibold text-white hover:bg-danger/85 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {d.confirmDialog.confirm}
                  </button>
                </div>
              </div>
            </VHSTransition>
          </div>
        </>
      )}
    </VHSTransition>
  )
}
