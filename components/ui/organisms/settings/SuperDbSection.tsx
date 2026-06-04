'use client'

import { useRef, useState, useTransition } from 'react'
import { Download, Upload, Trash2, Archive } from 'lucide-react'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { DangerResetDialog } from '@/components/ui/molecules/DangerResetDialog'
import { exportDatabaseAction, importDatabaseAction, resetCmsAction } from '@/lib/actions/db.actions'
import { DocLink } from '@/components/ui/atoms/DocLink'
import { useUIStore } from '@/lib/stores/uiStore'
import { toast } from 'sonner'
import type { Dictionary } from '@/locales/en'

export type SuperDbSectionProps = {
  d:           Dictionary['settings']['superDb']
  canActions?: boolean
}

export function SuperDbSection({ d, canActions = true }: SuperDbSectionProps) {
  const setGlobalLoading = useUIStore((s) => s.setGlobalLoading)

  const [isExporting,      startExport]      = useTransition()
  const [isExportingMedia, startExportMedia] = useTransition()
  const [isImporting,      startImport]      = useTransition()
  const [isResetting,      startReset]       = useTransition()
  const [showResetDialog,  setShowResetDialog] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Full export ─────────────────────────────────────────────────────────────
  function handleExport() {
    if (!canActions) return
    startExport(async () => {
      const res = await exportDatabaseAction()
      if (!res.success) { toast.error(d.exportError); return }
      const blob = new Blob([res.data.json], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = res.data.filename
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  function handleExportWithMedia() {
    if (!canActions) return
    startExportMedia(async () => {
      const res = await exportDatabaseAction()
      if (!res.success) { toast.error(d.exportError); return }

      const backup    = JSON.parse(res.data.json) as { media?: Array<{ publicUrl: string; mimeType: string; key: string; id: string }> }
      const mediaList = backup.media ?? []

      const { zipSync, strToU8 } = await import('fflate')
      const files: Record<string, Uint8Array> = {
        'database.json': strToU8(res.data.json),
      }

      const CONCURRENCY = 6
      for (let i = 0; i < mediaList.length; i += CONCURRENCY) {
        await Promise.all(
          mediaList.slice(i, i + CONCURRENCY).map(async (m) => {
            try {
              const r = await fetch(m.publicUrl)
              if (!r.ok) return
              const buf      = await r.arrayBuffer()
              const folder   = m.mimeType?.startsWith('video/') ? 'videos' : 'images'
              const filename = m.key.split('/').pop() ?? m.id
              files[`${folder}/${filename}`] = new Uint8Array(buf)
            } catch { /* file unreachable or CORS not configured — skip */ }
          }),
        )
      }

      const zipped  = zipSync(files, { level: 0 })
      const zipBlob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' })
      const url     = URL.createObjectURL(zipBlob)
      const a       = document.createElement('a')
      a.href        = url
      a.download    = `cartum-super-backup-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  // ── Full import ─────────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!canActions) return
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
      if (!res.success) { toast.error(d.importError); return }
      toast.success(d.importSuccess)
    })
  }

  // ── Danger: reset full CMS ──────────────────────────────────────────────────
  function handleResetConfirm() {
    if (!canActions) return
    setShowResetDialog(false)
    setGlobalLoading(true)
    startReset(async () => {
      const res = await resetCmsAction()
      if (!res.success) {
        setGlobalLoading(false)
        toast.error(d.resetError)
        return
      }

      if (res.data?.storagePurge) {
        const { deleted, failed, r2Orphans, blobOrphans } = res.data.storagePurge
        toast.success(
          d.resetDialog.purgedSummary
            .replace('{deleted}', String(deleted))
            .replace('{failed}',  String(failed)),
        )
        if (failed > 0) {
          toast.warning(d.resetDialog.purgeFailWarn.replace('{failed}', String(failed)))
        }
        const orphans = r2Orphans + blobOrphans
        if (orphans > 0) toast.info(`Storage sweep: ${orphans} orphan file(s) removed.`)
      }

      try { localStorage.clear() } catch { /* sandboxed */ }
      window.location.replace('/setup/locale')
    })
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
          {d.title}
          <span className="font-mono text-[8px] text-warning/70 border border-warning/30 rounded px-1.5 py-px leading-none normal-case tracking-normal">super</span>
        </h2>
        <p className="font-mono text-xs text-muted leading-relaxed">
          {d.subtitle}
        </p>
        <DocLink href="/docs#importExport" label={d.docsLinkLabel} desc={d.docsLinkDesc} />
      </div>

      {/* ── Block A: Super Export ──────────────────────────────────────────── */}
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || isExportingMedia || !canActions}
            className="inline-flex items-center gap-2 min-h-8 rounded-md bg-primary/10 border border-primary/30 px-4 py-1.5 font-mono text-xs text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isExporting ? <Spinner size="sm" color="primary" /> : <Download size={12} strokeWidth={2} />}
            {isExporting ? d.exporting : d.exportButton}
          </button>

          <button
            type="button"
            onClick={handleExportWithMedia}
            disabled={isExporting || isExportingMedia || !canActions}
            className="inline-flex items-center gap-2 min-h-8 rounded-md bg-accent/10 border border-accent/30 px-4 py-1.5 font-mono text-xs text-accent hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title={d.exportWithMediaNote}
          >
            {isExportingMedia ? <Spinner size="sm" color="accent" /> : <Archive size={12} strokeWidth={2} />}
            {isExportingMedia ? d.exportWithMediaing : d.exportWithMediaButton}
          </button>
        </div>
      </div>

      {/* ── Block B: Super Import ──────────────────────────────────────────── */}
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

        <div className="rounded-md border border-warning/20 bg-warning/5 px-3 py-2">
          <p className="font-mono text-xs text-warning/80 leading-relaxed">
            ⚠ {d.importOverwriteWarn}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="sr-only"
          onChange={handleFileChange}
          aria-label={d.importButton}
          disabled={isImporting || !canActions}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting || !canActions}
          className="inline-flex items-center gap-2 min-h-8 rounded-md border border-border px-4 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {isImporting ? <Spinner size="sm" color="muted" /> : <Upload size={12} strokeWidth={2} />}
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
          disabled={isResetting || !canActions}
          className="inline-flex items-center gap-2 min-h-8 rounded-md bg-danger/10 border border-danger/30 px-4 py-1.5 font-mono text-xs text-danger hover:bg-danger/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Trash2 size={12} strokeWidth={2} />
          {d.dangerButton}
        </button>
      </div>

      {showResetDialog && (
        <DangerResetDialog
          d={d.resetDialog}
          isPending={isResetting}
          onConfirm={() => { setShowResetDialog(false); handleResetConfirm() }}
          onCancel={() => setShowResetDialog(false)}
        />
      )}
    </section>
  )
}
