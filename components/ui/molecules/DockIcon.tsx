'use client'

import { icons } from 'lucide-react'
import { Button } from '@/components/ui/atoms/Button'
import { Icon } from '@/components/ui/atoms/Icon'
import { Tooltip } from '@/components/ui/atoms/Tooltip'

export type DockIconProps = {
  icon: keyof typeof icons
  tooltip: string
  active?: boolean
  onClick?: () => void
}

export function DockIcon({ icon, tooltip, active = false, onClick }: DockIconProps) {
  return (
    <Tooltip content={tooltip} side="top">
      <span className={active ? 'rounded-md bg-accent/15' : undefined}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={active ? 'text-accent hover:bg-accent/20' : 'text-muted hover:text-text'}
          aria-label={tooltip}
        >
          <Icon name={icon} size="lg" />
        </Button>
      </span>
    </Tooltip>
  )
}
