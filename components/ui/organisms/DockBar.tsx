'use client'

import { useRef, useState, useEffect } from 'react'
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

  const createBtnRef    = useRef<HTMLSpanElement>(null)
  const iconsSectionRef = useRef<HTMLDivElement>(null)
  const [collapsed,   setCollapsed]   = useState(false)
  // Half the icons section width — used to shift the nav right when collapsed
  // so the toggle button stays in its expanded position (not jumping to center).
  // Defaults to 110px (approx for a full dock); updated on first render.
  const [iconsHalfW, setIconsHalfW] = useState(110)

  const isDocs    = pathname.startsWith('/cms/docs')
  const isContent = pathname === '/cms/content'
  const isHome    = pathname === '/cms/board'

  // Measure actual icons section width while it is visible
  useEffect(() => {
    if (!collapsed && iconsSectionRef.current) {
      const w = iconsSectionRef.current.scrollWidth
      if (w > 0) setIconsHalfW(Math.round(w / 2))
    }
  }, [collapsed, canAccessBuilder, isDocs, isContent])

  function goHome() {
    if (pathname === '/cms/board') return
    setGlobalLoading(true)
    router.push('/cms/board')
  }

  function goContent() {
    if (pathname === '/cms/content') return
    setGlobalLoading(true)
    router.push('/cms/content')
  }

  return (
    <nav
      aria-label="Dock"
      className="dock-nav absolute bottom-12 left-1/2 z-30 flex items-center gap-1 rounded-xl border border-border bg-surface/90 px-2 py-1 shadow-lg backdrop-blur-sm"
      style={{
        // When collapsed: shift right by iconsHalfW so the toggle stays put.
        // When expanded: standard -50% centering.
        transform: `translateX(calc(-50% + ${collapsed ? iconsHalfW : 0}px))`,
      }}
    >
      {/*
        Icons section — clips left-to-right on collapse, right-to-left on expand.
        min-width:0 (via CSS class) is required so the flex item can shrink to 0.
        clip-path: inset(0 0 0 X%) where X 0→100 clips from left first ✓
      */}
      <div
        ref={iconsSectionRef}
        className="dock-icons-section flex items-center gap-1 overflow-hidden"
        style={{
          maxWidth: collapsed ? '0px' : '320px',
          opacity:  collapsed ? 0 : 1,
          clipPath: collapsed ? 'inset(0 0 0 100%)' : 'inset(0 0 0 0%)',
        }}
      >
        {canAccessBuilder && (
          <DockIcon
            icon="House"
            tooltip={d?.dock.home ?? 'Home'}
            active={isHome}
            onClick={goHome}
          />
        )}
        {!isDocs && !isContent && canAccessBuilder && (
          <span ref={createBtnRef}>
            <DockIcon
              icon="Plus"
              tooltip={d?.dock.create ?? 'Create node'}
              onClick={() => openCreationPanel(createBtnRef.current ?? undefined)}
            />
          </span>
        )}
        {!isDocs && (
          <DockIcon
            icon="Images"
            tooltip={d?.dock.content ?? 'Content'}
            active={isContent}
            onClick={goContent}
          />
        )}
        {!isDocs && (
          <DockIcon
            icon="CircleHelp"
            tooltip={d?.dock.help ?? 'Help & Shortcuts'}
            onClick={() => openHelp()}
          />
        )}
        <DockIcon
          icon="Settings"
          tooltip={d?.dock.settings ?? 'Settings'}
          onClick={() => openSettings('project')}
        />

        <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden="true" />
      </div>

      {/* Toggle — always visible */}
      <DockIcon
        icon={collapsed ? 'ArrowLeftFromLine' : 'ArrowRightFromLine'}
        tooltip={collapsed ? (d?.dock.expand ?? 'Expandir dock') : (d?.dock.collapse ?? 'Colapsar dock')}
        onClick={() => setCollapsed((c) => !c)}
      />
    </nav>
  )
}
