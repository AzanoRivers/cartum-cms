'use client'

import { useEffect, useRef } from 'react'
import { Trash2, X } from 'lucide-react'

export type MultiSelectionContextMenuState = {
  x:     number
  y:     number
  count: number
}

export type MultiSelectionContextMenuProps = {
  menu:          MultiSelectionContextMenuState
  onDeleteAll:   () => void
  onDeselectAll: () => void
  onClose:       () => void
}

export function MultiSelectionContextMenu({
  menu,
  onDeleteAll,
  onDeselectAll,
  onClose,
}: MultiSelectionContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown, { capture: true })
    }
  }, [onClose])

  const MENU_W = 200
  const MENU_H = 104
  const vw = typeof window !== 'undefined' ? window.innerWidth  : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.min(menu.x, vw - MENU_W - 8)
  const top  = Math.min(menu.y, vh - MENU_H - 8)

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Multi-selection actions"
      className="fixed z-50 min-w-[200px] rounded-lg border border-border bg-surface shadow-xl animate-in fade-in-0 zoom-in-95 duration-100 select-none"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/60">
        <span className="font-mono text-xs text-muted">
          {menu.count} {menu.count === 1 ? 'item' : 'items'} selected
        </span>
      </div>

      <div className="p-1">
        <button
          role="menuitem"
          onClick={() => { onDeselectAll(); onClose() }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-text hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <X size={14} className="text-muted" />
          Deselect all
        </button>

        <div className="my-1 border-t border-border/60" />

        <button
          role="menuitem"
          onClick={() => { onDeleteAll(); onClose() }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-danger hover:bg-danger/10 transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
          Delete {menu.count} {menu.count === 1 ? 'item' : 'items'}
        </button>
      </div>
    </div>
  )
}
