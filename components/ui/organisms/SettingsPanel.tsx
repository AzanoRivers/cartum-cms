'use client'

import { useEffect, useRef } from 'react'
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

export type SettingsPanelProps = {
  userEmail:    string
  userId:       string
  isSuperAdmin: boolean
  isAdmin:      boolean
  settingsDict: Dictionary['settings']
  /** When true, skips the fixed backdrop (for use inside BottomSheet on mobile) */
  asSheet?: boolean
}

type SectionKey = import('@/lib/stores/uiStore').SettingsSection

const ALL_SECTIONS: Array<{ key: SectionKey; superAdminOnly?: boolean; adminOk?: boolean }> = [
  { key: 'project',  superAdminOnly: true },
  { key: 'appearance' },
  { key: 'account'    },
  { key: 'email',    superAdminOnly: true },
  { key: 'storage',  superAdminOnly: true },
  { key: 'users',    adminOk: true },
  { key: 'roles',    superAdminOnly: true },
  { key: 'api',      adminOk: true },
  { key: 'db',       superAdminOnly: true },
  { key: 'info'      },
]

export function SettingsPanel({
  userEmail,
  userId,
  isSuperAdmin,
  isAdmin,
  settingsDict,
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
  const visibleSections = ALL_SECTIONS.filter(({ superAdminOnly, adminOk }) => {
    if (superAdminOnly) return isSuperAdmin
    if (adminOk) return isSuperAdmin || isAdmin
    return true // account: always visible
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
      {activeSection === 'project' && isSuperAdmin && (
        <ProjectSection d={d.project} />
      )}
      {activeSection === 'storage' && isSuperAdmin && (
        <StorageSection d={d.storage} />
      )}
      {activeSection === 'email' && isSuperAdmin && (
        <EmailSection d={d.email} />
      )}
      {activeSection === 'api' && (isSuperAdmin || isAdmin) && (
        <ApiTokensSection d={d.api} />
      )}
      {activeSection === 'users' && (isSuperAdmin || isAdmin) && (
        <UsersSection
          currentUserId={userId}
          isSuperAdmin={isSuperAdmin}
          d={d.users}
        />
      )}
      {activeSection === 'roles' && isSuperAdmin && (
        <RolesSection d={d.roles} />
      )}
      {activeSection === 'db' && isSuperAdmin && (
        <DbSection d={d.db} />
      )}
      {activeSection === 'info' && (
        <InfoSection d={d.info} />
      )}
    </>
  )

  // ── Sheet variant (mobile BottomSheet) ────────────────────────────────────────
  if (asSheet) {
    return (
      <VHSTransition duration="fast" trigger={open} className="flex flex-col h-full">
        {/* Horizontal scrolling tabs */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 shrink-0 no-scrollbar">
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
        </nav>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {sectionsContent}
        </div>
      </VHSTransition>
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
      {/* Panel card — floats over canvas with no backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <VHSTransition duration="fast" trigger={open} className="w-full max-w-3xl h-[82vh]">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            className="pointer-events-auto relative flex w-full h-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: tab list */}
            <nav className="w-36 shrink-0 border-r border-border p-3 space-y-0.5 overflow-y-auto">
              <p className="font-mono text-xs text-muted uppercase tracking-widest px-2 pb-2">
                {d.panelTitle}
              </p>
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
            </nav>

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
        </VHSTransition>
      </div>
    </>
  )
}
