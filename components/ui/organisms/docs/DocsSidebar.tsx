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

const TOP_IDS  = ['gettingStarted', 'navigation', 'nodesAndFields', 'content', 'relationsGuide'] as const
const DEV_IDS  = ['nodesAndFieldsDev', 'media', 'apiForDevs', 'apiSchema', 'relations'] as const
const ALL_IDS  = [...TOP_IDS, ...DEV_IDS] as const

type SectionId = typeof ALL_IDS[number]

const DEV_SET = new Set<string>(DEV_IDS)

const ICONS: Record<SectionId, Parameters<typeof Icon>[0]['name']> = {
  gettingStarted: 'Rocket',
  navigation:     'Compass',
  nodesAndFields: 'Boxes',
  content:        'FileText',
  relationsGuide:    'Link',
  nodesAndFieldsDev: 'Database',
  media:             'Image',
  apiForDevs:     'Code',
  apiSchema:      'Network',
  relations:      'GitMerge',
}

export function DocsSidebar({ sections, activeId, onSelect }: DocsSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [devOpen, setDevOpen]       = useState(false)

  const activeLabel = sections[activeId as keyof DocsSections] ?? ''

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <nav
        aria-label="Documentation navigation"
        className="hidden md:flex w-52 shrink-0 flex-col border-r border-border bg-surface overflow-y-auto"
      >
        <div className="py-3">

          {/* Top sections — flat */}
          {TOP_IDS.map((id) => {
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
                <Icon name={ICONS[id]} size="sm" className={active ? 'text-primary' : 'text-muted'} />
                <span className="font-mono text-xs leading-4">{sections[id]}</span>
              </button>
            )
          })}

          {/* Developer accordion group */}
          <div className="mt-1">

            {/* Group trigger */}
            <button
              onClick={() => setDevOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2 cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Icon name="Terminal" size="sm" className="text-muted group-hover:text-text transition-colors" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted group-hover:text-text transition-colors">
                  Developer
                </span>
              </div>
              <span
                className="inline-flex transition-transform duration-300"
                style={{ transform: devOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <Icon name="ChevronDown" size="sm" className="text-muted group-hover:text-text transition-colors" />
              </span>
            </button>

            {/* Animated content */}
            <div
              style={{
                maxHeight:  devOpen ? '300px' : '0px',
                overflow:   'hidden',
                transition: 'max-height 300ms ease-out',
              }}
            >
              {DEV_IDS.map((id) => {
                const active = id === activeId
                return (
                  <button
                    key={id}
                    onClick={() => onSelect(id)}
                    className={[
                      'w-full flex items-center gap-2.5 pl-6 pr-4 py-2 text-left transition-colors cursor-pointer',
                      active
                        ? 'border-l-2 border-primary bg-primary/10 text-primary'
                        : 'border-l-2 border-transparent text-muted hover:text-text hover:bg-surface-2',
                    ].join(' ')}
                  >
                    <Icon name={ICONS[id]} size="sm" className={active ? 'text-primary' : 'text-muted'} />
                    <span className="font-mono text-xs leading-4">{sections[id]}</span>
                  </button>
                )
              })}
            </div>
          </div>

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
              name={ICONS[activeId as SectionId] ?? 'FileText'}
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

        {/* Animated content */}
        <div
          style={{
            maxHeight:  mobileOpen ? '400px' : '0px',
            opacity:    mobileOpen ? 1 : 0,
            overflow:   'hidden',
            transition: 'max-height 300ms ease-out, opacity 200ms ease-out',
          }}
        >
          <div className="border-t border-border">

            {/* Top sections */}
            {TOP_IDS.map((id) => {
              const active = id === activeId
              return (
                <button
                  key={id}
                  onClick={() => { onSelect(id); setMobileOpen(false) }}
                  className={[
                    'w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors cursor-pointer',
                    active ? 'bg-primary/10 text-primary' : 'text-muted hover:text-text hover:bg-surface-2',
                  ].join(' ')}
                >
                  <Icon name={ICONS[id]} size="sm" className={active ? 'text-primary' : 'text-muted'} />
                  <span className="font-mono text-xs">{sections[id]}</span>
                </button>
              )
            })}

            {/* Developer group label */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <Icon name="Terminal" size="sm" className="text-muted/60" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted/60">Developer</span>
            </div>

            {/* Dev sections */}
            {DEV_IDS.map((id) => {
              const active = id === activeId
              return (
                <button
                  key={id}
                  onClick={() => { onSelect(id); setMobileOpen(false) }}
                  className={[
                    'w-full flex items-center gap-2.5 pl-6 pr-4 py-2.5 text-left transition-colors cursor-pointer',
                    active ? 'bg-primary/10 text-primary' : 'text-muted hover:text-text hover:bg-surface-2',
                  ].join(' ')}
                >
                  <Icon name={ICONS[id]} size="sm" className={active ? 'text-primary' : 'text-muted'} />
                  <span className="font-mono text-xs">{sections[id]}</span>
                </button>
              )
            })}

          </div>
        </div>
      </div>
    </>
  )
}
