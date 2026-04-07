'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useAnchoredPanel } from '@/lib/hooks/useAnchoredPanel'
import { useDragDismiss } from '@/lib/hooks/useDragDismiss'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { PanelHeader } from '@/components/ui/molecules/PanelHeader'
import { PanelDragHandle } from '@/components/ui/molecules/PanelDragHandle'
import type { NodePanelProps } from '@/types/nodePanel'

export function NodePanel({
  open,
  onClose,
  anchorRef,
  title,
  children,
  side       = 'auto',
  width      = 320,
  className,
}: NodePanelProps) {
  const panelRef  = useRef<HTMLDivElement>(null)
  const sheetRef  = useRef<HTMLDivElement>(null)
  const isMobile  = useIsMobile()

  // ── Desktop: anchored positioning ─────────────────────────────────────────
  const pos = useAnchoredPanel(anchorRef, panelRef, side, width)

  // ── Mobile: drag-to-dismiss ───────────────────────────────────────────────
  const { onPointerDown, onPointerMove, onPointerUp } = useDragDismiss(onClose)

  const handleSheetPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => onPointerMove(e, sheetRef.current),
    [onPointerMove],
  )
  const handleSheetPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => onPointerUp(e, sheetRef.current),
    [onPointerUp],
  )

  // ── Focus management ───────────────────────────────────────────────────────
  useFocusTrap(panelRef, open && !isMobile)
  useFocusTrap(sheetRef, open && isMobile)

  // Return focus to anchor on close
  useEffect(() => {
    if (!open) {
      anchorRef?.current?.focus()
    }
  }, [open, anchorRef])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  // ── Mobile: bottom sheet ───────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Click-away */}
        <div className="fixed inset-0 z-40" aria-hidden="true" onClick={onClose} />
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-xl border-t border-border bg-surface shadow-2xl animate-sheet-up"
        >
          <PanelDragHandle
            onPointerDown={onPointerDown}
            onPointerMove={handleSheetPointerMove}
            onPointerUp={handleSheetPointerUp}
          />
          <PanelHeader title={title} onClose={onClose} />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </>
    )
  }

  // ── Desktop: anchored panel ────────────────────────────────────────────────
  return (
    <>
      {/* Click-away */}
      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-panel-open="true"
        className={[
          'fixed z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl contain-panel animate-panel-unfurl',
          className,
        ].filter(Boolean).join(' ')}
        style={{
          left:            pos.x,
          top:             pos.y,
          width:           width,
          transformOrigin: pos.transformOrigin,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <PanelHeader title={title} onClose={onClose} />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}

// ── Utility: detect mobile breakpoint ─────────────────────────────────────────
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
