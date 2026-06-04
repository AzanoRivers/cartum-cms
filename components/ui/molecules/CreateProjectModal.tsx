'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { createProject } from '@/lib/actions/project.actions'
import { THEMES } from '@/types/theme'
import type { Dictionary } from '@/locales/en'

export type CreateProjectModalProps = {
  d:              Dictionary['cms']['newProjectModal']
  defaultLocale?: string
  onClose:        () => void
}

export function CreateProjectModal({ d, defaultLocale = 'en', onClose }: CreateProjectModalProps) {
  const panelRef                   = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  const [step, setStep]            = useState<1 | 2>(1)

  // Step 1 values
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [locale, setLocale]           = useState(defaultLocale)

  // Step 2 value
  const [theme, setTheme] = useState('dusk')

  useFocusTrap(panelRef, true)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (step === 2) setStep(1)
        else onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, step])

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setStep(2)
  }

  function handleSubmit() {
    const fd = new FormData()
    fd.append('name',        name.trim())
    fd.append('description', description)
    fd.append('locale',      locale)
    fd.append('theme',       theme)
    startTransition(() => createProject(fd))
  }

  return (
    <>
      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={step === 1 ? onClose : undefined} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <VHSTransition duration="fast" trigger className="w-full max-w-sm px-4">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={d.title}
            className="pointer-events-auto rounded-xl border border-border bg-surface shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="space-y-0.5">
                <span className="font-mono text-sm font-medium text-text">{d.title}</span>
                <p className="font-mono text-[10px] text-muted/60">{step === 1 ? d.step1 : d.step2}</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border font-mono text-xs text-muted hover:border-border/80 hover:text-text cursor-pointer transition-colors"
              >✕</button>
            </div>

            {/* Step indicator */}
            <div className="flex h-0.5 w-full bg-border/40">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />
            </div>

            {/* ── Step 1: Info ─────────────────────────────────────────── */}
            {step === 1 && (
              <form onSubmit={handleNext}><VHSTransition duration="fast" trigger={step} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="font-mono text-xs text-muted">{d.nameLabel}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                    placeholder={d.namePlaceholder}
                    className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-xs text-muted">{d.descriptionLabel}</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder={d.descriptionPlaceholder}
                    className="w-full resize-none rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
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
                          checked={locale === loc.value}
                          onChange={() => setLocale(loc.value)}
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
                    className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer"
                  >{d.cancel}</button>
                  <button
                    type="submit"
                    disabled={!name.trim()}
                    className="rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >{d.next}</button>
                </div>
              </VHSTransition></form>
            )}

            {/* ── Step 2: Theme ─────────────────────────────────────────── */}
            {step === 2 && (
              <VHSTransition duration="fast" trigger={step} className="p-5 space-y-4">
                <p className="font-mono text-xs text-muted">{d.themeLabel}</p>

                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={[
                        'group relative overflow-hidden rounded-lg border p-2.5 text-left transition-all cursor-pointer',
                        theme === t.id
                          ? 'border-primary ring-1 ring-primary/30'
                          : 'border-border hover:border-border/80',
                      ].join(' ')}
                    >
                      {/* Swatch */}
                      <div
                        className="flex h-7 w-full rounded mb-2 overflow-hidden"
                        style={{ background: t.preview.bg }}
                      >
                        <div className="flex-1" style={{ background: t.preview.surface }} />
                        <div className="w-4" style={{ background: t.preview.primary }} />
                        <div className="w-2" style={{ background: t.preview.accent }} />
                      </div>
                      <p className="font-mono text-[10px] text-text leading-tight">{t.label}</p>
                      {theme === t.id && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isPending}
                    className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50"
                  >{d.back}</button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isPending ? d.creating : d.create}
                  </button>
                </div>
              </VHSTransition>
            )}
          </div>
        </VHSTransition>
      </div>
    </>
  )
}
