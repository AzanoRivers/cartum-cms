'use client'

import { useRouter, usePathname } from 'next/navigation'
import { DockIcon } from '@/components/ui/molecules/DockIcon'
import { useUIStore } from '@/lib/stores/uiStore'

export function DockBar() {
  const router = useRouter()
  const pathname           = usePathname()
  const openSettings       = useUIStore((s) => s.openSettings)
  const openCreationPanel  = useUIStore((s) => s.openCreationPanel)
  const openHelp           = useUIStore((s) => s.openHelp)
  const setGlobalLoading   = useUIStore((s) => s.setGlobalLoading)
  const d                  = useUIStore((s) => s.cmsDict)
  const canAccessBuilder   = useUIStore((s) => s.canAccessBuilder)

  function goHome() {
    if (pathname === '/cms/board') return
    setGlobalLoading(true)
    router.push('/cms/board')
  }

  return (
    <nav
      aria-label="Dock"
      className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-xl border border-border bg-surface/90 px-2 py-1 shadow-lg backdrop-blur-sm"
    >
      {canAccessBuilder && (
        <DockIcon
          icon="House"
          tooltip={d?.dock.home ?? 'Home'}
          onClick={goHome}
        />
      )}
      {canAccessBuilder && (
        <DockIcon
          icon="Plus"
          tooltip={d?.dock.create ?? 'Create node'}
          onClick={() => openCreationPanel()}
        />
      )}
      <DockIcon
        icon="CircleHelp"
        tooltip={d?.dock.help ?? 'Help & Shortcuts'}
        onClick={() => openHelp()}
      />
      <DockIcon
        icon="Settings"
        tooltip={d?.dock.settings ?? 'Settings'}
        onClick={() => openSettings('project')}
      />
    </nav>
  )
}
