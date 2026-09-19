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
      <span className={active ? 'rounded-md bg-icon/15' : undefined}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          // Thinner focus-visible ring than the app default (ring-2 +
          // ring-offset-2) — the Dock's fixed height clips the default ring,
          // so it's overridden with !important to beat the base Button
          // classes regardless of Tailwind's generated CSS order.
          className={[
            active ? 'text-icon hover:bg-icon/20' : 'text-muted hover:text-text',
            'focus-visible:!ring-1 focus-visible:!ring-offset-1',
          ].join(' ')}
          aria-label={tooltip}
        >
          <Icon name={icon} size="lg" />
        </Button>
      </span>
    </Tooltip>
  )
}
