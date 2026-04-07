import { cva, type VariantProps } from 'class-variance-authority'
import type { SkeletonSize, SkeletonWidth } from '@/types/ui'

const skeletonVariants = cva('animate-pulse rounded bg-surface-2', {
  variants: {
    size: {
      sm:   'h-3',
      md:   'h-4',
      lg:   'h-6',
      xl:   'h-10',
      full: 'h-full',
    } satisfies Record<SkeletonSize, string>,
    width: {
      xs:   'w-12',
      sm:   'w-20',
      md:   'w-32',
      lg:   'w-48',
      xl:   'w-64',
      full: 'w-full',
    } satisfies Record<SkeletonWidth, string>,
  },
  defaultVariants: { size: 'md', width: 'full' },
})

export type SkeletonProps = VariantProps<typeof skeletonVariants> & {
  className?: string
}

export function Skeleton({ size, width, className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={skeletonVariants({ size, width, className })}
    />
  )
}
