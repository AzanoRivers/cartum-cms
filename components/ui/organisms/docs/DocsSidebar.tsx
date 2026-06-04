'use client'

import { useEffect, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Icon } from '@/components/ui/atoms/Icon'
import { LanguageSelectorWrapper } from '@/components/ui/atoms/LanguageSelectorWrapper'
import type { Dictionary } from '@/locales/en'

type DocsSections = Dictionary['cms']['docs']['sections']

export type DocsSidebarProps = {
  sections:      DocsSections
  activeId:      string
  onSelect:      (id: string) => void
  showLang?:     boolean
  currentLocale?: 'en' | 'es'
}

const TOP_IDS  = ['gettingStarted', 'navigation', 'nodesAndFields', 'content', 'webMigration', 'relationsGuide', 'multiProject', 'rolesGuide'] as const
const DEV_IDS  = ['installation', 'usersGuide', 'nodesAndFieldsDev', 'importExport', 'emailSetup', 'webMigrationDev', 'multiProjectDev', 'media', 'storageSetup', 'apiForDevs', 'apiSchema', 'relations'] as const
const ALL_IDS  = [...TOP_IDS, ...DEV_IDS] as const

type SectionId = typeof ALL_IDS[number]

const DEV_SET = new Set<string>(DEV_IDS)

const ICONS: Record<SectionId, Parameters<typeof Icon>[0]['name']> = {
  gettingStarted:  'Rocket',
  navigation:      'Compass',
  nodesAndFields:  'Boxes',
  content:         'FileText',
  webMigration:    'Globe',
  relationsGuide:  'Link',
  multiProject:    'Layers',
  rolesGuide:      'ShieldCheck',
  usersGuide:        'Users',
  nodesAndFieldsDev: 'Database',
  importExport:      'ArchiveRestore',
  emailSetup:        'Mail',
  webMigrationDev:   'Globe',
  multiProjectDev:   'Layers',
  installation:      'Terminal',
  media:             'Image',
  storageSetup:      'HardDrive',
  apiForDevs:      'Code',
  apiSchema:       'Network',
  relations:       'GitMerge',
}

export function DocsSidebar({ sections, activeId, onSelect, showLang = false, currentLocale = 'en' }: DocsSidebarProps) {
  const [navOpen,    setNavOpen]    = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [devOpen, setDevOpen]       = useState(() => DEV_SET.has(activeId))

  useEffect(() => {
    if (DEV_SET.has(activeId)) setDevOpen(true)
  }, [activeId])

  const activeLabel = sections[activeId as keyof DocsSections] ?? ''

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <div
        className="hidden md:flex relative shrink-0 h-full border-r border-border bg-surface overflow-hidden"
        style={{
          width:      navOpen ? '16rem' : '2.75rem',
          transition: navOpen
            ? 'width 320ms cubic-bezier(0.34,1.56,0.64,1)'   // spring open
            : 'width 200ms cubic-bezier(0.55,0,1,0.45)',      // snap closed
        }}
      >
        {/* ── Expanded nav content ─────────────────────────────────── */}
        <nav
          aria-label="Documentation navigation"
          className="absolute inset-0 flex flex-col overflow-y-auto"
          style={{
            opacity:    navOpen ? 1 : 0,
            transform:  navOpen ? 'translateX(0)' : 'translateX(-8px)',
            transition: navOpen
              ? 'opacity 180ms ease-out 140ms, transform 180ms ease-out 140ms'
              : 'opacity 80ms ease-in, transform 80ms ease-in',
            pointerEvents: navOpen ? 'auto' : 'none',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <span className="font-mono text-[10px] text-muted/60 uppercase tracking-widest select-none">Docs</span>
            <button
              onClick={() => setNavOpen(false)}
              className="text-muted hover:text-text transition-colors cursor-pointer"
              aria-label="Collapse navigation"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          <div className="py-2 flex-1">
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
            <div className="mt-2 mx-2 rounded-lg border border-accent/20 bg-accent/5 overflow-hidden">
              <button
                onClick={() => setDevOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-accent/70 group-hover:text-accent transition-colors select-none" aria-hidden="true">
                    &gt;<span style={{ animation: 'cursor-blink 1s steps(1) infinite' }}>_</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-accent/70 group-hover:text-accent transition-colors font-semibold">
                    Developer
                  </span>
                </div>
                <span className="inline-flex transition-transform duration-300" style={{ transform: devOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <Icon name="ChevronDown" size="sm" className="text-accent/50 group-hover:text-accent transition-colors" />
                </span>
              </button>
              <div style={{ maxHeight: devOpen ? '600px' : '0px', overflow: 'hidden', transition: 'max-height 300ms ease-out' }}>
                {DEV_IDS.map((id) => {
                  const active = id === activeId
                  return (
                    <button
                      key={id}
                      onClick={() => onSelect(id)}
                      className={[
                        'w-full flex items-center gap-2.5 pl-5 pr-3 py-2 text-left transition-colors cursor-pointer',
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

        {/* ── Collapsed icon strip — entire bar is clickable ───────── */}
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Expand navigation"
          className="absolute inset-0 flex flex-col items-center pt-3 gap-3 cursor-pointer hover:bg-surface-2/40 transition-colors"
          style={{
            opacity:    navOpen ? 0 : 1,
            transition: navOpen
              ? 'opacity 80ms ease-in'
              : 'opacity 160ms ease-out 170ms',
            pointerEvents: navOpen ? 'none' : 'auto',
          }}
        >
          <PanelLeftOpen size={16} className="text-muted" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <Icon
            name={ICONS[activeId as SectionId] ?? 'FileText'}
            size="sm"
            className="text-primary/70"
          />
        </button>
      </div>

      {/* ── Mobile accordion trigger ───────────────────────────────────── */}
      <div className="flex md:hidden shrink-0 flex-col border-b border-border bg-surface sticky top-0 z-20 relative">
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

        {/* Language selector — floats below the bar, right-aligned, no background */}
        {showLang && (
          <div className="absolute top-full right-3 z-30 pt-1.5">
            <LanguageSelectorWrapper defaultLocale={currentLocale} />
          </div>
        )}

        {/* Animated content */}
        <div
          style={{
            maxHeight:  mobileOpen ? '70vh' : '0px',
            opacity:    mobileOpen ? 1 : 0,
            overflowY:  mobileOpen ? 'auto' : 'hidden',
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
