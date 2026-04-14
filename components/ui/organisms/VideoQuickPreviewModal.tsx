'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'

export type VideoQuickPreviewModalProps = {
  open:    boolean
  url:     string
  name:    string
  onClose: () => void
}

export function VideoQuickPreviewModal({ open, url, name, onClose }: VideoQuickPreviewModalProps) {
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
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <VHSTransition duration="fast" className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-mono text-xs text-muted truncate max-w-xs">{name}</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors shrink-0"
            aria-label="Close preview"
          >
            <X size={14} />
          </button>
        </div>
        {/* Video */}
        <video
          src={url}
          controls
          autoPlay
          className="w-full rounded-b-xl"
        />
      </VHSTransition>
    </div>,
    document.body,
  )
}
