'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import type { InputVariant, InputSize } from '@/types/ui'
import type { ReactNode } from 'react'

export function charCounterClass(current: number, max: number): string {
  const ratio = current / max
  if (ratio >= 1)    return 'text-danger'
  if (ratio >= 0.90) return 'text-danger/80'
  if (ratio >= 0.75) return 'text-warning'
  return 'text-muted/60'
}

const NO_COUNTER_TYPES = new Set([
  'number', 'range', 'date', 'time', 'datetime-local',
  'month', 'week', 'color', 'file', 'checkbox', 'radio',
  'submit', 'button', 'reset', 'image',
])

const inputWrapperVariants = cva('relative flex items-center rounded-md border bg-surface-2 transition-colors', {
  variants: {
    variant: {
      default: 'border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30',
      error:   'border-danger focus-within:border-danger focus-within:ring-1 focus-within:ring-danger/30',
    } satisfies Record<InputVariant, string>,
    size: {
      sm: 'h-8 text-xs',
      md: 'h-10 text-sm',
    } satisfies Record<InputSize, string>,
  },
  defaultVariants: { variant: 'default', size: 'md' },
})

const inputFieldCva = cva(
  'w-full bg-transparent text-text placeholder:text-muted outline-none px-3 py-0 disabled:opacity-40 disabled:cursor-not-allowed',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
      } satisfies Record<InputSize, string>,
    },
    defaultVariants: { size: 'md' },
  }
)

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> &
  VariantProps<typeof inputWrapperVariants> & {
    label?: string
    error?: string
    hint?: string
    prefix?: ReactNode
    suffix?: ReactNode
  }

export function Input({
  variant,
  size,
  label,
  error,
  hint,
  prefix,
  suffix,
  id,
  className,
  ...props
}: InputProps) {
  const resolvedVariant: InputVariant = error ? 'error' : (variant ?? 'default')
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  const maxLen     = typeof props.maxLength === 'number' ? props.maxLength : undefined
  const currentLen = typeof props.value === 'string' ? props.value.length : undefined
  const isTextLike = !NO_COUNTER_TYPES.has(props.type ?? '')
  const showCounter = maxLen != null && currentLen != null && isTextLike

  const atLimit       = showCounter && currentLen >= maxLen
  const counterClass  = showCounter ? charCounterClass(currentLen, maxLen) : ''
  const wrapperVariant: InputVariant =
    atLimit ? 'error' : resolvedVariant

  return (
    <div className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <div className={inputWrapperVariants({ variant: wrapperVariant, size })}>
        {prefix && <span className="pl-3 text-muted shrink-0">{prefix}</span>}
        <input
          id={inputId}
          className={inputFieldCva({ size })}
          aria-invalid={resolvedVariant === 'error'}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {suffix && <span className="pr-3 text-muted shrink-0">{suffix}</span>}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {error && (
            <p id={`${inputId}-error`} className="text-xs text-danger">
              {error}
            </p>
          )}
          {!error && hint && (
            <p id={`${inputId}-hint`} className="text-xs text-muted">
              {hint}
            </p>
          )}
        </div>
        {showCounter && (
          <span className={`font-mono text-[10px] tabular-nums shrink-0 ${counterClass}`}>
            {currentLen}/{maxLen}
          </span>
        )}
      </div>
    </div>
  )
}
