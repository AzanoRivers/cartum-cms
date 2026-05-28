'use client'

import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'
import type { SetupStep } from '@/types/project'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { BrandFooter } from '@/components/ui/atoms/BrandFooter'

const STEP_IDS: SetupStep[] = [
  'locale',
  'system-check',
  'credentials',
  'theme',
  'project',
  'initializing',
  'ready',
]

const STEP_BACK_ROUTES: Partial<Record<SetupStep, string>> = {
  'system-check': '/setup/locale',
  credentials:    '/setup/system-check',
  // theme: no back — admin account is already committed at this point
  project:        '/setup/theme',
}

type SetupLayoutDict = {
  stepLabels: string[]
  back: string
}

type SetupLayoutProps = {
  children: React.ReactNode
  currentStep: SetupStep
  layoutDict: SetupLayoutDict
}

export function SetupLayout({ children, currentStep, layoutDict }: SetupLayoutProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const currentIndex = STEP_IDS.indexOf(currentStep)
  const backRoute = STEP_BACK_ROUTES[currentStep]

  return (
    <div className="relative min-h-dvh bg-bg flex flex-col items-center justify-center px-4 py-12">

      {/* Dot grid background */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Content — above dot grid */}
      <div className="relative z-[1] flex flex-col items-center w-full">

      {/* Brand header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative h-8 w-8 shrink-0">
          {/* glow halo */}
          <div className="absolute inset-1 rounded-full bg-primary/40 blur-md" />
          <Image
            src="/images/brand/icon.svg"
            alt="Cartum"
            width={32}
            height={32}
            priority
            className="relative h-8 w-8 object-contain"
          />
        </div>

        {/* CARTUM text with cyan glow layer */}
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

      {/* Step dots */}
      <div className="flex items-center gap-2 mb-4">
        {STEP_IDS.map((id, i) => {
          const isCompleted = i < currentIndex
          const isActive    = i === currentIndex
          return (
            <div
              key={id}
              className={[
                'h-2 rounded-full transition-all duration-300',
                isActive    ? 'w-6 bg-primary shadow-[0_0_8px_var(--color-primary-glow)]' : '',
                isCompleted ? 'w-2 bg-primary opacity-60' : '',
                !isActive && !isCompleted ? 'w-2 bg-border' : '',
              ].join(' ')}
              title={layoutDict.stepLabels[i]}
            />
          )
        })}
      </div>

      {/* Step indicator */}
      <p className="text-muted font-mono text-xs tracking-widest uppercase mb-4">
        {currentIndex + 1} · {layoutDict.stepLabels[currentIndex]}
      </p>

      {/* Content card */}
      <div className="w-full max-w-lg bg-surface border border-border rounded-lg p-8">
        {children}
      </div>

      {/* Back button */}
      {backRoute && (
        <button
          onClick={() => startTransition(() => router.push(backRoute))}
          disabled={isPending}
          className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-4 py-2 font-mono text-xs text-muted hover:border-primary/40 hover:bg-surface-2 hover:text-text transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} strokeWidth={2} />
          {isPending ? '...' : layoutDict.back}
        </button>
      )}
      <BrandFooter />
      </div>
    </div>
  )
}
