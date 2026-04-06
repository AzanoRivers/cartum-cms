'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import type { InputVariant, InputSize } from '@/types/ui'
import type { ReactNode } from 'react'

const inputWrapperVariants = cva('relative flex items-center rounded-md border bg-surface-2 transition-colors', {
  variants: {
    variant: {
      default: 'border-border focus-within:border-primary',
      error:   'border-danger focus-within:border-danger',
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

  return (
    <div className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <div className={inputWrapperVariants({ variant: resolvedVariant, size })}>
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
  )
}
