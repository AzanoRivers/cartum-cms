'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'

export type VideoFallbackModalLabels = {
  title:   string
  body:    string
  upload:  string
  cancel:  string
}

export type VideoFallbackModalProps = {
  open:      boolean
  onUpload:  () => void
  onCancel:  () => void
  labels:    VideoFallbackModalLabels
}

export function VideoFallbackModal({
  open,
  onUpload,
  onCancel,
  labels,
}: VideoFallbackModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <VHSTransition
        duration="fast"
        className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-warning shrink-0" />
            <span className="font-mono text-sm font-medium text-text">{labels.title}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-5">
          <p className="font-mono text-xs text-muted leading-5">{labels.body}</p>
        </div>

        {/* Footer — Subir (left, danger) · Cancelar (right, neutral) */}
        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onUpload}
            className="flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 font-mono text-xs text-white hover:bg-danger/80 transition-colors"
          >
            <AlertTriangle size={11} />
            {labels.upload}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-text hover:bg-surface-2 transition-colors"
          >
            {labels.cancel}
          </button>
        </div>
      </VHSTransition>
    </div>,
    document.body,
  )
}
