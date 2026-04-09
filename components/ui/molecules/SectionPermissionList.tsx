'use client'

import { PermissionToggle } from '@/components/ui/atoms/PermissionToggle'
import type { SectionKey } from '@/types/roles'
import type { Dictionary } from '@/locales/en'

const SECTION_KEYS: SectionKey[] = [
  'project', 'appearance', 'account', 'email', 'storage',
  'users', 'roles', 'api', 'db', 'info',
]

export type SectionPermissionListProps = {
  permissions: Partial<Record<SectionKey, boolean>>
  onChange:    (section: SectionKey, value: boolean) => void
  readonly?:   boolean
  navDict:     Dictionary['settings']['nav']
}

export function SectionPermissionList({
  permissions,
  onChange,
  readonly = false,
  navDict,
}: SectionPermissionListProps) {
  return (
    <div className="space-y-0.5">
      {SECTION_KEYS.map((section) => {
        const checked = permissions[section] === true
        return (
          <div
            key={section}
            className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-surface-2/40 transition-colors"
          >
            <span className="font-mono text-xs text-text">
              {navDict[section as keyof typeof navDict]}
            </span>
            <PermissionToggle
              checked={checked}
              onChange={readonly ? undefined : () => onChange(section, !checked)}
              label={navDict[section as keyof typeof navDict]}
            />
          </div>
        )
      })}
    </div>
  )
}
