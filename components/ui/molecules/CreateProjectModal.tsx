'use client'

import { useEffect, useRef, useTransition } from 'react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { createProject } from '@/lib/actions/project.actions'
import type { Dictionary } from '@/locales/en'

export type CreateProjectModalProps = {
  d:             Dictionary['cms']['newProjectModal']
  defaultLocale?: string
  onClose:       () => void
}

export function CreateProjectModal({ d, defaultLocale = 'en', onClose }: CreateProjectModalProps) {
  const panelRef                 = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  useFocusTrap(panelRef, true)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleSubmit(formData: FormData) {
    startTransition(() => createProject(formData))
  }

  return (
    <>
      {/* Invisible click-away target */}
      <div
        className="fixed inset-0 z-40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <VHSTransition duration="fast" trigger className="w-full max-w-sm px-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={d.title}
          className="pointer-events-auto rounded-xl border border-border bg-surface shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="font-mono text-sm font-medium text-text">{d.title}</span>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-border font-mono text-xs text-muted hover:border-border/80 hover:text-text cursor-pointer transition-colors"
            >✕</button>
          </div>

          {/* Form */}
          <form action={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-xs text-muted">{d.nameLabel}</label>
              <input
                name="name"
                required
                autoFocus
                disabled={isPending}
                placeholder={d.namePlaceholder}
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-xs text-muted">{d.descriptionLabel}</label>
              <textarea
                name="description"
                rows={2}
                disabled={isPending}
                placeholder={d.descriptionPlaceholder}
                className="w-full resize-none rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-xs text-muted">{d.localeLabel}</label>
              <div className="flex gap-4">
                {([{ value: 'en', label: d.localeEn }, { value: 'es', label: d.localeEs }] as const).map((loc) => (
                  <label key={loc.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="locale"
                      value={loc.value}
                      defaultChecked={loc.value === defaultLocale}
                      className="accent-primary"
                    />
                    <span className="font-mono text-xs text-muted">{loc.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50"
              >{d.cancel}</button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isPending ? d.creating : d.create}
              </button>
            </div>
          </form>
        </div>
      </VHSTransition>
      </div>
    </>
  )
}
