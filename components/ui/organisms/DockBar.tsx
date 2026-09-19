'use client'

import { useRef, useState, useEffect, type SetStateAction } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { DockIcon } from '@/components/ui/molecules/DockIcon'
import { useUIStore } from '@/lib/stores/uiStore'

const DOCK_COLLAPSED_STORAGE_KEY = 'cartum:dockCollapsed'

export function DockBar() {
  const router = useRouter()
  const pathname           = usePathname()
  const openSettings       = useUIStore((s) => s.openSettings)
  const openCreationPanel  = useUIStore((s) => s.openCreationPanel)
  const openHelp           = useUIStore((s) => s.openHelp)
  const setGlobalLoading   = useUIStore((s) => s.setGlobalLoading)
  const d                  = useUIStore((s) => s.cmsDict)
  const schemaPermissions  = useUIStore((s) => s.schemaPermissions)
  const parentId           = useUIStore((s) => s.parentId)

  const createBtnRef    = useRef<HTMLSpanElement>(null)
  const iconsSectionRef = useRef<HTMLDivElement>(null)
  // Always starts collapsed — matches what the server renders (no access to
  // localStorage), so there's no hydration mismatch, and it doubles as the
  // "loading" appearance while the dashboard boots.
  const [collapsed, setCollapsedState] = useState(true)

  // Once mounted, restore the saved preference. If it was left open, this
  // flips `collapsed` to false and plays the normal expand animation.
  useEffect(() => {
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(DOCK_COLLAPSED_STORAGE_KEY)
    } catch {
      stored = null
    }
    if (stored !== '1') setCollapsedState(false)
  }, [])

  function setCollapsed(update: SetStateAction<boolean>) {
    setCollapsedState((prev) => {
      const next = typeof update === 'function' ? (update as (c: boolean) => boolean)(prev) : update
      try {
        window.localStorage.setItem(DOCK_COLLAPSED_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // per-viewer convenience only — safe to ignore (private mode, blocked storage, etc.)
      }
      return next
    })
  }
  // Half the icons section width — used to shift the nav right when collapsed
  // so the toggle button stays in its expanded position (not jumping to center).
  // Defaults to 110px (approx for a full dock); updated on first render.
  const [iconsHalfW, setIconsHalfW] = useState(110)

  const isDocs    = pathname.startsWith('/cms/docs') || pathname.startsWith('/docs')
  const isContent = pathname === '/cms/content'
  const isHome    = pathname === '/cms/board'

  // Measure actual icons section width while it is visible
  useEffect(() => {
    if (!collapsed && iconsSectionRef.current) {
      const w = iconsSectionRef.current.scrollWidth
      if (w > 0) setIconsHalfW(Math.round(w / 2))
    }
  }, [collapsed, schemaPermissions.canCreate, isDocs, isContent])

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
      className="dock-nav absolute bottom-12 left-1/2 z-30 flex items-center gap-1 rounded-xl border border-border bg-surface/90 px-2 py-1.5 shadow-lg backdrop-blur-sm"
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
        className="dock-icons-section flex items-center gap-1"
        style={{
          maxWidth:      collapsed ? '0px' : '320px',
          opacity:       collapsed ? 0 : 1,
          // bottom inset: -100px (not 0) — a flush 0 clipped the focus ring's
          // offset poking out below each icon, even though top already had
          // the same generous allowance. Only left/right actually drive the
          // slide reveal animation; top/bottom just need room to not clip.
          WebkitClipPath: collapsed ? 'inset(-100px 0 0 100%)' : 'inset(-100px 0 -100px -100px)',
          clipPath:       collapsed ? 'inset(-100px 0 0 100%)' : 'inset(-100px 0 -100px -100px)',
          overflow:      collapsed ? 'hidden' : 'visible',
          pointerEvents: collapsed ? 'none' : undefined,
        }}
      >
        <DockIcon
          icon="House"
          tooltip={d?.dock.home ?? 'Home'}
          active={isHome}
          onClick={goHome}
        />
        {!isDocs && !isContent && schemaPermissions.canCreate && (
          <span ref={createBtnRef}>
            <DockIcon
              icon="Plus"
              tooltip={parentId !== null ? (d?.dock.createInContainer ?? 'Create deck or card') : (d?.dock.create ?? 'Create deck')}
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
            icon="CircleQuestionMark"
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
