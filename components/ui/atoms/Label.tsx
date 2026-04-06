import { cva, type VariantProps } from 'class-variance-authority'
import type { LabelVariant, LabelSize } from '@/types/ui'

const labelVariants = cva('leading-none select-none', {
  variants: {
    variant: {
      default: 'text-text font-medium',
      mono:    'text-text font-mono font-normal tracking-tight',
      muted:   'text-muted font-medium',
    } satisfies Record<LabelVariant, string>,
    size: {
      sm: 'text-xs',
      md: 'text-sm',
    } satisfies Record<LabelSize, string>,
  },
  defaultVariants: { variant: 'default', size: 'sm' },
})

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> &
  VariantProps<typeof labelVariants>

export function Label({ variant, size, className, children, ...props }: LabelProps) {
  return (
    <label
      className={labelVariants({ variant, size, className })}
      {...props}
    >
      {children}
    </label>
  )
}
