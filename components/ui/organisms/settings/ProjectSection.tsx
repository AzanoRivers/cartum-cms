'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  listUserProjects,
  getProjectSettingsById,
  updateProjectSettingsById,
  deleteUserProject,
  type UserProjectRow,
} from '@/lib/actions/settings.actions'
import { useToast } from '@/lib/hooks/useToast'
import { SectionLoader } from '@/components/ui/atoms/SectionLoader'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { Dictionary } from '@/locales/en'
import type { ProjectSettings } from '@/types/settings'

export type ProjectSectionProps = {
  d:           Dictionary['settings']['project']
  loadingText: string
}

export function ProjectSection({ d, loadingText }: ProjectSectionProps) {
  // Project list
  const [projects, setProjects]           = useState<UserProjectRow[]>([])
  const [selectedId, setSelectedId]       = useState<string>('')
  const [listLoaded, setListLoaded]       = useState(false)

  // Edit form
  const [form, setForm]                   = useState<ProjectSettings>({ projectName: '', description: '', defaultLocale: 'en' })
  const [initialLocale, setInitialLocale] = useState<string>('')
  const [formLoaded, setFormLoaded]       = useState(false)
  const [isSaving, startSave]             = useTransition()

  // Delete confirm dialog
  const [showConfirm, setShowConfirm]     = useState(false)
  const [confirmInput, setConfirmInput]   = useState('')
  const [isDeleting, startDelete]         = useTransition()

  const toast = useToast()

  // Close confirm dialog on Escape
  useEffect(() => {
    if (!showConfirm) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowConfirm(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showConfirm])

  // Load project list on mount
  useEffect(() => {
    listUserProjects().then((res) => {
      if (res.success && res.data.projects.length > 0) {
        setProjects(res.data.projects)
        const current = res.data.currentProjectId ?? res.data.projects[0].id
        const exists  = res.data.projects.find((p) => p.id === current)
        setSelectedId(exists ? current : res.data.projects[0].id)
      }
      setListLoaded(true)
    })
  }, [])

  // Load form whenever selected project changes
  useEffect(() => {
    if (!selectedId) return
    setFormLoaded(false)
    getProjectSettingsById(selectedId).then((res) => {
      if (res.success) {
        setForm(res.data)
        setInitialLocale(res.data.defaultLocale)
      }
      setFormLoaded(true)
    })
  }, [selectedId])

  function handleChange(field: keyof ProjectSettings, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    startSave(async () => {
      const res = await updateProjectSettingsById(selectedId, form)
      if (res.success) {
        toast.success(d.saved)
        // Keep dropdown label in sync
        setProjects((prev) =>
          prev.map((p) => (p.id === selectedId ? { ...p, name: form.projectName } : p)),
        )
        if (form.defaultLocale !== initialLocale) {
          window.location.reload()
        } else {
          setInitialLocale(form.defaultLocale)
        }
      } else {
        toast.error(d.error)
      }
    })
  }

  function handleDeleteConfirm() {
    startDelete(async () => {
      const res = await deleteUserProject(selectedId)
      if (res.success) {
        toast.success(d.deleteSuccess)
        setShowConfirm(false)
        window.location.reload()
      } else if (res.error === 'CANNOT_DELETE_LAST_PROJECT') {
        toast.error(d.singleProjectWarning)
        setShowConfirm(false)
      } else {
        toast.error(d.deleteError)
      }
    })
  }

  if (!listLoaded) return <SectionLoader text={loadingText} />

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>
        <p className="font-mono text-sm text-text-muted">{d.noProjects}</p>
      </div>
    )
  }

  const isSingleProject = projects.length <= 1

  return (
    <div className="space-y-6">
      <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>

      {/* Project selector — only shown when there are multiple projects */}
      {projects.length > 1 && (
        <div className="space-y-1.5">
          <label className="block font-mono text-xs text-text-muted">{d.selectProject}</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Edit form */}
      {!formLoaded ? (
        <SectionLoader text={loadingText} />
      ) : (
        <>
          {/* Project name */}
          <div className="space-y-1.5">
            <label className="block font-mono text-xs text-text-muted">{d.projectName}</label>
            <input
              type="text"
              value={form.projectName}
              onChange={(e) => handleChange('projectName', e.target.value)}
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block font-mono text-xs text-text-muted">{d.description}</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              placeholder={d.descriptionPlaceholder}
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors resize-none"
            />
          </div>

          {/* Default locale */}
          <div className="space-y-1.5">
            <label className="block font-mono text-xs text-text-muted">{d.defaultLocale}</label>
            <select
              value={form.defaultLocale}
              onChange={(e) => handleChange('defaultLocale', e.target.value as 'en' | 'es')}
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors cursor-pointer"
            >
              <option value="en">{d.localeEn}</option>
              <option value="es">{d.localeEs}</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? d.saving : d.save}
            </button>
          </div>

          {/* Danger zone */}
          <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 p-4 space-y-3">
            <p className="font-mono text-xs text-danger uppercase tracking-widest">{d.dangerZone}</p>
            <p className="font-mono text-[11px] text-muted leading-relaxed">{d.dangerDesc}</p>
            <div className="flex items-center gap-4">
              {isSingleProject && (
                <p className="font-mono text-xs text-muted/60">{d.singleProjectWarning}</p>
              )}
              <button
                onClick={() => { setConfirmInput(''); setShowConfirm(true) }}
                disabled={isSingleProject}
                className="ml-auto rounded-md border border-danger/40 bg-transparent px-4 py-1.5 font-mono text-xs text-danger transition-colors hover:bg-danger/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {d.deleteProject}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirm dialog — same presentation as DeleteConfirmDialog (no dark backdrop) */}
      {showConfirm && (
        <>
          {/* Invisible click-away — no dark overlay */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setShowConfirm(false)}
          />

          {/* Floating panel */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <VHSTransition duration="fast" className="w-full max-w-md mx-4">
              <div
                role="alertdialog"
                aria-modal="true"
                className="pointer-events-auto relative w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Danger accent bar */}
                <div className="h-0.5 w-full bg-danger" />

                {/* Header */}
                <div className="px-5 pt-5 pb-0 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold text-text leading-snug">
                      {d.confirmDialog.title}
                    </p>
                    <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                      {d.confirmDialog.message}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer font-mono text-xs"
                    aria-label={d.confirmDialog.cancel}
                  >
                    ✕
                  </button>
                </div>

                {/* Divider */}
                <div className="mx-5 mt-4 border-t border-border/40" />

                {/* Input */}
                <div className="px-5 pt-4 pb-0 space-y-1.5">
                  <label className="block font-mono text-[11px] text-muted">
                    {d.confirmDialog.inputLabel}
                  </label>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    autoFocus
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-danger/60 focus:ring-1 focus:ring-danger/20 transition-colors"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 px-5 py-4">
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isDeleting}
                    className="rounded-lg border border-border bg-surface-2 px-4 py-1.5 font-mono text-xs text-text hover:bg-surface hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {d.confirmDialog.cancel}
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={confirmInput !== d.confirmDialog.confirmPhrase || isDeleting}
                    className="rounded-lg border border-danger/60 bg-danger px-4 py-1.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-danger/85 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isDeleting ? d.deleting : d.confirmDialog.confirm}
                  </button>
                </div>
              </div>
            </VHSTransition>
          </div>
        </>
      )}
    </div>
  )
}
