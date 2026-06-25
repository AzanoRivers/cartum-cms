'use client'

import { useActionState, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { ThemeSwatch } from '@/components/ui/molecules/ThemeSwatch'
import { registerPlayer } from '@/lib/actions/auth.actions'
import { generateSecurePassword } from '@/lib/utils/password'
import { dictionaries } from '@/locales'
import { useStrangerThingsSound } from '@/lib/hooks/useStrangerThingsSound'
import { playStartSound } from '@/lib/sounds'
import { THEMES } from '@/types/theme'
import type { ThemeId } from '@/types/theme'

type State  = { error: string } | undefined
type Locale = 'en' | 'es'
type Mode   = 'landing' | 'form'
type Step   = 'credentials' | 'project' | 'theme'

type PlayerRegisterFormProps = { initialLocale?: Locale }

const PLAYER_DICT = {
  en: dictionaries.en.cms.player,
  es: dictionaries.es.cms.player,
} as const

const APPEARANCE_THEMES = {
  en: dictionaries.en.settings.appearance.themes,
  es: dictionaries.es.settings.appearance.themes,
} as const

const LANG_LABELS: Record<Locale, string> = { en: 'English', es: 'Español' }
const STEPS: Step[] = ['credentials', 'project', 'theme']

const INPUT_CLASS =
  'w-full rounded-md border border-border bg-surface-2 px-3 py-2 md:px-4 md:py-2.5 font-mono text-sm md:text-base text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50'

const PROJECT_LOCALES: { id: Locale; flag: string; label: string }[] = [
  { id: 'en', flag: '🇺🇸', label: 'English' },
  { id: 'es', flag: '🇪🇸', label: 'Español' },
]

export function PlayerRegisterForm({ initialLocale = 'en' }: PlayerRegisterFormProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const d = PLAYER_DICT[locale]
  const themeLabels = APPEARANCE_THEMES[locale]

  // Force dusk theme while on this page; restore on unmount
  useEffect(() => {
    const prev = document.documentElement.dataset.theme ?? 'dusk'
    document.documentElement.dataset.theme = 'dusk'
    return () => {
      try {
        const stored = localStorage.getItem('cartum-theme')
        const valid  = THEMES.map((t) => t.id)
        document.documentElement.dataset.theme = (stored && valid.includes(stored as ThemeId)) ? stored : prev
      } catch {
        document.documentElement.dataset.theme = prev
      }
    }
  }, [])

  const { playIfST, isPlaying: stPlaying } = useStrangerThingsSound()

  const [mode, setMode]                   = useState<Mode>('landing')
  const [step, setStep]                   = useState<Step>('credentials')
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('dusk')
  const [projectLocale, setProjectLocale] = useState<Locale>(locale)
  const [projectName, setProjectName]     = useState('')
  const [description, setDescription]     = useState('')

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied]             = useState(false)
  const [isGenerated, setIsGenerated]   = useState(false)

  // Live theme preview only on theme step
  useEffect(() => {
    if (step === 'theme') {
      document.documentElement.dataset.theme = selectedTheme
    }
  }, [selectedTheme, step])

  // Reset to dusk when leaving theme step without submitting
  useEffect(() => {
    if (step !== 'theme') {
      document.documentElement.dataset.theme = 'dusk'
    }
  }, [step])

  const regenerate = useCallback(() => {
    setPassword(generateSecurePassword())
    setIsGenerated(true)
    setCopied(false)
    setShowPassword(false)
  }, [])

  const copyPassword = useCallback(async () => {
    if (!password) return
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [password])

  const [state, formAction, isPending] = useActionState<State, FormData>(
    registerPlayer as (prev: State, data: FormData) => Promise<State>,
    undefined,
  )

  function handleStartForm() {
    setProjectLocale(locale)
    setStep('credentials')
    setMode('form')
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!email || password.length < 8) return
    setStep('project')
  }

  function handleNextProject(e: React.FormEvent) {
    e.preventDefault()
    if (!projectName.trim()) return
    setStep('theme')
  }

  function handleSelectTheme(themeId: ThemeId) {
    playIfST(themeId)
    setSelectedTheme(themeId)
  }

  function getThemeInfo(themeId: ThemeId) {
    const key = themeId.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()) as keyof typeof themeLabels
    return themeLabels[key] ?? { label: themeId, description: '' }
  }

  function handleBackFromCredentials() {
    setMode('landing')
    setStep('credentials')
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bg px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <VHSTransition duration="normal" trigger={locale} className="relative z-[1] w-full max-w-sm md:max-w-md">
        <div className="rounded-xl border border-border bg-surface shadow-2xl">

          {/* ── Header (always visible) ── */}
          <div className="px-6 pt-6 pb-5 space-y-4">

            {/* Logo + Language selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-7 w-7 shrink-0">
                  <div className="absolute inset-1 rounded-full bg-primary/40 blur-md" />
                  <Image
                    src="/images/brand/icon.svg"
                    alt="Cartum"
                    width={28}
                    height={28}
                    priority
                    className="relative h-7 w-7 object-contain"
                  />
                </div>
                <div className="relative select-none">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 font-mono text-sm tracking-[0.3em] uppercase text-accent blur-[10px] opacity-20"
                  >
                    CARTUM
                  </span>
                  <span className="relative font-mono text-sm tracking-[0.3em] uppercase text-text">
                    CARTUM
                  </span>
                </div>
              </div>

              <div className="flex gap-1">
                {(Object.keys(LANG_LABELS) as Locale[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLocale(lang)}
                    className={`px-2.5 py-1 rounded font-mono text-[10px] tracking-wide transition-colors cursor-pointer ${
                      locale === lang
                        ? 'bg-primary text-white'
                        : 'border border-border text-muted hover:text-text hover:border-border/70'
                    }`}
                  >
                    {LANG_LABELS[lang]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Content (landing or form) ── */}
          <VHSTransition duration="fast" trigger={`${locale}-${mode}-${step}`}>

            {mode === 'landing' ? (
              <div className="px-6 pb-6 space-y-4">
                {/* Welcome */}
                <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
                  <p className="font-mono text-[11px] md:text-xs leading-relaxed text-accent/80">
                    {d.welcome}
                  </p>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  onClick={handleStartForm}
                  className="w-full rounded-md bg-primary px-4 py-2.5 font-mono text-sm text-white hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  {d.createAccountTab} →
                </button>
              </div>
            ) : (
              <div className="border-t border-border px-6 pt-5 pb-6 space-y-5">

                {/* Step indicator */}
                <div className="flex items-center gap-2">
                  {STEPS.map((s, i) => {
                    const past    = STEPS.indexOf(s) < stepIndex
                    const current = step === s
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <div className={[
                          'h-1.5 rounded-full transition-all duration-300',
                          current ? 'w-5 bg-primary shadow-[0_0_6px_var(--color-primary-glow)]'
                            : past  ? 'w-1.5 bg-primary/50'
                            :         'w-1.5 bg-border',
                        ].join(' ')} />
                        {i < STEPS.length - 1 && <div className="h-px w-3 bg-border" />}
                      </div>
                    )
                  })}
                  <span className="font-mono text-[10px] md:text-xs text-muted ml-1">
                    {step === 'credentials' ? d.stepCredentials
                      : step === 'project'  ? d.stepProject
                      :                       d.stepTheme}
                  </span>
                </div>

                {/* ── Step 1: Credentials ── */}
                {step === 'credentials' && (
                  <form onSubmit={handleNext} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="font-mono text-xs md:text-sm text-muted">{d.emailLabel}</label>
                      <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isPending}
                        placeholder={d.emailPlaceholder}
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-mono text-xs md:text-sm text-muted">{d.passwordLabel}</label>
                        <button
                          type="button"
                          onClick={regenerate}
                          className="font-mono text-[10px] md:text-xs text-muted hover:text-accent transition-colors cursor-pointer"
                        >
                          ↻ {d.generatePassword}
                        </button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setIsGenerated(false); setCopied(false) }}
                            disabled={isPending}
                            placeholder={d.passwordPlaceholder}
                            className={`${INPUT_CLASS} pr-14 ${isGenerated ? 'text-accent' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] md:text-xs text-muted hover:text-text transition-colors cursor-pointer"
                          >
                            {showPassword ? d.hidePassword : d.showPassword}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={copyPassword}
                          disabled={!password}
                          className={`shrink-0 border rounded-md px-3 py-2 md:py-2.5 font-mono text-[10px] md:text-xs transition-all cursor-pointer disabled:opacity-30 ${
                            copied
                              ? 'border-success text-success bg-success/10'
                              : 'border-border text-muted hover:border-primary hover:text-primary'
                          }`}
                        >
                          {copied ? d.copiedPassword : d.copyPassword}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleBackFromCredentials}
                        className="flex-none rounded-md border border-border px-4 py-2 md:py-2.5 font-mono text-xs md:text-sm text-muted hover:text-text hover:border-border/70 transition-colors cursor-pointer"
                      >
                        {d.back}
                      </button>
                      <button
                        type="submit"
                        disabled={!email || password.length < 8}
                        className="flex-1 rounded-md bg-primary px-4 py-2 md:py-2.5 font-mono text-sm md:text-base text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {d.next}
                      </button>
                    </div>
                  </form>
                )}

                {/* ── Step 2: Project ── */}
                {step === 'project' && (
                  <form onSubmit={handleNextProject} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="font-mono text-xs md:text-sm text-muted">{d.projectLabel}</label>
                      <input
                        required
                        autoFocus
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        disabled={isPending}
                        placeholder={d.projectPlaceholder}
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-mono text-xs md:text-sm text-muted">{d.descriptionLabel}</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isPending}
                        placeholder={d.descriptionPlaceholder}
                        rows={2}
                        className={`${INPUT_CLASS} resize-none`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-mono text-xs md:text-sm text-muted">{d.projectLocaleLabel}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {PROJECT_LOCALES.map(({ id, flag, label }) => (
                          <button
                            key={id}
                            type="button"
                            disabled={isPending}
                            onClick={() => setProjectLocale(id)}
                            className={[
                              'flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50',
                              projectLocale === id
                                ? 'border-primary bg-primary/10 shadow-[0_0_8px_var(--color-primary-glow)]'
                                : 'border-border hover:border-primary/40 hover:bg-surface-2',
                            ].join(' ')}
                          >
                            <span className="text-xl">{flag}</span>
                            <span className="font-mono text-[10px] md:text-xs text-text">{label}</span>
                            {projectLocale === id && (
                              <span className="font-mono text-[9px] text-primary">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStep('credentials')}
                        className="flex-none rounded-md border border-border px-4 py-2 md:py-2.5 font-mono text-xs md:text-sm text-muted hover:text-text hover:border-border/70 transition-colors cursor-pointer"
                      >
                        {d.back}
                      </button>
                      <button
                        type="submit"
                        disabled={!projectName.trim()}
                        className="flex-1 rounded-md bg-primary px-4 py-2 md:py-2.5 font-mono text-sm md:text-base text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {d.next}
                      </button>
                    </div>
                  </form>
                )}

                {/* ── Step 3: Theme ── */}
                {step === 'theme' && (
                  <form action={formAction} className="space-y-4">
                    <input type="hidden" name="email"       value={email} />
                    <input type="hidden" name="password"    value={password} />
                    <input type="hidden" name="locale"      value={projectLocale} />
                    <input type="hidden" name="theme"       value={selectedTheme} />
                    <input type="hidden" name="projectName" value={projectName} />
                    <input type="hidden" name="description" value={description} />

                    <div className="grid grid-cols-2 gap-2">
                      {THEMES.map((theme) => {
                        const info = getThemeInfo(theme.id)
                        return (
                          <ThemeSwatch
                            key={theme.id}
                            theme={{ ...theme, label: info.label, description: info.description }}
                            isActive={selectedTheme === theme.id}
                            disabled={stPlaying && theme.id !== 'stranger-things'}
                            stPlaying={stPlaying}
                            onSelect={handleSelectTheme}
                          />
                        )
                      })}
                    </div>

                    {state?.error && (
                      <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs md:text-sm text-danger">
                        {state.error}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStep('project')}
                        disabled={isPending}
                        className="flex-none rounded-md border border-border px-4 py-2 md:py-2.5 font-mono text-xs md:text-sm text-muted hover:text-text hover:border-border/70 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {d.back}
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        onClick={() => { if (!isPending) playStartSound() }}
                        className="flex-1 rounded-md bg-primary px-4 py-2 md:py-2.5 font-mono text-sm md:text-base text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isPending ? d.submitting : d.submit}
                      </button>
                    </div>
                  </form>
                )}

              </div>
            )}

          </VHSTransition>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4 text-center">
            <span className="font-mono text-xs text-muted">
              {d.alreadyHaveAccount}{' '}
              <Link href="/login" className="text-primary hover:underline">
                {d.signIn}
              </Link>
            </span>
          </div>
        </div>
      </VHSTransition>
    </div>
  )
}
