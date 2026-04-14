'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/atoms/Icon'
import type { Dictionary } from '@/locales/en'

type DocsSections = Dictionary['cms']['docs']['sections']

export type DocsSidebarProps = {
  sections: DocsSections
  activeId: string
  onSelect: (id: string) => void
}

const SECTION_IDS = [
  'gettingStarted',
  'navigation',
  'nodesAndFields',
  'content',
  'media',
  'apiForDevs',
  'apiSchema',
] as const

const SECTION_ICONS: Record<typeof SECTION_IDS[number], Parameters<typeof Icon>[0]['name']> = {
  gettingStarted: 'Rocket',
  navigation:     'Compass',
  nodesAndFields: 'Boxes',
  content:        'FileText',
  media:          'Image',
  apiForDevs:     'Code',
  apiSchema:      'Network',
}

export function DocsSidebar({ sections, activeId, onSelect }: DocsSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeLabel = sections[activeId as keyof DocsSections] ?? ''

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <nav
        aria-label="Documentation navigation"
        className="hidden md:flex w-52 shrink-0 flex-col border-r border-border bg-surface overflow-y-auto"
      >
        <div className="py-3">
          {SECTION_IDS.map((id) => {
            const active = id === activeId
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className={[
                  'w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors cursor-pointer',
                  active
                    ? 'border-l-2 border-primary bg-primary/10 text-primary'
                    : 'border-l-2 border-transparent text-muted hover:text-text hover:bg-surface-2',
                ].join(' ')}
              >
                <Icon
                  name={SECTION_ICONS[id]}
                  size="sm"
                  className={active ? 'text-primary' : 'text-muted'}
                />
                <span className="font-mono text-xs leading-4">
                  {sections[id as keyof DocsSections]}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Mobile accordion trigger ───────────────────────────────────── */}
      <div className="flex md:hidden shrink-0 flex-col border-b border-border bg-surface">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 cursor-pointer"
          aria-expanded={mobileOpen}
        >
          <div className="flex items-center gap-2">
            <Icon
              name={SECTION_ICONS[activeId as typeof SECTION_IDS[number]] ?? 'FileText'}
              size="sm"
              className="text-primary"
            />
            <span className="font-mono text-xs font-medium text-text">{activeLabel}</span>
          </div>
          <span
            className="transition-transform duration-300 inline-flex"
            style={{ transform: mobileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <Icon name="ChevronDown" size="sm" className="text-muted" />
          </span>
        </button>

        {/* Animated content — max-height slide */}
        <div
          style={{
            maxHeight:  mobileOpen ? '320px' : '0px',
            opacity:    mobileOpen ? 1 : 0,
            overflow:   'hidden',
            transition: 'max-height 300ms ease-out, opacity 200ms ease-out',
          }}
        >
          <div className="border-t border-border">
            {SECTION_IDS.map((id) => {
              const active = id === activeId
              return (
                <button
                  key={id}
                  onClick={() => { onSelect(id); setMobileOpen(false) }}
                  className={[
                    'w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors cursor-pointer',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:text-text hover:bg-surface-2',
                  ].join(' ')}
                >
                  <Icon
                    name={SECTION_ICONS[id]}
                    size="sm"
                    className={active ? 'text-primary' : 'text-muted'}
                  />
                  <span className="font-mono text-xs">
                    {sections[id as keyof DocsSections]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
