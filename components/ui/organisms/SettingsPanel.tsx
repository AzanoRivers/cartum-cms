'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
// Note: useState still used in DialogContent
import { createPortal } from 'react-dom'
import {
  PanelLeftClose, PanelLeftOpen,
  LayoutGrid, CreditCard, Palette, UserCircle, Mail, HardDrive,
  UserCog, ShieldCheck, KeyRound, Database, Globe, Info,
  UsersRound, FolderKanban, Variable, Settings2, HelpCircle, DatabaseZap,
  type LucideIcon,
} from 'lucide-react'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { useUIStore } from '@/lib/stores/uiStore'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { AccountSection } from '@/components/ui/organisms/settings/AccountSection'
import { AppearanceSection } from '@/components/ui/organisms/settings/AppearanceSection'
import { ProjectSection } from '@/components/ui/organisms/settings/ProjectSection'
import { StorageSection } from '@/components/ui/organisms/settings/StorageSection'
import { EmailSection } from '@/components/ui/organisms/settings/EmailSection'
import { ApiTokensSection } from '@/components/ui/organisms/settings/ApiTokensSection'
import { UsersSection } from '@/components/ui/organisms/settings/UsersSection'
import { RolesSection } from '@/components/ui/organisms/settings/RolesSection'
import { InfoSection } from '@/components/ui/organisms/settings/InfoSection'
import { WebMigrationSection } from '@/components/ui/organisms/settings/WebMigrationSection'
import { DbSection } from '@/components/ui/organisms/settings/DbSection'
import { SubscriptionSection } from '@/components/ui/organisms/settings/SubscriptionSection'
import { MembersSection } from '@/components/ui/organisms/settings/MembersSection'
import { CartumProjectsSection } from '@/components/ui/organisms/settings/CartumProjectsSection'
import { EnvVarsSection } from '@/components/ui/organisms/settings/EnvVarsSection'
import { DefaultSection } from '@/components/ui/organisms/settings/DefaultSection'
import { HelpSection } from '@/components/ui/organisms/settings/HelpSection'
import { SuperDbSection } from '@/components/ui/organisms/settings/SuperDbSection'
import type { Dictionary } from '@/locales/en'
import type { SectionKey, SectionAccess } from '@/types/roles'

export type SettingsPanelProps = {
  userEmail:          string
  userId:             string
  isSuperAdmin:       boolean
  isAdmin:            boolean
  settingsDict:       Dictionary['settings']
  sectionPermissions: Partial<Record<SectionKey, SectionAccess>>
  asSheet?: boolean
}

const SUPER_ONLY_KEYS: SectionKey[] = ['defaults', 'cartumProjects', 'users', 'variables', 'superDb']

const SECTION_ICONS: Record<SectionKey, LucideIcon> = {
  project:        LayoutGrid,
  subscription:   CreditCard,
  appearance:     Palette,
  account:        UserCircle,
  email:          Mail,
  storage:        HardDrive,
  members:        UsersRound,
  roles:          ShieldCheck,
  api:            KeyRound,
  db:             Database,
  webMigration:   Globe,
  help:           HelpCircle,
  info:           Info,
  cartumProjects: FolderKanban,
  users:          UserCog,
  variables:      Variable,
  defaults:       Settings2,
  superDb:        DatabaseZap,
}

const ALL_SECTIONS: Array<{ key: SectionKey }> = [
  { key: 'project'         },
  { key: 'subscription'    },
  { key: 'appearance'      },
  { key: 'account'         },
  { key: 'members'         },
  { key: 'email'           },
  { key: 'storage'         },
  { key: 'roles'           },
  { key: 'api'             },
  { key: 'db'              },
  { key: 'webMigration'    },
  { key: 'help'            },
  { key: 'info'            },
  // superAdmin-only zone
  { key: 'cartumProjects'  },
  { key: 'users'           },
  { key: 'variables'       },
  { key: 'defaults'        },
  { key: 'superDb'         },
]

