'use client'

import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/atoms/Icon'
import { BottomTabBar } from '@/components/ui/molecules/BottomTabBar'
import { BottomSheet } from '@/components/ui/molecules/BottomSheet'
import { NodeCreationPanel } from '@/components/ui/organisms/NodeCreationPanel'
import { FieldEditPanel } from '@/components/ui/organisms/FieldEditPanel'
import { SettingsPanel } from '@/components/ui/organisms/SettingsPanel'
import { BrandFooter } from '@/components/ui/atoms/BrandFooter'
import { useUIStore } from '@/lib/stores/uiStore'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { MobileNodeList } from '@/components/ui/molecules/MobileNodeList'
import type { Dictionary } from '@/locales/en'
import type { SectionKey } from '@/types/roles'

export type MobileLayoutProps = {
  children: React.ReactNode
  projectName: string
  userInitials: string
  isStorageConfigured: boolean
  userEmail: string
  userId: string
  isSuperAdmin: boolean
  isAdmin: boolean
  settingsDict: Dictionary['settings']
  sectionPermissions: Partial<Record<SectionKey, boolean>>
}

export function MobileLayout({
  children,
  projectName,
  userInitials,
  isStorageConfigured,
  userEmail,
  userId,
  isSuperAdmin,
  isAdmin,
  settingsDict,
  sectionPermissions,
}: MobileLayoutProps) {
  const router = useRouter()
  const creationPanelOpen = useUIStore((s) => s.creationPanelOpen)
  const parentId          = useUIStore((s) => s.parentId)
  const breadcrumb        = useUIStore((s) => s.breadcrumb)
  const canAccessBuilder  = useUIStore((s) => s.canAccessBuilder)
  const editingFieldId    = useUIStore((s) => s.editingFieldId)
  const closeFieldEdit    = useUIStore((s) => s.closeFieldEdit)
  const settingsOpen      = useUIStore((s) => s.settingsOpen)
  const closeSettings     = useUIStore((s) => s.closeSettings)
  const d                 = useUIStore((s) => s.cmsDict)

  useKeyboardShortcuts()

  const parentSegment = breadcrumb.length > 0 ? breadcrumb.at(-2) : null

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      {/* Mobile header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
        {breadcrumb.length > 0 && (
          <button
            onClick={() => router.back()}
            className="text-muted hover:text-text transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <Icon name="ChevronLeft" size="md" />
          </button>
        )}
        <span className="font-mono text-xs text-muted truncate">
          {parentSegment ? `${parentSegment.name} /` : projectName}
        </span>
        {breadcrumb.length > 0 && (
          <span className="font-mono text-xs text-text truncate">
            {breadcrumb.at(-1)?.name}
          </span>
        )}
        <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/40 text-primary font-mono text-xs">
          {userInitials}
        </span>
      </header>

      {/* Hidden: renders BreadcrumbSetter + seeds nodeBoard store via InfiniteCanvas */}
      <div className="sr-only" aria-hidden="true">{children}</div>

      {/* Scrollable node list — sorted by creation date */}
      <main className="relative flex-1 overflow-y-auto px-3 pt-3 pb-safe">
        <MobileNodeList />
      </main>

      {/* Bottom tab bar */}
      <BottomTabBar canAccessBuilder={canAccessBuilder} />

      {/* Field edit — bottom sheet */}
      <BottomSheet
        open={editingFieldId !== null}
        onClose={closeFieldEdit}
        height="half"
        title={d?.fieldEdit.title ?? 'Edit field'}
      >
        <FieldEditPanel isStorageConfigured={isStorageConfigured} asSheet />
      </BottomSheet>

      {/* Settings — full-height bottom sheet */}
      <BottomSheet
        open={settingsOpen}
        onClose={closeSettings}
        height="full"
        title={d?.topBar.account ?? 'Settings'}
      >
        <SettingsPanel
          userEmail={userEmail}
          userId={userId}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          settingsDict={settingsDict}
          sectionPermissions={sectionPermissions}
          asSheet
        />
      </BottomSheet>

      {creationPanelOpen && (
        <div className="fixed inset-0 z-40 flex items-end">
          <NodeCreationPanel parentId={parentId} />
        </div>
      )}
      <BrandFooter />
    </div>
  )
}



