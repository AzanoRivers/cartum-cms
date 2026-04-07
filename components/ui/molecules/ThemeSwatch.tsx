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
        'group relative flex flex-col rounded-lg border p-3 text-left transition-all duration-120',
        disabled ? 'cursor-wait opacity-60' : 'cursor-pointer hover:scale-[1.02]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isActive
          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
          : 'border-border bg-surface-2 hover:border-primary/40',
      ].join(' ')}
    >
      {/* Mini preview */}
      <div
        className="mb-2.5 h-12 w-full overflow-hidden rounded-md border border-black/10"
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

      {/* Label */}
      <span className="font-mono text-xs font-medium text-text leading-none">
        {theme.label}
      </span>
      <span className="mt-0.5 font-mono text-[10px] text-muted leading-snug">
        {theme.description}
      </span>

      {/* Active checkmark */}
      {isActive && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
          <Check size={10} className="text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
