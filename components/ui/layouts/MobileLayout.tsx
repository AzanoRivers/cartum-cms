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
import type { SectionKey, SectionAccess } from '@/types/roles'
import type { ProjectItem } from '@/components/ui/molecules/ProjectSelector'

// MobileLayout mirrors DesktopLayout exactly.
// Only difference: h-dvh (dynamic viewport height) vs h-screen,
// which handles mobile browser chrome (address bar) correctly.

export type MobileLayoutProps = {
  children: React.ReactNode
  currentProject: ProjectItem
  projects: ProjectItem[]
  userInitials: string
  userEmail: string
  userId: string
  isSuperAdmin: boolean
  isAdmin: boolean
  settingsDict: Dictionary['settings']
  sectionPermissions: Partial<Record<SectionKey, SectionAccess>>
  cartumSuscriptor: boolean
  cartumSuscriptorTime: number
}

export function MobileLayout({
  children,
  currentProject,
  projects,
  userInitials,
  userEmail,
  userId,
  isSuperAdmin,
  isAdmin,
  settingsDict,
  sectionPermissions,
  cartumSuscriptor,
  cartumSuscriptorTime,
}: MobileLayoutProps) {
  const creationPanelOpen = useUIStore((s) => s.creationPanelOpen)
  const parentId          = useUIStore((s) => s.parentId)

  useKeyboardShortcuts()

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <TopBar
        currentProject={currentProject}
        projects={projects}
        userInitials={userInitials}
        isSuperAdmin={isSuperAdmin}
        cartumSuscriptor={cartumSuscriptor}
        cartumSuscriptorTime={cartumSuscriptorTime}
      />
      <main id="main-content" className="relative flex flex-1 overflow-hidden">
        <MobileBreadcrumbBar />
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
