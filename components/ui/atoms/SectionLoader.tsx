'use client'

import { Spinner } from '@/components/ui/atoms/Spinner'

export type SectionLoaderProps = {
  text: string
}

export function SectionLoader({ text }: SectionLoaderProps) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        <span className="absolute h-10 w-10 rounded-full bg-primary/10 blur-md" aria-hidden="true" />
        <Spinner size="lg" color="primary" />
      </div>
      <span className="font-mono text-[11px] uppercase tracking-widest text-muted/70 animate-pulse select-none">
        {text}
      </span>
    </div>
  )
}