export function SettingsPanel({
  userEmail,
  userId,
  isSuperAdmin,
  isAdmin,
  settingsDict,
  sectionPermissions,
  asSheet = false,
}: SettingsPanelProps) {
  const open                = useUIStore((s) => s.settingsOpen)
  const activeSection       = useUIStore((s) => s.settingsSection)
  const openSettings        = useUIStore((s) => s.openSettings)
  const closeSettings       = useUIStore((s) => s.closeSettings)
  const migrationActive     = useUIStore((s) => s.migrationActive)
  const cancelMigrationFn   = useUIStore((s) => s.cancelMigrationFn)

  const [showCloseDialog, setShowCloseDialog] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, !asSheet && open)

  function requestClose() {
    if (migrationActive) {
      setShowCloseDialog(true)
    } else {
      closeSettings()
    }
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, migrationActive]) // eslint-disable-line react-hooks/exhaustive-deps

  const ADMIN_SECTIONS: SectionKey[] = ['email', 'members', 'api', 'roles', 'webMigration']
  const PUBLIC_SECTIONS: SectionKey[] = ['subscription', 'account', 'appearance', 'help']
  const SUPER_ONLY: SectionKey[]      = ['defaults', 'cartumProjects', 'users', 'variables', 'superDb']

  // Helper: resolve canView and canActions for a section.
  // super_admin and project admin always get full access — DB restrictions only apply to non-admin roles.
  const canView = (key: SectionKey): boolean => {
    if (isSuperAdmin || isAdmin) return true
    return sectionPermissions[key]?.canView === true
  }
  const canActions = (key: SectionKey): boolean => {
    if (isSuperAdmin || isAdmin) return true
    const access = sectionPermissions[key]
    if (access !== undefined) return access.canActions
    return false
  }

  // Filter visible sections by role
  const visibleSections = ALL_SECTIONS.filter(({ key }) => {
    if (SUPER_ONLY.includes(key)) return isSuperAdmin
    if (isSuperAdmin || isAdmin) return !SUPER_ONLY.includes(key)
    if (PUBLIC_SECTIONS.includes(key)) return true
    return sectionPermissions[key]?.canView === true
  })

  if (!open) return null

  const d = settingsDict

  // Shared sections content (reused in both variants)
  const sectionsContent = (
    <>
      {activeSection === 'account' && (
        <AccountSection currentEmail={userEmail} d={d.account} canActions={canActions('account')} />
      )}
      {activeSection === 'subscription' && (
        <SubscriptionSection d={d.subscription} userEmail={userEmail} />
      )}
      {activeSection === 'appearance' && (
        <AppearanceSection d={d.appearance} canActions={canActions('appearance')} />
      )}
      {activeSection === 'project' && canView('project') && (
        <ProjectSection d={d.project} loadingText={d.loading} canActions={canActions('project')} />
      )}
      {activeSection === 'storage' && canView('storage') && (
        <StorageSection d={d.storage} isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} loadingText={d.loading} canActions={canActions('storage')} />
      )}
      {activeSection === 'email' && canView('email') && (
        <EmailSection isSuperAdmin={isSuperAdmin} d={d.email} loadingText={d.loading} canActions={canActions('email')} />
      )}
      {activeSection === 'api' && canView('api') && (
        <ApiTokensSection d={d.api} loadingText={d.loading} canActions={canActions('api')} />
      )}
      {activeSection === 'members' && canView('members') && (
        <MembersSection
          userId={userId}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          d={d.members}
          loadingText={d.loading}
          canActions={canActions('members')}
        />
      )}
      {activeSection === 'users' && isSuperAdmin && (
        <UsersSection
          currentUserId={userId}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          d={d.users}
          loadingText={d.loading}
        />
      )}
      {activeSection === 'roles' && canView('roles') && (
        <RolesSection
          d={d.roles}
          navDict={d.nav}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          canActions={canActions('roles')}
        />
      )}
      {activeSection === 'db' && canView('db') && (
        <DbSection d={d.db} isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} canActions={canActions('db')} />
      )}
      {activeSection === 'webMigration' && canView('webMigration') && (
        <WebMigrationSection d={d.webMigration} isSuperAdmin={isSuperAdmin} loadingText={d.loading} canActions={canActions('webMigration')} />
      )}
      {activeSection === 'defaults' && isSuperAdmin && (
        <DefaultSection d={d.defaults} loadingText={d.loading} />
      )}
      {activeSection === 'cartumProjects' && isSuperAdmin && (
        <CartumProjectsSection d={d.cartumProjects} loadingText={d.loading} />
      )}
      {activeSection === 'variables' && isSuperAdmin && (
        <EnvVarsSection d={d.variables} loadingText={d.loading} />
      )}
      {activeSection === 'superDb' && isSuperAdmin && (
        <SuperDbSection d={d.superDb} canActions={canActions('superDb')} />
      )}
      {activeSection === 'help' && (
        <HelpSection d={d.help} loadingText={d.loading} />
      )}
      {activeSection === 'info' && (
        <InfoSection d={d.info} />
      )}
    </>
  )

  // ── Sheet variant (mobile BottomSheet) ────────────────────────────────────────
  if (asSheet) {
    return (
      <SheetContent
        visibleSections={visibleSections}
        activeSection={activeSection}
        openSettings={openSettings}
        d={d}
        sectionsContent={sectionsContent}
      />
    )
  }

  // ── Dialog variant (desktop floating panel) ───────────────────────────────────
  return (
    <>
      {/* Invisible click-away target */}
      <div
        className="fixed inset-0 z-40"
        aria-hidden="true"
        onClick={requestClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none pb-14 sm:pb-0">
        <VHSTransition duration="fast" trigger={open} className="w-full max-w-[60rem] h-[82vh]">
          <DialogContent
            panelRef={panelRef}
            visibleSections={visibleSections}
            activeSection={activeSection}
            openSettings={openSettings}
            closeSettings={requestClose}
            d={d}
            sectionsContent={sectionsContent}
          />
        </VHSTransition>
      </div>

      {/* Close-while-running warning dialog (no-overlay, above settings panel) */}
      {showCloseDialog && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            aria-hidden="true"
            onClick={() => setShowCloseDialog(false)}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none p-4">
            <VHSTransition duration="fast" className="w-full max-w-sm">
              <div
                role="dialog"
                aria-modal="true"
                className="pointer-events-auto rounded-xl border border-warning/40 bg-surface shadow-2xl p-5 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-mono text-sm font-semibold text-text">
                  {d.webMigration.closeDialog.title}
                </h3>
                <p className="font-mono text-xs text-muted leading-relaxed">
                  {d.webMigration.closeDialog.message}
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCloseDialog(false)}
                    className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text transition-colors cursor-pointer"
                  >
                    {d.webMigration.closeDialog.stay}
                  </button>
                  <button
                    onClick={() => { cancelMigrationFn?.(); setShowCloseDialog(false); closeSettings() }}
                    className="rounded-md bg-warning/90 px-4 py-1.5 font-mono text-xs text-white hover:bg-warning transition-colors cursor-pointer"
                  >
                    {d.webMigration.closeDialog.cancelAndClose}
                  </button>
                </div>
              </div>
            </VHSTransition>
          </div>
        </>
      )}
    </>
  )
}

