'use client'

import { useEffect, useState, useTransition } from 'react'
import { getProjectSettings, updateProjectSettings } from '@/lib/actions/settings.actions'
import { useToast } from '@/lib/hooks/useToast'
import { t } from '@/lib/i18n/t'
import type { Dictionary } from '@/locales/en'
import type { ProjectSettings } from '@/types/settings'

export type ProjectSectionProps = {
  d: Dictionary['settings']['project']
}

export function ProjectSection({ d }: ProjectSectionProps) {
  const [form, setForm]          = useState<ProjectSettings>({ projectName: '', description: '', defaultLocale: 'en' })
  const [initialLocale, setInitialLocale] = useState<string>('')
  const [isPending, start]       = useTransition()
  const [loaded, setLoaded]      = useState(false)
  const toast = useToast()

  useEffect(() => {
    getProjectSettings().then((res) => {
      if (res.success) {
        setForm(res.data)
        setInitialLocale(res.data.defaultLocale)
      }
      setLoaded(true)
    })
  }, [])

  function handleChange(field: keyof ProjectSettings, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    start(async () => {
      const res = await updateProjectSettings(form)
      if (res.success) {
        toast.success(d.saved)
        // Reload if locale changed so Server Components re-render with new dictionary
        if (form.defaultLocale !== initialLocale) {
          window.location.reload()
        }
      } else {
        toast.error(d.error)
      }
    })
  }

  if (!loaded) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="font-mono text-xs text-muted animate-pulse">Loading…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>

      {/* Project name */}
      <div className="space-y-1.5">
        <label className="block font-mono text-xs text-text-muted">{d.projectName}</label>
        <input
          type="text"
          value={form.projectName}
          onChange={(e) => handleChange('projectName', e.target.value)}
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="block font-mono text-xs text-text-muted">{d.description}</label>
        <textarea
          value={form.description ?? ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          placeholder={d.descriptionPlaceholder}
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors resize-none"
        />
      </div>

      {/* Default locale */}
      <div className="space-y-1.5">
        <label className="block font-mono text-xs text-text-muted">{d.defaultLocale}</label>
        <select
          value={form.defaultLocale}
          onChange={(e) => handleChange('defaultLocale', e.target.value as 'en' | 'es')}
          className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors cursor-pointer"
        >
          <option value="en">{d.localeEn}</option>
          <option value="es">{d.localeEs}</option>
        </select>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? d.saving : d.save}
        </button>
      </div>
    </div>
  )
}
