import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonVariant, ButtonSize } from '@/types/ui'
import { Spinner } from './Spinner'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:brightness-110 active:brightness-95',
        ghost:   'bg-transparent text-text hover:bg-surface-2 active:bg-border',
        danger:  'bg-danger text-white hover:brightness-110 active:brightness-95',
        outline: 'border border-border text-text hover:bg-surface-2 active:bg-border',
      } satisfies Record<ButtonVariant, string>,
      size: {
        sm:   'text-xs px-2 py-1 rounded-sm h-7',
        md:   'text-sm px-4 py-2 rounded-md h-9',
        lg:   'text-base px-6 py-3 rounded-lg h-11',
        icon: 'p-2 rounded-md h-9 w-9',
      } satisfies Record<ButtonSize, string>,
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
  }

export function Button({
  variant,
  size,
  loading,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" color={variant === 'ghost' || variant === 'outline' ? 'muted' : 'primary'} />
          <span className="sr-only">Loading</span>
        </>
      ) : children}
    </button>
  )
}
