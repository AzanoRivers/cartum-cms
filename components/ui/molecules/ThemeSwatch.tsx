'use client'

import { Check } from 'lucide-react'
import type { ThemeDefinition } from '@/types/theme'

export type ThemeSwatchProps = {
  theme:    ThemeDefinition
  isActive: boolean
  disabled?: boolean
  onSelect: (id: ThemeDefinition['id']) => void
}

export function ThemeSwatch({ theme, isActive, disabled = false, onSelect }: ThemeSwatchProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(theme.id)}
      disabled={disabled}
      aria-pressed={isActive}
      aria-label={`Select ${theme.label} theme`}
      className={[
        'group relative flex flex-row items-center gap-3 rounded-lg border p-3 text-left transition-all duration-120',
        'sm:flex-col sm:items-start sm:gap-0',
        disabled ? 'cursor-wait opacity-60' : 'cursor-pointer hover:scale-[1.01] sm:hover:scale-[1.02]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isActive
          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
          : 'border-border bg-surface-2 hover:border-primary/40',
      ].join(' ')}
    >
      {/* Mini preview */}
      <div
        className="shrink-0 h-12 w-20 overflow-hidden rounded-md border border-black/10 sm:mb-2.5 sm:w-full sm:h-12"
        style={{ backgroundColor: theme.preview.bg }}
        aria-hidden="true"
      >
        {/* Surface stripe */}
        <div
          className="mt-2 mx-2 h-4 rounded-sm"
          style={{ backgroundColor: theme.preview.surface }}
        />
        {/* Primary + accent dots */}
        <div className="mt-1.5 mx-2 flex gap-1">
          <div
            className="h-2 w-6 rounded-full"
            style={{ backgroundColor: theme.preview.primary }}
          />
          <div
            className="h-2 w-3 rounded-full"
            style={{ backgroundColor: theme.preview.accent }}
          />
        </div>
      </div>

      {/* Label + description */}
      <div className="min-w-0 flex-1 sm:flex-none">
        <span className="block font-mono text-xs font-medium text-text leading-none">
          {theme.label}
        </span>
        <span className="mt-0.5 block font-mono text-[10px] text-muted leading-snug">
          {theme.description}
        </span>
      </div>

      {/* Active checkmark */}
      {isActive && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
          <Check size={10} className="text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
