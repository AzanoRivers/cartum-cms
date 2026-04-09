'use client'

import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'

export type ConfirmDialogProps = {
  open:          boolean
  title:         string
  description:   string
  confirmLabel?: string
  cancelLabel?:  string
  onConfirm:     () => void
  onCancel:      () => void
  destructive?:  boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  onConfirm,
  onCancel,
  destructive  = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <>
      {/* Click-away — sin overlay oscuro */}
      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={onCancel} />

      {/* Panel flotante — mismo estilo que Settings / Help */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <VHSTransition duration="fast" className="w-full max-w-sm mx-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
            className="pointer-events-auto relative w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent bar */}
            <div className={`h-0.5 w-full ${destructive ? 'bg-danger' : 'bg-primary'}`} />

            {/* Content */}
            <div className="px-5 pt-5 pb-4 space-y-1.5">
              <h2
                id="confirm-title"
                className="font-mono text-sm font-semibold text-text leading-snug"
              >
                {title}
              </h2>
              <p
                id="confirm-desc"
                className="font-mono text-[11px] leading-relaxed text-muted"
              >
                {description}
              </p>
            </div>

            {/* Divider */}
            <div className="mx-5 border-t border-border/40" />

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-4">
              <button
                ref={cancelRef}
                onClick={onCancel}
                className="rounded-lg border border-border bg-surface-2 px-4 py-1.5 font-mono text-xs text-text hover:bg-surface hover:border-primary/40 transition-colors cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={[
                  'flex items-center gap-1.5 rounded-lg px-4 py-1.5 font-mono text-xs font-semibold text-white transition-colors cursor-pointer',
                  destructive
                    ? 'bg-danger hover:bg-danger/85 border border-danger/60'
                    : 'bg-primary hover:bg-primary/85 border border-primary/60',
                ].join(' ')}
              >
                {destructive && <Trash2 size={11} strokeWidth={2.5} />}
                {confirmLabel}
              </button>
            </div>
          </div>
        </VHSTransition>
      </div>
    </>
  )
}
