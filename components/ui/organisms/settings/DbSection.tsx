'use client'

import { useRef, useState, useTransition } from 'react'
import { Download, Upload, Trash2, Archive } from 'lucide-react'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { DangerResetDialog } from '@/components/ui/molecules/DangerResetDialog'
import { exportDatabaseAction, importDatabaseAction, resetCmsAction } from '@/lib/actions/db.actions'
import { signOut } from 'next-auth/react'
import { useUIStore } from '@/lib/stores/uiStore'
import { toast } from 'sonner'
import type { Dictionary } from '@/locales/en'

export type DbSectionProps = {
  d:            Dictionary['settings']['db']
  isSuperAdmin: boolean
}

export function DbSection({ d, isSuperAdmin }: DbSectionProps) {
  const setGlobalLoading = useUIStore((s) => s.setGlobalLoading)

  const [isExporting,       startExport]       = useTransition()
  const [isExportingMedia,  startExportMedia]  = useTransition()
  const [isImporting,       startImport]       = useTransition()
  const [isResetting,       startReset]        = useTransition()
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

  function handleExportWithMedia() {
    startExportMedia(async () => {
      // 1. Fetch backup JSON via Server Action (only DB query hits Vercel)
      const res = await exportDatabaseAction()
      if (!res.success) { toast.error(d.exportError); return }

      const backup    = JSON.parse(res.data.json) as { media?: Array<{ publicUrl: string; mimeType: string; key: string; id: string }> }
      const mediaList = backup.media ?? []

      // 2. Fetch media files directly from R2 / Blob — browser → storage, no Vercel hop for R2
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
            } catch { /* CORS not configured on R2 bucket, or file unreachable — skip */ }
          }),
        )
      }

      // 3. Build and download ZIP entirely in browser
      const zipped = zipSync(files, { level: 0 }) // level 0 = store-only, fastest (media already compressed)
      const zipBlob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' })
      const url     = URL.createObjectURL(zipBlob)
      const a       = document.createElement('a')
      a.href        = url
      a.download    = `cartum-full-backup-${new Date().toISOString().slice(0, 10)}.zip`
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

      // Show purge summary before redirecting
      if (res.data?.storagePurge) {
        const { deleted, failed, r2Orphans, blobOrphans } = res.data.storagePurge
        const summary = d.resetDialog.purgedSummary
          .replace('{deleted}', String(deleted))
          .replace('{failed}',  String(failed))
        toast.success(summary)
        if (failed > 0) {
          toast.warning(d.resetDialog.purgeFailWarn.replace('{failed}', String(failed)))
        }
        const orphans = r2Orphans + blobOrphans
        if (orphans > 0) {
          toast.info(`Storage sweep: ${orphans} orphan file(s) removed.`)
        }
      }

      // Clear all transient UI state so nothing bleeds through into the next session
      useUIStore.setState({
        settingsOpen:     false,
        helpOpen:         false,
        creationPanelOpen: false,
        editingFieldId:   null,
      })
      // signOut posts to /api/auth/signout → browser receives expired Set-Cookie headers
      // guaranteeing the stale JWT is cleared before the next session begins
      await signOut({ callbackUrl: '/setup/locale' })
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || isExportingMedia}
            className="inline-flex items-center gap-2 min-h-8 rounded-md bg-primary/10 border border-primary/30 px-4 py-1.5 font-mono text-xs text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isExporting ? (
              <Spinner size="sm" color="primary" />
            ) : (
              <Download size={12} strokeWidth={2} />
            )}
            {isExporting ? d.exporting : d.exportButton}
          </button>

          <button
            type="button"
            onClick={handleExportWithMedia}
            disabled={isExporting || isExportingMedia}
            className="inline-flex items-center gap-2 min-h-8 rounded-md bg-accent/10 border border-accent/30 px-4 py-1.5 font-mono text-xs text-accent hover:bg-accent/20 disabled:opacity-50 transition-colors cursor-pointer"
            title={d.exportWithMediaNote}
          >
            {isExportingMedia ? (
              <Spinner size="sm" color="accent" />
            ) : (
              <Archive size={12} strokeWidth={2} />
            )}
            {isExportingMedia ? d.exportWithMediaing : d.exportWithMediaButton}
          </button>
        </div>
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
          className="inline-flex items-center gap-2 min-h-8 rounded-md border border-border px-4 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 disabled:opacity-50 transition-colors cursor-pointer"
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
      {isSuperAdmin && (
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
          className="inline-flex items-center gap-2 min-h-8 rounded-md bg-danger/10 border border-danger/30 px-4 py-1.5 font-mono text-xs text-danger hover:bg-danger/20 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Trash2 size={12} strokeWidth={2} />
          {d.dangerButton}
        </button>
      </div>
      )}

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
