'use client'

import { TopBar } from '@/components/ui/organisms/TopBar'
import { DockBar } from '@/components/ui/organisms/DockBar'
import { NodeCreationPanel } from '@/components/ui/organisms/NodeCreationPanel'
import { SettingsPanel } from '@/components/ui/organisms/SettingsPanel'
import { HelpPanel } from '@/components/ui/organisms/HelpPanel'
import { BrandFooter } from '@/components/ui/atoms/BrandFooter'
import { MobileBreadcrumbBar } from '@/components/ui/molecules/MobileBreadcrumbBar'
import { useUIStore } from '@/lib/stores/uiStore'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import type { Dictionary } from '@/locales/en'
import type { SectionKey } from '@/types/roles'

export type DesktopLayoutProps = {
  children: React.ReactNode
  projectName: string
  userInitials: string
  userEmail: string
  userId: string
  isSuperAdmin: boolean
  isAdmin: boolean
  settingsDict: Dictionary['settings']
  sectionPermissions: Partial<Record<SectionKey, boolean>>
}

export function DesktopLayout({
  children,
  projectName,
  userInitials,
  userEmail,
  userId,
  isSuperAdmin,
  isAdmin,
  settingsDict,
  sectionPermissions,
}: DesktopLayoutProps) {
  const creationPanelOpen = useUIStore((s) => s.creationPanelOpen)
  const parentId = useUIStore((s) => s.parentId)

  useKeyboardShortcuts()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg">
      <TopBar projectName={projectName} userInitials={userInitials} />
      <main id="main-content" className="relative flex flex-1 overflow-hidden">
        {/* Breadcrumb bar visible only at mobile widths in responsive dev tools */}
        <div className="md:hidden">
          <MobileBreadcrumbBar />
        </div>
        {children}
        <DockBar />
        {creationPanelOpen && (
          <NodeCreationPanel parentId={parentId} />
        )}
      </main>
      <BrandFooter />
      <SettingsPanel
        userEmail={userEmail}
        userId={userId}
        isSuperAdmin={isSuperAdmin}
        isAdmin={isAdmin}
        settingsDict={settingsDict}
        sectionPermissions={sectionPermissions}
      />
      <HelpPanel />
    </div>
  )
}

