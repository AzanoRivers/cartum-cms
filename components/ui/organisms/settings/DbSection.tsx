'use client'

import { useRef, useState, useTransition } from 'react'
import { Download, Upload, Trash2 } from 'lucide-react'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { DangerResetDialog } from '@/components/ui/molecules/DangerResetDialog'
import { exportDatabaseAction, importDatabaseAction, resetCmsAction } from '@/lib/actions/db.actions'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/lib/stores/uiStore'
import { toast } from 'sonner'
import type { Dictionary } from '@/locales/en'

export type DbSectionProps = {
  d: Dictionary['settings']['db']
}

export function DbSection({ d }: DbSectionProps) {
  const router  = useRouter()
  const setGlobalLoading = useUIStore((s) => s.setGlobalLoading)

  const [isExporting,  startExport]  = useTransition()
  const [isImporting,  startImport]  = useTransition()
  const [isResetting,  startReset]   = useTransition()
  const [showResetDialog, setShowResetDialog] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Export ──────────────────────────────────────────────────────────────────
  function handleExport() {
    startExport(async () => {
      const res = await exportDatabaseAction()
      if (!res.success) {
        toast.error(d.exportError)
        return
      }
      const blob = new Blob([res.data.json], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = res.data.filename
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    startImport(async () => {
      let parsed: unknown
      try {
        const text = await file.text()
        parsed = JSON.parse(text)
      } catch {
        toast.error(d.importError)
        return
      }

      const res = await importDatabaseAction(parsed)
      if (!res.success) {
        toast.error(d.importError)
        return
      }
      toast.success(d.importSuccess)
    })
  }

  // ── Reset ───────────────────────────────────────────────────────────────────
  function handleResetConfirm() {
    setShowResetDialog(false)
    setGlobalLoading(true)
    startReset(async () => {
      const res = await resetCmsAction()
      if (!res.success) {
        setGlobalLoading(false)
        toast.error(d.resetError)
        return
      }
      // Clear all transient UI state so nothing bleeds through into the next session
      useUIStore.setState({
        settingsOpen:     false,
        helpOpen:         false,
        creationPanelOpen: false,
        editingFieldId:   null,
      })
      router.replace('/setup/locale')
    })
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest mb-4">
          {d.title}
        </h2>
      </div>

      {/* ── Block A: Export ────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Download size={16} className="mt-0.5 text-muted shrink-0" strokeWidth={1.8} />
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-xs font-bold text-text uppercase tracking-wider mb-1">
              {d.exportTitle}
            </h3>
            <p className="font-mono text-xs text-muted leading-relaxed">
              {d.exportDesc}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 h-8 rounded-md bg-primary/10 border border-primary/30 px-4 font-mono text-xs text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isExporting ? (
            <Spinner size="sm" color="primary" />
          ) : (
            <Download size={12} strokeWidth={2} />
          )}
          {isExporting ? d.exporting : d.exportButton}
        </button>
      </div>

      {/* ── Block B: Import ────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Upload size={16} className="mt-0.5 text-muted shrink-0" strokeWidth={1.8} />
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-xs font-bold text-text uppercase tracking-wider mb-1">
              {d.importTitle}
            </h3>
            <p className="font-mono text-xs text-muted leading-relaxed">
              {d.importDesc}
            </p>
          </div>
        </div>

        {/* Overwrite warning */}
        <div className="rounded-md border border-warning/20 bg-warning/5 px-3 py-2">
          <p className="font-mono text-xs text-warning/80 leading-relaxed">
            ⚠ {d.importOverwriteWarn}
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="sr-only"
          onChange={handleFileChange}
          aria-label={d.importButton}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="flex items-center gap-2 h-8 rounded-md border border-border px-4 font-mono text-xs text-muted hover:text-text hover:border-border/80 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isImporting ? (
            <Spinner size="sm" color="muted" />
          ) : (
            <Upload size={12} strokeWidth={2} />
          )}
          {isImporting ? d.importing : d.importButton}
        </button>
      </div>

      {/* ── Block C: Danger zone ───────────────────────────────────────────── */}
      <div className="rounded-lg border border-danger/20 bg-danger/5 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Trash2 size={16} className="mt-0.5 text-danger shrink-0" strokeWidth={1.8} />
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-xs font-bold text-danger uppercase tracking-wider mb-1">
              {d.dangerTitle}
            </h3>
            <p className="font-mono text-xs text-muted leading-relaxed">
              {d.dangerDesc}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowResetDialog(true)}
          disabled={isResetting}
          className="flex items-center gap-2 h-8 rounded-md bg-danger/10 border border-danger/30 px-4 font-mono text-xs text-danger hover:bg-danger/20 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Trash2 size={12} strokeWidth={2} />
          {d.dangerButton}
        </button>
      </div>

      {/* ── Danger reset dialog ────────────────────────────────────────────── */}
      {showResetDialog && (
        <DangerResetDialog
          d={d.resetDialog}
          isPending={isResetting}
          onConfirm={() => {
            setShowResetDialog(false)
            handleResetConfirm()
          }}
          onCancel={() => setShowResetDialog(false)}
        />
      )}
    </section>
  )
}
