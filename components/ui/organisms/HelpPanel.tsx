'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/lib/stores/uiStore'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { Icon } from '@/components/ui/atoms/Icon'

type ShortcutRow = {
  keys: string
  description: string
}

type ShortcutGroup = {
  category: string
  rows: ShortcutRow[]
}

type GestureRow = {
  icon: string
  description: string
}

// ── Mobile detection (same breakpoint as NodePanel) ───────────────────────────
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

export function HelpPanel() {
  const open            = useUIStore((s) => s.helpOpen)
  const closeHelp       = useUIStore((s) => s.closeHelp)
  const setGlobalLoading = useUIStore((s) => s.setGlobalLoading)
  const d               = useUIStore((s) => s.cmsDict)
  const router          = useRouter()
  const isMobile  = useIsMobile()

  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, open)

  if (!open || !d) return null

  const h = d.help

  const shortcutGroups: ShortcutGroup[] = [
    {
      category: h.categoryNav,
      rows: [
        h.shortcuts.goHome,
        h.shortcuts.goContent,
        h.shortcuts.newNode,
        h.shortcuts.openSettings,
      ],
    },
    {
      category: h.categoryPanels,
      rows: [
        h.shortcuts.closeOverlay,
      ],
    },
  ]

  const gestureRows: GestureRow[] = [
    h.gestures.singleTap,
    h.gestures.doubleTap,
    h.gestures.longPress,
    h.gestures.portDrag,
    h.gestures.pinch,
    h.gestures.panCanvas,
  ]

  return (
    <>
      {/* Invisible click-away target */}
      <div
        className="fixed inset-0 z-40"
        aria-hidden="true"
        onClick={closeHelp}
      />
      {/* Panel — floats over canvas with no backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <VHSTransition duration="fast" trigger={open} className="w-full max-w-md">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={h.title}
            className="pointer-events-auto relative w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <VHSTransition duration="fast" trigger={open} className="contents">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-2">
                    <Icon name="CircleHelp" size="sm" className="text-primary" />
                  </div>
                  <span className="font-mono text-sm font-medium text-text">{h.title}</span>
                </div>
                <button
                  onClick={closeHelp}
                  aria-label={h.close}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-border font-mono text-xs text-muted transition-colors hover:border-border/80 hover:text-text cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* ── Docs button ───────────────────────────────────────── */}
                <button
                  onClick={() => { closeHelp(); setGlobalLoading(true); router.push('/cms/docs') }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 py-2.5 font-mono text-xs text-text transition-colors hover:border-primary/40 hover:bg-surface-2/80 cursor-pointer"
                >
                  <Icon name="BookOpen" size="sm" className="text-primary" />
                  {h.docsButton}
                </button>
                {/* ── Mobile: gesture guide ─────────────────────────────── */}
                {isMobile && (
                  <div className="space-y-2">
                    <p className="font-mono text-xs uppercase tracking-widest text-muted">
                      {h.gesturesTitle}
                    </p>
                    <div className="overflow-hidden rounded-lg border border-border">
                      {gestureRows.map((row, i) => (
                        <div
                          key={row.description}
                          className={[
                            'flex items-center gap-3 px-4 py-2.5',
                            i < gestureRows.length - 1 ? 'border-b border-border' : '',
                            'bg-surface-2/40 hover:bg-surface-2 transition-colors',
                          ].join(' ')}
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface font-mono text-base"
                            aria-hidden="true"
                          >
                            {row.icon}
                          </span>
                          <span className="text-xs text-muted">{row.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Desktop: keyboard shortcuts (hidden on mobile) ────── */}
                {!isMobile && (
                  <>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted">
                      {h.shortcutsTitle}
                    </p>

                    {shortcutGroups.map((group) => (
                      <div key={group.category} className="space-y-2">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                          {group.category}
                        </p>
                        <div className="overflow-hidden rounded-lg border border-border">
                          {group.rows.map((row, i) => (
                            <div
                              key={row.keys}
                              className={[
                                'flex items-center justify-between px-4 py-2.5 gap-4',
                                i < group.rows.length - 1 ? 'border-b border-border' : '',
                                'bg-surface-2/40 hover:bg-surface-2 transition-colors',
                              ].join(' ')}
                            >
                              <span className="text-xs text-muted">{row.description}</span>
                              <KbdSequence keys={row.keys} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </VHSTransition>
          </div>
        </VHSTransition>
      </div>
    </>
  )
}

/** Renders a sequence like "G → H" as a series of <kbd> chips */
function KbdSequence({ keys }: { keys: string }) {
  const parts = keys.split(' → ')
  return (
    <span className="flex items-center gap-1 shrink-0">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <span className="font-mono text-[11px] text-muted">+</span>
          )}
          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface px-1.5 font-mono text-[10px] text-text shadow-[0_1px_0_var(--color-border)]">
            {part}
          </kbd>
        </span>
      ))}
    </span>
  )
}
