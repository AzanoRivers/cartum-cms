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
import { DbSection } from '@/components/ui/organisms/settings/DbSection'
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
  { key: 'project'    },
  { key: 'appearance' },
  { key: 'account'    },
  { key: 'email'      },
  { key: 'storage'    },
  { key: 'users'      },
  { key: 'roles'      },
  { key: 'api'        },
  { key: 'db'         },
  { key: 'info'       },
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
  const open          = useUIStore((s) => s.settingsOpen)
  const activeSection = useUIStore((s) => s.settingsSection)
  const openSettings  = useUIStore((s) => s.openSettings)
  const closeSettings = useUIStore((s) => s.closeSettings)

  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, !asSheet && open)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeSettings()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeSettings])

  // Filter visible sections by role
  const visibleSections = ALL_SECTIONS.filter(({ key }) => {
    if (isSuperAdmin) return true
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
      {activeSection === 'appearance' && (
        <AppearanceSection d={d.appearance} />
      )}
      {activeSection === 'project' && (isSuperAdmin || sectionPermissions.project) && (
        <ProjectSection d={d.project} />
      )}
      {activeSection === 'storage' && (isSuperAdmin || sectionPermissions.storage) && (
        <StorageSection d={d.storage} />
      )}
      {activeSection === 'email' && (isSuperAdmin || sectionPermissions.email) && (
        <EmailSection d={d.email} />
      )}
      {activeSection === 'api' && (isSuperAdmin || isAdmin || sectionPermissions.api) && (
        <ApiTokensSection d={d.api} />
      )}
      {activeSection === 'users' && (isSuperAdmin || isAdmin || sectionPermissions.users) && (
        <UsersSection
          currentUserId={userId}
          isSuperAdmin={isSuperAdmin}
          d={d.users}
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
        <DbSection d={d.db} isSuperAdmin={isSuperAdmin} />
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
        onClick={closeSettings}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <VHSTransition duration="fast" trigger={open} className="w-full max-w-3xl h-[82vh]">
          <DialogContent
            panelRef={panelRef}
            visibleSections={visibleSections}
            activeSection={activeSection}
            openSettings={openSettings}
            closeSettings={closeSettings}
            d={d}
            sectionsContent={sectionsContent}
          />
        </VHSTransition>
      </div>
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
            <button
              key={key}
              onClick={() => openSettings(key)}
              className={[
                'shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer',
                activeSection === key
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted hover:text-text hover:bg-surface-2',
              ].join(' ')}
            >
              {d.nav[key as keyof typeof d.nav] ?? key}
            </button>
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
          width: navOpen ? '9rem' : '2.5rem',
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
          {visibleSections.map(({ key }) => (
            <button
              key={key}
              onClick={() => openSettings(key)}
              className={[
                'w-full text-left px-2 py-1.5 rounded-md font-mono text-xs transition-colors cursor-pointer',
                activeSection === key
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted hover:text-text hover:bg-surface-2',
              ].join(' ')}
            >
              {d.nav[key as keyof typeof d.nav] ?? key}
            </button>
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
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
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