// ── SheetContent (mobile) ─────────────────────────────────────────────────────
// Extracted so it can hold local `navOpen` state without re-rendering the parent

type SheetContentProps = {
  visibleSections:  Array<{ key: SectionKey }>
  activeSection:    SectionKey
  openSettings:     (key: SectionKey) => void
  d:                SettingsPanelProps['settingsDict']
  sectionsContent:  ReactNode
}

function SheetContent({ visibleSections, activeSection, openSettings, d, sectionsContent }: SheetContentProps) {
  return (
    <VHSTransition duration="fast" className="flex flex-col h-full">
      {/* Horizontal scrolling tabs — always visible */}
      <div className="shrink-0 border-b border-border">
        <div className="flex gap-1 overflow-x-auto no-scrollbar px-3 py-2">
          {visibleSections.map(({ key }) => (
            <div key={key} className="flex items-center shrink-0">
              {key === 'cartumProjects' && (
                <div className="flex items-center self-stretch mr-1">
                  <div className="w-px h-4 bg-warning/30 mx-1" />
                  <span className="font-mono text-[8px] text-warning/45 uppercase tracking-widest select-none">sa</span>
                  <div className="w-px h-4 bg-warning/30 mx-1" />
                </div>
              )}
              <button
                onClick={() => openSettings(key)}
                className={[
                  'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer',
                  activeSection === key
                    ? 'bg-select/15 text-select border border-select/20'
                    : 'text-muted hover:text-text hover:bg-surface-2',
                ].join(' ')}
              >
                {(() => {
                  const SectionIcon = SECTION_ICONS[key]
                  return <SectionIcon size={13} className="shrink-0 opacity-70" />
                })()}
                {d.nav[key as keyof typeof d.nav] ?? key}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">
        {sectionsContent}
      </div>
    </VHSTransition>
  )
}

// ── DialogContent (desktop/dialog) ────────────────────────────────────────────

type DialogContentProps = {
  panelRef:        RefObject<HTMLDivElement | null>
  visibleSections: Array<{ key: SectionKey }>
  activeSection:   SectionKey
  openSettings:    (key: SectionKey) => void
  closeSettings:   () => void
  d:               SettingsPanelProps['settingsDict']
  sectionsContent: ReactNode
}

const NAV_OPEN_STORAGE_KEY = 'cartum:settingsNavOpen'
const NAV_OPEN_DEFAULT_BREAKPOINT = 768 // Tailwind's `md` — narrower defaults to collapsed

function readStoredNavOpen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = window.localStorage.getItem(NAV_OPEN_STORAGE_KEY)
    if (stored !== null) return stored === '1'
  } catch {
    return true
  }
  // No explicit preference saved yet — default collapsed on narrow screens.
  return window.innerWidth >= NAV_OPEN_DEFAULT_BREAKPOINT
}

function DialogContent({
  panelRef, visibleSections, activeSection, openSettings, closeSettings, d, sectionsContent,
}: DialogContentProps) {
  const [navOpen, setNavOpenState] = useState(readStoredNavOpen)

  function setNavOpen(value: boolean) {
    setNavOpenState(value)
    try {
      window.localStorage.setItem(NAV_OPEN_STORAGE_KEY, value ? '1' : '0')
    } catch {
      // per-viewer convenience only — safe to ignore (private mode, blocked storage, etc.)
    }
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      className="pointer-events-auto relative flex w-full h-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Left: collapsible nav — width springs open, snaps closed */}
      <div
        className="relative h-full shrink-0 border-r border-border overflow-hidden"
        style={{
          width: navOpen ? '11.5rem' : '2.5rem',
          transition: navOpen
            ? 'width 320ms var(--ease-spring)'
            : 'width 200ms var(--ease-in-expo)',
        }}
      >
        {navOpen ? (
          /* Expanded content */
          <div className="flex h-full flex-col">
            {/* Sticky header — stays fixed while nav list scrolls */}
            <div className="shrink-0 flex items-center justify-between px-3 pt-3 pb-2 border-b border-border/20 bg-surface">
              <p className="font-mono text-xs text-muted uppercase tracking-widest">
                {d.panelTitle}
              </p>
              <IconTooltipButton
                label={d.collapseNav}
                onClick={() => setNavOpen(false)}
                className="text-muted hover:text-text transition-colors cursor-pointer"
              >
                <PanelLeftClose size={18} />
              </IconTooltipButton>
            </div>

            {/* Scrollable nav list */}
            <div className="flex-1 overflow-y-auto p-3 pt-2 space-y-0.5">
            {visibleSections.map(({ key }, i) => (
              <div key={key} className={i < visibleSections.length - 1 ? 'border-b border-border/20' : ''}>
                {key === 'cartumProjects' && (
                  <div className="flex items-center gap-1.5 px-2 py-2">
                    <div className="flex-1 h-px bg-warning/25" />
                    <span className="font-mono text-[9px] text-warning/50 uppercase tracking-widest select-none">super_admin</span>
                    <div className="flex-1 h-px bg-warning/25" />
                  </div>
                )}

                <button
                  onClick={() => openSettings(key)}
                  className={[
                    'w-full flex items-center gap-1.5 text-left px-2 py-1.5 rounded-md font-mono text-xs transition-colors cursor-pointer',
                    activeSection === key
                      ? 'bg-select/15 text-select border border-select/20'
                      : 'text-muted hover:text-text hover:bg-surface-2',
                  ].join(' ')}
                >
                  {(() => {
                    const SectionIcon = SECTION_ICONS[key]
                    return <SectionIcon size={13} className="shrink-0 opacity-70" />
                  })()}
                  <span className="truncate">{d.nav[key as keyof typeof d.nav] ?? key}</span>
                </button>
              </div>
            ))}
            </div>{/* end scrollable nav list */}
          </div>
        ) : (
          /* Collapsed bar — icon-only nav, click an icon to jump to that section */
          <div className="flex h-full flex-col items-center pt-3 gap-1 overflow-y-auto no-scrollbar">
            <IconTooltipButton
              label={d.expandNav}
              onClick={() => setNavOpen(true)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <PanelLeftOpen size={16} />
            </IconTooltipButton>

            <div className="mt-1 flex w-full flex-1 flex-col items-center gap-1">
              {visibleSections.map(({ key }) => {
                const SectionIcon = SECTION_ICONS[key]
                const label = d.nav[key as keyof typeof d.nav] ?? key
                return (
                  <CollapsedNavIcon
                    key={key}
                    icon={SectionIcon}
                    label={label}
                    active={activeSection === key}
                    onClick={() => openSettings(key)}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right: section content */}
      <div className="flex-1 overflow-y-auto p-6">
        {sectionsContent}
      </div>

      {/* Close button */}
      <button
        onClick={closeSettings}
        aria-label="Close settings"
        className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer font-mono text-xs"
      >
        ✕
      </button>
    </div>
  )
}

// ── IconTooltipButton ──────────────────────────────────────────────────────────
// The collapsed nav strip (and the collapse/expand toggle inside it) clips
// regular absolute-positioned tooltips — it's nested inside
// `overflow-hidden`/`overflow-y-auto` ancestors — so this portals the label
// straight to <body>, positioned from the button's own rect.

type IconTooltipButtonProps = {
  label:     string
  onClick:   () => void
  className: string
  children:  ReactNode
}

function IconTooltipButton({ label, onClick, className, children }: IconTooltipButtonProps) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const show = () => {
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) setCoords({ top: rect.top + rect.height / 2, left: rect.right + 8 })
  }
  const hide = () => setCoords(null)

  // The dialog's focus trap auto-focuses the first focusable button as soon as
  // it opens — a plain programmatic `.focus()`, which browsers don't mark as
  // `:focus-visible`. Gating on that keeps the tooltip from flashing on open
  // while still showing it for real keyboard (Tab) navigation.
  const onFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    if (e.currentTarget.matches(':focus-visible')) show()
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={onClick}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={onFocus}
        onBlur={hide}
        aria-label={label}
        className={className}
      >
        {children}
      </button>
      {coords && typeof document !== 'undefined' && createPortal(
        <span
          role="tooltip"
          className="fixed z-[80] -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-text shadow-lg pointer-events-none"
          style={{ top: coords.top, left: coords.left }}
        >
          {label}
        </span>,
        document.body,
      )}
    </>
  )
}

type CollapsedNavIconProps = {
  icon:    LucideIcon
  label:   string
  active:  boolean
  onClick: () => void
}

function CollapsedNavIcon({ icon: Icon, label, active, onClick }: CollapsedNavIconProps) {
  return (
    <IconTooltipButton
      label={label}
      onClick={onClick}
      className={[
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors cursor-pointer',
        active
          ? 'bg-select/15 text-select border border-select/20'
          : 'text-muted hover:text-text hover:bg-surface-2',
      ].join(' ')}
    >
      <Icon size={14} className="opacity-80" />
    </IconTooltipButton>
  )
}
