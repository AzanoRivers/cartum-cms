'use client'

import { Icon } from '@/components/ui/atoms/Icon'

export type PanelHeaderProps = {
  title:    string
  onClose:  () => void
  closeLabel?: string
}

export function PanelHeader({ title, onClose, closeLabel = 'Close' }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
      <span className="font-mono text-sm font-medium text-text truncate">{title}</span>
      <button
        onClick={onClose}
        aria-label={closeLabel}
        className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer"
      >
        <Icon name="X" size="sm" />
      </button>
    </div>
  )
}
