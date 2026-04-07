'use client'

import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'

export type RenameNodeDialogDict = {
  title:       string
  label:       string
  placeholder: string
  cancel:      string
  save:        string
  saving:      string
}

export type RenameNodeDialogProps = {
  currentName: string
  onConfirm:   (name: string) => Promise<void>
  onCancel:    () => void
  isPending?:  boolean
  d?:          RenameNodeDialogDict
}

const FALLBACK: RenameNodeDialogDict = {
  title:       'Rename node',
  label:       'Node name',
  placeholder: 'my_node_name',
  cancel:      'Cancel',
  save:        'Save',
  saving:      'Saving…',
}

const NAME_REGEX = /^[a-zA-Z0-9 _-]+$/

export function RenameNodeDialog({
  currentName,
  onConfirm,
  onCancel,
  isPending = false,
  d: dict,
}: RenameNodeDialogProps) {
  const d       = dict ?? FALLBACK
  const inputRef = useRef<HTMLInputElement>(null)

  const [value,        setValue]        = useState(currentName)
  const [localPending, setLocalPending] = useState(false)

  const isWorking = isPending || localPending
  const isValid   = value.trim().length > 0
    && NAME_REGEX.test(value.trim())
    && value.trim() !== currentName

  // Auto-focus + select all on mount
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  // Escape to cancel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isValid || isWorking) return
    setLocalPending(true)
    try {
      await onConfirm(value.trim())
    } finally {
      setLocalPending(false)
    }
  }

  return (
    <>
      {/* Invisible click-away — no dark backdrop */}
      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={onCancel} />

      {/* Floating panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <VHSTransition duration="fast" className="w-full max-w-sm mx-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-dialog-title"
            className="pointer-events-auto relative w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Primary accent bar */}
            <div className="h-0.5 w-full bg-primary" />

            {/* Header */}
            <div className="flex items-center gap-3 p-5 pb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Pencil size={16} className="text-primary" />
              </div>
              <h2
                id="rename-dialog-title"
                className="font-mono text-sm font-semibold text-text"
              >
                {d.title}
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="rename-node-input"
                  className="font-mono text-xs text-muted"
                >
                  {d.label}
                </label>
                <input
                  id="rename-node-input"
                  ref={inputRef}
                  type="text"
                  value={value}
                  disabled={isWorking}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={d.placeholder}
                  maxLength={64}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={onCancel}
                  className="rounded-lg border border-border px-4 py-2 font-mono text-sm text-muted hover:bg-surface-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {d.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!isValid || isWorking}
                  className="rounded-lg border border-primary/60 bg-primary px-4 py-2 font-mono text-sm text-white hover:bg-primary/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isWorking ? d.saving : d.save}
                </button>
              </div>
            </form>
          </div>
        </VHSTransition>
      </div>
    </>
  )
}
