'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { Dictionary } from '@/locales/en'

export type DangerResetDialogDict = Dictionary['settings']['db']['resetDialog']

export type DangerResetDialogProps = {
  onConfirm:  () => void
  onCancel:   () => void
  isPending?: boolean
  d:          DangerResetDialogDict
}

export function DangerResetDialog({
  onConfirm,
  onCancel,
  isPending = false,
  d,
}: DangerResetDialogProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef  = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { cancelRef.current?.focus() }, [])

  const isMatch = inputValue === d.confirmPhrase

  return (
    <>
      {/* Invisible click-away — no backdrop colour, same pattern as DeleteConfirmDialog */}
      <div
        className="fixed inset-0 z-40"
        aria-hidden="true"
        onClick={() => { if (!isPending) onCancel() }}
      />

      {/* Floating dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4"
        onKeyDown={(e) => { if (e.key === 'Escape' && !isPending) onCancel() }}
      >
        <VHSTransition duration="fast" className="w-full max-w-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="danger-reset-title"
            className="pointer-events-auto relative w-full overflow-hidden rounded-xl border border-danger/40 bg-surface shadow-2xl shadow-danger/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Red accent bar */}
            <div className="h-0.5 w-full bg-danger" />

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/10 border border-danger/20">
                  <AlertTriangle size={18} className="text-danger" strokeWidth={1.8} />
                </div>
                <div>
                  <h2
                    id="danger-reset-title"
                    className="font-mono text-sm font-bold text-text leading-tight"
                  >
                    {d.title}
                  </h2>
                  <p className="mt-1 font-mono text-xs text-muted leading-relaxed">
                    {d.desc}
                  </p>
                </div>
              </div>

              {/* Confirmation input */}
              <div className="space-y-2">
                <label
                  htmlFor="danger-confirm-input"
                  className="block font-mono text-xs text-muted/70"
                >
                  {d.placeholder}{' '}
                  <span className="text-danger font-bold tracking-wide">
                    {d.confirmPhrase}
                  </span>
                </label>
                <input
                  id="danger-confirm-input"
                  ref={inputRef}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isPending}
                  placeholder={d.confirmPhrase}
                  className="w-full h-9 rounded-md border border-border bg-bg px-3 font-mono text-sm text-text placeholder:text-muted/30 focus:outline-none focus:border-danger/60 focus:ring-1 focus:ring-danger/30 transition-colors disabled:opacity-50"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={onCancel}
                  disabled={isPending}
                  className="h-8 rounded-md border border-border px-4 font-mono text-xs text-muted hover:text-text hover:border-border/80 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {d.cancel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={!isMatch || isPending}
                  className="h-8 rounded-md bg-danger px-4 font-mono text-xs font-bold text-white hover:bg-danger/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2"
                >
                  {isPending && (
                    <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  {isPending ? d.confirming : d.confirm}
                </button>
              </div>
            </div>
          </div>
        </VHSTransition>
      </div>
    </>
  )
}
