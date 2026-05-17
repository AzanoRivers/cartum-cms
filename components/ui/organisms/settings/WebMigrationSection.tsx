'use client'

import type { Dictionary } from '@/locales/en'

export type WebMigrationSectionProps = {
  d: Dictionary['settings']['webMigration']
}

export function WebMigrationSection({ d }: WebMigrationSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="font-mono text-sm font-medium text-text">{d.title}</h2>

      {/* Description card */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <p className="font-mono text-xs leading-relaxed text-muted">
            {d.description}
          </p>
        </div>
      </div>

      {/* Under construction */}
      <div className="rounded-lg border border-dashed border-accent/30 bg-accent/5 p-8 flex flex-col items-center justify-center gap-4 text-center">
        <div className="relative flex items-center justify-center">
          {/* Outer glow ring */}
          <span
            className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-accent/20"
            style={{ animationDuration: '2.5s' }}
            aria-hidden="true"
          />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-surface-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent"
              aria-hidden="true"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
        </div>

        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-0.5 font-mono text-xs font-medium tracking-widest text-accent uppercase">
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
              aria-hidden="true"
            />
            {d.comingSoon}
          </span>
        </div>
      </div>
    </div>
  )
}
