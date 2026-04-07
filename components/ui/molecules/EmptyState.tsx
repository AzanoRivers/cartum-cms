'use client'

import { icons } from 'lucide-react'
import { Icon } from '@/components/ui/atoms/Icon'

export type EmptyStateAction = {
  label: string
  onClick: () => void
}

export type EmptyStateProps = {
  icon?: keyof typeof icons
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center ${className}`}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-2">
          <Icon name={icon} size="lg" className="text-muted" />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <p className="font-mono text-sm font-medium text-text">{title}</p>
        {description && (
          <p className="max-w-xs text-xs text-muted">{description}</p>
        )}
      </div>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 rounded-md border border-border bg-surface-2 px-4 py-2 font-mono text-xs text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
