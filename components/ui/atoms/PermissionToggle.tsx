'use client'

import { cva, type VariantProps } from 'class-variance-authority'

const toggleTrack = cva(
  [
    'relative inline-flex h-4 w-8 shrink-0 items-center rounded-full border',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
  ].join(' '),
  {
    variants: {
      state: {
        on:       'bg-primary/80 border-primary/60 cursor-pointer',
        off:      'bg-surface-2 border-border/60 cursor-pointer',
        readonly: 'bg-surface-2 border-border/30 opacity-40 cursor-not-allowed',
      },
    },
    defaultVariants: { state: 'off' },
  },
)

const toggleThumb = cva(
  'pointer-events-none absolute h-3 w-3 rounded-full bg-white shadow transition-transform duration-200',
  {
    variants: {
      state: {
        on:       'translate-x-4.25',
        off:      'translate-x-0.5',
        readonly: 'translate-x-0.5',
      },
    },
    defaultVariants: { state: 'off' },
  },
)

export type PermissionToggleProps = VariantProps<typeof toggleTrack> & {
  checked:   boolean
  onChange?: () => void
  label?:    string
  className?: string
}

export function PermissionToggle({
  checked,
  onChange,
  label,
  className,
}: PermissionToggleProps) {
  const state = onChange === undefined ? 'readonly' : checked ? 'on' : 'off'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={!onChange}
      className={toggleTrack({ state, className })}
    >
      <span className={toggleThumb({ state })} />
    </button>
  )
}
