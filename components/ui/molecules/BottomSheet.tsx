'use client'

import { useEffect, useRef, useState } from 'react'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import type { ReactNode } from 'react'

export type BottomSheetProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 'half' ~50vh  |  'full' ~95vh */
  height?: 'half' | 'full'
  title?: string
}

export function BottomSheet({
  open,
  onClose,
  children,
  height = 'half',
  title,
}: BottomSheetProps) {
  const sheetRef      = useRef<HTMLDivElement>(null)
  const startYRef     = useRef<number | null>(null)
  const [closing, setClosing] = useState(false)

  useFocusTrap(sheetRef, open && !closing)

  // Handle swipe-down gesture
  function handleTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (startYRef.current === null) return
    const delta = e.changedTouches[0].clientY - startYRef.current
    if (delta > 60) triggerClose()
    startYRef.current = null
  }

  function triggerClose() {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, 260)
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') triggerClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const maxH = height === 'full' ? 'max-h-[95dvh]' : 'max-h-[60dvh]'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={triggerClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={[
          'relative w-full rounded-t-2xl border-t border-border bg-surface flex flex-col overflow-hidden',
          maxH,
          closing
            ? 'animate-[slide-down_260ms_ease-in_forwards]'
            : 'animate-[slide-up_260ms_ease-out_forwards]',
        ].join(' ')}
        style={{ ['--tw-translate-y' as string]: '100%' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {title && (
          <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
            <span className="font-mono text-sm font-semibold text-text">{title}</span>
            <button
              type="button"
              onClick={triggerClose}
              className="text-muted hover:text-text transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-safe">
          {children}
        </div>
      </div>
    </div>
  )
}
