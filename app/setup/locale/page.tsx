'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setDefaultLocale } from '@/lib/actions/setup.actions'
import { SetupLayout } from '@/components/ui/layouts/SetupLayout'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { getDictionary } from '@/locales'
import type { SupportedLocale } from '@/types/project'

const LOCALES: { id: SupportedLocale; flag: string; label: string }[] = [
  { id: 'en', flag: '🇺🇸', label: 'English' },
  { id: 'es', flag: '🇪🇸', label: 'Español' },
]

export default function LocalePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<SupportedLocale>('en')
  const [loading, setLoading]   = useState(false)

  const dict   = getDictionary(selected).setup.locale
  const layout = getDictionary(selected).setup

  async function handleContinue() {
    setLoading(true)
    await setDefaultLocale({ locale: selected })
    router.push('/setup/system-check')
  }

  return (
    <SetupLayout currentStep="locale" layoutDict={{ stepLabels: layout.stepLabels, back: layout.layout.back }}>
      <VHSTransition>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-text text-xl font-semibold tracking-tight">{dict.title}</h1>
            <p className="text-muted text-sm mt-1">{dict.subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {LOCALES.map((locale) => {
              const isActive = selected === locale.id
              return (
                <button
                  key={locale.id}
                  onClick={() => setSelected(locale.id)}
                  className={[
                    'flex flex-col items-center gap-2 p-5 rounded-lg border transition-all',
                    isActive
                      ? 'border-primary bg-surface-2 shadow-[0_0_12px_var(--color-primary-glow)]'
                      : 'border-border bg-surface hover:border-primary/40',
                  ].join(' ')}
                >
                  <span className="text-3xl">{locale.flag}</span>
                  <span className="text-text text-sm font-mono">{locale.label}</span>
                  {isActive && (
                    <span className="text-primary text-xs">✓</span>
                  )}
                </button>
              )
            })}
          </div>

          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-mono text-sm py-2.5 rounded-md transition-colors"
          >
            {loading ? '...' : `${dict.continue} →`}
          </button>
        </div>
      </VHSTransition>
    </SetupLayout>
  )
}
