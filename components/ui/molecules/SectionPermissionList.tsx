'use client'

import type { SectionKey, SectionAccess } from '@/types/roles'
import type { Dictionary } from '@/locales/en'

const SECTION_KEYS: SectionKey[] = [
  'project', 'appearance', 'account', 'email', 'storage',
  'users', 'roles', 'api', 'db', 'webMigration', 'info',
]

// info section has no meaningful actions — only view applies
const VIEW_ONLY_SECTIONS: SectionKey[] = ['info']

export type SectionPermissionListProps = {
  permissions: Partial<Record<SectionKey, SectionAccess>>
  onChange:    (section: SectionKey, field: 'canView' | 'canActions', value: boolean) => void
  readonly?:   boolean
  navDict:     Dictionary['settings']['nav']
  colView?:    string
  colActions?: string
}

export function SectionPermissionList({
  permissions,
  onChange,
  readonly = false,
  navDict,
  colView    = 'Ver',
  colActions = 'Acciones',
}: SectionPermissionListProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-border/70">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border/70 bg-surface-2/60">
            <th className="px-3 py-2 font-mono text-[10px] text-muted uppercase tracking-wider"></th>
            <th className="px-2 py-2 font-mono text-[10px] text-muted uppercase tracking-wider text-center w-16">{colView}</th>
            <th className="px-2 py-2 font-mono text-[10px] text-muted uppercase tracking-wider text-center w-16">{colActions}</th>
          </tr>
        </thead>
        <tbody>
          {SECTION_KEYS.map((section) => {
            const access     = permissions[section]
            const canView    = access?.canView    ?? false
            const canActions = access?.canActions ?? false
            const viewOnly   = VIEW_ONLY_SECTIONS.includes(section)
            const label      = navDict[section as keyof typeof navDict] as string | undefined

            return (
              <tr key={section} className="border-b border-border/40 last:border-0 hover:bg-surface-2/30 transition-colors">
                <td className="px-3 py-2 font-mono text-xs text-text">{label}</td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={canView}
                    disabled={readonly}
                    onChange={() => {
                      if (readonly) return
                      const next = !canView
                      onChange(section, 'canView', next)
                      // uncheck actions if view is unchecked
                      if (!next && canActions) onChange(section, 'canActions', false)
                    }}
                    className="accent-primary cursor-pointer disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  {viewOnly ? (
                    <span className="font-mono text-[10px] text-muted/50">—</span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={canActions}
                      disabled={readonly || !canView}
                      onChange={() => {
                        if (readonly || !canView) return
                        onChange(section, 'canActions', !canActions)
                      }}
                      className="accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
