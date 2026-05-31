'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
// Note: useState still used in DialogContent
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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
import type { Dictionary } from '@/locales/en'
import type { SectionKey } from '@/types/roles'

export type SettingsPanelProps = {
  userEmail:          string
  userId:             string
  isSuperAdmin:       boolean
  isAdmin:            boolean
  settingsDict:       Dictionary['settings']
  sectionPermissions: Partial<Record<SectionKey, boolean>>
  asSheet?: boolean
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
  { key: 'info'            },
  // superAdmin-only zone
  { key: 'cartumProjects'  },
  { key: 'users'           },
  { key: 'variables'       },
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
  const PUBLIC_SECTIONS: SectionKey[] = ['subscription', 'account', 'appearance']
  const SUPER_ONLY: SectionKey[]      = ['cartumProjects', 'users', 'variables']

  // Filter visible sections by role
  const visibleSections = ALL_SECTIONS.filter(({ key }) => {
    if (SUPER_ONLY.includes(key)) return isSuperAdmin
    if (isSuperAdmin) return true
    if (PUBLIC_SECTIONS.includes(key)) return true
    if (isAdmin && ADMIN_SECTIONS.includes(key)) return true
    return sectionPermissions[key] === true
  })

  if (!open) return null

  const d = settingsDict

  // Shared sections content (reused in both variants)
  const sectionsContent = (
    <>
      {activeSection === 'account' && (
        <AccountSection currentEmail={userEmail} d={d.account} />
      )}
      {activeSection === 'subscription' && (
        <SubscriptionSection d={d.subscription} />
      )}
      {activeSection === 'appearance' && (
        <AppearanceSection d={d.appearance} />
      )}
      {activeSection === 'project' && (isSuperAdmin || sectionPermissions.project) && (
        <ProjectSection d={d.project} loadingText={d.loading} />
      )}
      {activeSection === 'storage' && (isSuperAdmin || isAdmin || sectionPermissions.storage) && (
        <StorageSection d={d.storage} isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} loadingText={d.loading} />
      )}
      {activeSection === 'email' && (isSuperAdmin || isAdmin || sectionPermissions.email) && (
        <EmailSection isSuperAdmin={isSuperAdmin} d={d.email} loadingText={d.loading} />
      )}
      {activeSection === 'api' && (isSuperAdmin || isAdmin || sectionPermissions.api) && (
        <ApiTokensSection d={d.api} loadingText={d.loading} />
      )}
      {activeSection === 'members' && (isSuperAdmin || isAdmin || sectionPermissions.members) && (
        <MembersSection
          userId={userId}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          d={d.members}
          loadingText={d.loading}
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
      {activeSection === 'roles' && (isSuperAdmin || isAdmin || sectionPermissions.roles) && (
        <RolesSection
          d={d.roles}
          navDict={d.nav}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
        />
      )}
      {activeSection === 'db' && (isSuperAdmin || sectionPermissions.db) && (
        <DbSection d={d.db} isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} />
      )}
      {activeSection === 'webMigration' && (isSuperAdmin || isAdmin || sectionPermissions.webMigration) && (
        <WebMigrationSection d={d.webMigration} isSuperAdmin={isSuperAdmin} loadingText={d.loading} />
      )}
      {activeSection === 'cartumProjects' && isSuperAdmin && (
        <CartumProjectsSection d={d.cartumProjects} loadingText={d.loading} />
      )}
      {activeSection === 'variables' && isSuperAdmin && (
        <EnvVarsSection d={d.variables} loadingText={d.loading} />
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
        <VHSTransition duration="fast" trigger={open} className="w-full max-w-4xl h-[82vh]">
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
                  'whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer',
                  activeSection === key
                    ? 'bg-select/15 text-select border border-select/20'
                    : 'text-muted hover:text-text hover:bg-surface-2',
                ].join(' ')}
              >
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

function DialogContent({
  panelRef, visibleSections, activeSection, openSettings, closeSettings, d, sectionsContent,
}: DialogContentProps) {
  const [navOpen, setNavOpen] = useState(true)

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
          width: navOpen ? '10.5rem' : '2.5rem',
          transition: navOpen
            ? 'width 320ms var(--ease-spring)'
            : 'width 200ms var(--ease-in-expo)',
        }}
      >
        {/* Expanded content — slides+fades in after width opens */}
        <div
          className="absolute inset-0 flex flex-col p-3 space-y-0.5 overflow-y-auto"
          style={{
            opacity:   navOpen ? 1 : 0,
            transform: navOpen ? 'translateX(0)' : 'translateX(-6px)',
            transition: navOpen
              ? 'opacity 180ms var(--ease-out-expo) 140ms, transform 180ms var(--ease-out-expo) 140ms'
              : 'opacity 90ms var(--ease-in-expo), transform 90ms var(--ease-in-expo)',
            pointerEvents: navOpen ? 'auto' : 'none',
          }}
        >
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="font-mono text-xs text-muted uppercase tracking-widest">
              {d.panelTitle}
            </p>
            <button
              onClick={() => setNavOpen(false)}
              className="text-muted hover:text-text transition-colors cursor-pointer"
              aria-label="Collapse navigation"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
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
                  'w-full text-left px-2 py-1.5 rounded-md font-mono text-xs transition-colors cursor-pointer',
                  activeSection === key
                    ? 'bg-select/15 text-select border border-select/20'
                    : 'text-muted hover:text-text hover:bg-surface-2',
                ].join(' ')}
              >
                {d.nav[key as keyof typeof d.nav] ?? key}
              </button>
            </div>
          ))}
        </div>

        {/* Collapsed icon — fades in after width finishes closing */}
        <div
          className="absolute inset-0 flex flex-col items-center pt-3 gap-3"
          style={{
            opacity: navOpen ? 0 : 1,
            transition: navOpen
              ? 'opacity 80ms var(--ease-in-expo)'
              : 'opacity 160ms var(--ease-out-expo) 170ms',
            pointerEvents: navOpen ? 'none' : 'auto',
          }}
        >
          <button
            onClick={() => setNavOpen(true)}
            className="text-muted hover:text-text transition-colors cursor-pointer"
            aria-label="Expand navigation"
          >
            <PanelLeftOpen size={18} />
          </button>
          <span className="h-1.5 w-1.5 rounded-full bg-select" />
        </div>
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
