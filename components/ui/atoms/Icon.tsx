import { icons, type LucideProps } from 'lucide-react'
import type { IconSize } from '@/types/ui'

const SIZE_CLASS: Record<IconSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

export type IconProps = {
  name: keyof typeof icons
  size?: IconSize
  className?: string
  strokeWidth?: LucideProps['strokeWidth']
}

export function Icon({ name, size = 'md', className, strokeWidth = 1.75 }: IconProps) {
  const LucideIcon = icons[name]
  return (
    <LucideIcon
      className={[SIZE_CLASS[size], className].filter(Boolean).join(' ')}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    />
  )
}
