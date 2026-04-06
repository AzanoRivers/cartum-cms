'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { initializeSchema } from '@/lib/actions/setup.actions'
import { SetupLayout } from '@/components/ui/layouts/SetupLayout'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { Dictionary } from '@/locales/en'

type Props = {
  dict: Dictionary['setup']['initializing']
  layoutDict: { stepLabels: string[]; back: string }
}

export function InitializingClient({ dict, layoutDict }: Props) {
  const router  = useRouter()
  const [step,  setStep]  = useState(0)
  const [done,  setDone]  = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      for (let i = 0; i < dict.steps.length; i++) {
        if (cancelled) return
        setStep(i)
        await new Promise((r) => setTimeout(r, 500))
      }

      const result = await initializeSchema()
      if (cancelled) return

      if (!result.success) {
        setError(result.error)
        return
      }

      setDone(true)
      setTimeout(() => router.push('/setup/ready'), 800)
    }

    run()
    return () => { cancelled = true }
  }, [router, dict.steps.length])

  return (
    <SetupLayout currentStep="initializing" layoutDict={layoutDict}>
      <VHSTransition>
        <div className="flex flex-col gap-6">
          <h1 className="text-text text-xl font-semibold tracking-tight">{dict.title}</h1>

          <ul className="flex flex-col gap-3">
            {dict.steps.map((label, i) => {
              const isCompleted = done || i < step
              const isActive    = !done && i === step
              return (
                <li key={label} className="flex items-center gap-3 font-mono text-sm">
                  <span className={
                    isCompleted ? 'text-success' :
                    isActive    ? 'text-primary animate-pulse' :
                    'text-border'
                  }>
                    {isCompleted ? '✓' : isActive ? '→' : '·'}
                  </span>
                  <span className={isCompleted || isActive ? 'text-text' : 'text-muted'}>
                    {label}
                  </span>
                </li>
              )
            })}
          </ul>

          {done  && <p className="text-success font-mono text-sm">{dict.done}</p>}
          {error && <p className="text-danger font-mono text-sm">{error}</p>}
        </div>
      </VHSTransition>
    </SetupLayout>
  )
}
