'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, X } from 'lucide-react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { Spinner } from '@/components/ui/atoms/Spinner'

export type MediaBulkDeleteModalLabels = {
  title:    string
  body:     string   // "Delete {n} file(s)? …"
  cancel:   string
  confirm:  string   // "Delete {n}"
  deleting: string
}

export type MediaBulkDeleteModalProps = {
  open:      boolean
  count:     number
  onClose:   () => void
  onConfirm: () => Promise<void>
  labels:    MediaBulkDeleteModalLabels
}

export function MediaBulkDeleteModal({
  open,
  count,
  onClose,
  onConfirm,
  labels,
}: MediaBulkDeleteModalProps) {
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !deleting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, deleting, onClose])

  // Reset deleting when modal closes
  useEffect(() => {
    if (!open) setDeleting(false)
  }, [open])

  if (!open) return null

  async function handleConfirm() {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose() }}
    >
      <VHSTransition
        duration="fast"
        className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Trash2 size={13} className="text-danger shrink-0" />
            <span className="font-mono text-sm font-medium text-text">{labels.title}</span>
          </div>
          {!deleting && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-5">
          <p className="font-mono text-xs text-muted leading-5">
            {labels.body.replace(/{n}/g, String(count))}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-text hover:bg-surface-2 transition-colors disabled:opacity-40"
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 font-mono text-xs text-white hover:bg-danger/80 transition-colors disabled:opacity-60"
          >
            {deleting ? (
              <>
                <Spinner size="sm" color="primary" className="border-white/60" />
                <span>{labels.deleting}</span>
              </>
            ) : (
              <>
                <Trash2 size={11} />
                <span>{labels.confirm.replace('{n}', String(count))}</span>
              </>
            )}
          </button>
        </div>
      </VHSTransition>
    </div>,
    document.body,
  )
}
