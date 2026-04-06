import { cva, type VariantProps } from 'class-variance-authority'
import type { SpinnerColor, SpinnerSize } from '@/types/ui'

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-transparent shrink-0',
  {
    variants: {
      size: {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-6 w-6',
      } satisfies Record<SpinnerSize, string>,
      color: {
        primary: 'border-t-primary',
        accent:  'border-t-accent',
        muted:   'border-t-muted',
      } satisfies Record<SpinnerColor, string>,
    },
    defaultVariants: { size: 'md', color: 'primary' },
  }
)

export type SpinnerProps = VariantProps<typeof spinnerVariants> & {
  className?: string
}

export function Spinner({ size, color, className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={spinnerVariants({ size, color, className })}
    />
  )
}
