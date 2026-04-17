'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { MediaUploadZone } from '@/components/ui/organisms/MediaUploadZone'
import type { UploadEntry } from '@/lib/hooks/useMediaGallery'

export type MediaUploadModalProps = {
  open:           boolean
  onClose:        () => void
  // upload zone passthrough
  queue:          UploadEntry[]
  dragging:       boolean
  onFiles:        (files: FileList) => void
  onRemove:       (id: string) => void
  onStartUpload:  (entry: UploadEntry) => void
  onCancel?:      (id: string) => void
  onDragOver:     (e: React.DragEvent) => void
  onDragLeave:    () => void
  onDrop:         (e: React.DragEvent) => void
  // labels
  title:               string
  dropHereLabel:       string
  orClickLabel:        string
  uploadBtnLabel:      string
  optimizingLabel:     string
  uploadingLabel:      string
  errorLabel:          string
  successLabel:        string
  estimatedTimeLabel:  string
  videoUploadWarning?: string
  imageUploadWarning?: string
  // close-confirmation labels (shown when active uploads exist)
  cancelConfirmTitle:  string
  cancelConfirmDesc:   string
  cancelConfirmYes:    string
  cancelConfirmNo:     string
}

export function MediaUploadModal({
  open,
  onClose,
  queue,
  dragging,
  onFiles,
  onRemove,
  onStartUpload,
  onCancel,
  onDragOver,
  onDragLeave,
  onDrop,
  title,
  dropHereLabel,
  orClickLabel,
  uploadBtnLabel,
  optimizingLabel,
  uploadingLabel,
  errorLabel,
  successLabel,
  estimatedTimeLabel,
  videoUploadWarning,
  imageUploadWarning,
  cancelConfirmTitle,
  cancelConfirmDesc,
  cancelConfirmYes,
  cancelConfirmNo,
}: MediaUploadModalProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleClose() {
    const hasActive = queue.some(
      (e) => e.status === 'uploading' || e.status === 'optimizing',
    )
    if (hasActive) {
      setConfirmOpen(true)
    } else {
      onClose()
    }
  }

  function handleConfirmClose() {
    setConfirmOpen(false)
    onClose()
  }

  // ESC: if confirm is open, dismiss confirm; otherwise attempt close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (confirmOpen) { setConfirmOpen(false) } else { handleClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, confirmOpen, queue])

  if (!open) return null

  return createPortal(
    <>
      {/* ── Main upload modal ─────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
      >
        <VHSTransition
          duration="fast"
          className="flex w-full sm:max-w-xl flex-col rounded-t-2xl sm:rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 overflow-hidden max-h-[90dvh] sm:max-h-[80vh]"
        >
          {/* Handle — mobile only */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3 shrink-0">
            <span className="font-mono text-sm text-text">{title}</span>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Upload zone */}
          <div className="flex-1 min-h-0 p-5 flex flex-col overflow-hidden">
            <MediaUploadZone
              queue={queue}
              dragging={dragging}
              onFiles={onFiles}
              onRemove={onRemove}
              onStartUpload={onStartUpload}
              onCancel={onCancel}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              dropHereLabel={dropHereLabel}
              orClickLabel={orClickLabel}
              uploadBtnLabel={uploadBtnLabel}
              optimizingLabel={optimizingLabel}
              uploadingLabel={uploadingLabel}
              errorLabel={errorLabel}
              successLabel={successLabel}
              estimatedTimeLabel={estimatedTimeLabel}
              videoUploadWarning={videoUploadWarning}
              imageUploadWarning={imageUploadWarning}
            />
          </div>
        </VHSTransition>
      </div>

      {/* ── Close-confirmation dialog (on top of modal) ───────────────── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
          <VHSTransition duration="fast" className="w-full max-w-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="upload-cancel-title"
              aria-describedby="upload-cancel-desc"
              className="relative w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Accent bar — danger (destructive action) */}
              <div className="h-0.5 w-full bg-danger" />

              <div className="px-5 pt-5 pb-4 space-y-1.5">
                <h2
                  id="upload-cancel-title"
                  className="font-mono text-sm font-semibold text-text leading-snug"
                >
                  {cancelConfirmTitle}
                </h2>
                <p
                  id="upload-cancel-desc"
                  className="font-mono text-[11px] leading-relaxed text-muted"
                >
                  {cancelConfirmDesc}
                </p>
              </div>

              <div className="mx-5 border-t border-border/40" />

              <div className="flex items-center justify-end gap-2 px-5 py-4">
                <button
                  autoFocus
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-lg border border-border bg-surface-2 px-4 py-1.5 font-mono text-xs text-text hover:bg-surface hover:border-primary/40 transition-colors cursor-pointer"
                >
                  {cancelConfirmNo}
                </button>
                <button
                  onClick={handleConfirmClose}
                  className="rounded-lg px-4 py-1.5 font-mono text-xs font-semibold text-white transition-colors cursor-pointer bg-danger hover:bg-danger/85 border border-danger/60"
                >
                  {cancelConfirmYes}
                </button>
              </div>
            </div>
          </VHSTransition>
        </div>
      )}
    </>,
    document.body,
  )
}
