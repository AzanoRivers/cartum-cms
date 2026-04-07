'use client'

import { useRef } from 'react'
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

export function HelpPanel() {
  const open      = useUIStore((s) => s.helpOpen)
  const closeHelp = useUIStore((s) => s.closeHelp)
  const d         = useUIStore((s) => s.cmsDict)

  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, open)

  if (!open || !d) return null

  const h = d.help

  const groups: ShortcutGroup[] = [
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

          {/* Body — keyboard shortcuts */}
          <div className="p-5 space-y-5">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              {h.shortcutsTitle}
            </p>

            {groups.map((group) => (
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
  // Split on " → " to render each key separately
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
