'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/atoms/Icon'
import { useUIStore } from '@/lib/stores/uiStore'

export type BottomTabBarProps = {
  canAccessBuilder?: boolean
}

export function BottomTabBar({ canAccessBuilder = true }: BottomTabBarProps) {
  const pathname         = usePathname()
  const openSettings     = useUIStore((s) => s.openSettings)
  const openCreationPanel = useUIStore((s) => s.openCreationPanel)
  const openHelp         = useUIStore((s) => s.openHelp)
  const d                = useUIStore((s) => s.cmsDict)

  const isBoard   = pathname.startsWith('/cms/board')
  const isContent = pathname.startsWith('/cms/content')

  const baseTab  = 'flex flex-1 flex-col items-center justify-center gap-1 py-2 font-mono text-[10px] tracking-wide transition-colors'
  const activeTab  = 'text-primary'
  const inactiveTab = 'text-muted'

  return (
    <nav
      aria-label="Bottom navigation"
      className="flex shrink-0 border-t border-border bg-surface pb-safe"
    >
      {canAccessBuilder && (
        <Link
          href="/cms/board"
          className={`${baseTab} ${isBoard ? activeTab : inactiveTab}`}
        >
          <Icon name="LayoutTemplate" size="lg" />
          <span>{d?.dock.home ?? 'Board'}</span>
        </Link>
      )}

      <Link
        href="/cms/content"
        className={`${baseTab} ${isContent ? activeTab : inactiveTab}`}
      >
        <Icon name="FileText" size="lg" />
        <span>{d?.dock.content ?? 'Content'}</span>
      </Link>

      {canAccessBuilder && (
        <button
          type="button"
          onClick={openCreationPanel}
          className={`${baseTab} ${inactiveTab} hover:text-text cursor-pointer`}
          aria-label={d?.dock.create ?? 'Create node'}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
            <Icon name="Plus" size="lg" />
          </span>
          <span className="mt-0.5">{d?.dock.create ?? 'Create'}</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => openHelp()}
        className={`${baseTab} ${inactiveTab} hover:text-text cursor-pointer`}
        aria-label={d?.dock.help ?? 'Help'}
      >
        <Icon name="CircleHelp" size="lg" />
        <span>{d?.dock.help ?? 'Help'}</span>
      </button>

      <button
        type="button"
        onClick={() => openSettings('project')}
        className={`${baseTab} ${inactiveTab} hover:text-text cursor-pointer`}
        aria-label={d?.dock.settings ?? 'Settings'}
      >
        <Icon name="Settings" size="lg" />
        <span>{d?.dock.settings ?? 'Settings'}</span>
      </button>
    </nav>
  )
}
