'use client'

import { useEffect } from 'react'
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
  onDragOver:     (e: React.DragEvent) => void
  onDragLeave:    () => void
  onDrop:         (e: React.DragEvent) => void
  // labels
  title:            string
  dropHereLabel:    string
  orClickLabel:     string
  uploadBtnLabel:   string
  optimizingLabel:  string
  uploadingLabel:   string
  errorLabel:       string
  successLabel:     string
}

export function MediaUploadModal({
  open,
  onClose,
  queue,
  dragging,
  onFiles,
  onRemove,
  onStartUpload,
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
}: MediaUploadModalProps) {
  // ESC to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <VHSTransition
        duration="fast"
        className="flex w-full sm:max-w-xl flex-col rounded-t-2xl sm:rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 overflow-hidden"
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
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Upload zone */}
        <div className="p-5">
          <MediaUploadZone
            queue={queue}
            dragging={dragging}
            onFiles={onFiles}
            onRemove={onRemove}
            onStartUpload={onStartUpload}
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
          />
        </div>
      </VHSTransition>
    </div>,
    document.body,
  )
}
