import { cva, type VariantProps } from 'class-variance-authority'
import type { BadgeVariant, BadgeSize } from '@/types/ui'

const badgeVariants = cva(
  'inline-flex items-center font-medium rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-surface-2 text-text border border-border',
        primary: 'bg-primary text-white',
        success: 'bg-success/15 text-success border border-success/30',
        warning: 'bg-warning/15 text-warning border border-warning/30',
        danger:  'bg-danger/15 text-danger border border-danger/30',
        muted:   'bg-surface-2 text-muted border border-border',
      } satisfies Record<BadgeVariant, string>,
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
      } satisfies Record<BadgeSize, string>,
    },
    defaultVariants: { variant: 'default', size: 'sm' },
  }
)

export type BadgeProps = VariantProps<typeof badgeVariants> & {
  children: React.ReactNode
  className?: string
}

export function Badge({ variant, size, children, className }: BadgeProps) {
  return (
    <span className={badgeVariants({ variant, size, className })}>
      {children}
    </span>
  )
}
