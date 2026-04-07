'use client'

import { useEffect, useRef } from 'react'
import { Copy, Pencil, Trash2 } from 'lucide-react'

export type BoardContextMenuState = {
  x:      number
  y:      number
  nodeId: string
  nodeType: 'container' | 'field'
}

export type BoardContextMenuDict = {
  rename:     string
  duplicate:  string
  deleteNode: string
}

export type BoardContextMenuProps = {
  menu:        BoardContextMenuState
  onRename:    (nodeId: string) => void
  onDuplicate: (nodeId: string) => void
  onDelete:    (nodeId: string) => void
  onClose:     () => void
  d?:          BoardContextMenuDict
}

export function BoardContextMenu({ menu, onRename, onDuplicate, onDelete, onClose, d }: BoardContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Dismiss on outside click or Escape
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

  // Keep menu inside viewport
  const MENU_W = 176
  const MENU_H = 128
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.min(menu.x, vw - MENU_W - 8)
  const top  = Math.min(menu.y, vh - MENU_H - 8)

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Node actions"
      className="fixed z-50 min-w-44 rounded-lg border border-border bg-surface shadow-xl animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="p-1">
        <button
          role="menuitem"
          onClick={() => { onRename(menu.nodeId); onClose() }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-text hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <Pencil size={14} className="text-muted" />
          {d?.rename ?? 'Rename'}
        </button>
        <button
          role="menuitem"
          onClick={() => { onDuplicate(menu.nodeId); onClose() }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-text hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <Copy size={14} className="text-muted" />
          {d?.duplicate ?? 'Duplicate'}
        </button>
        <div className="my-1 border-t border-border/60" />
        <button
          role="menuitem"
          onClick={() => { onDelete(menu.nodeId); onClose() }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-danger hover:bg-danger/10 transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
          {d?.deleteNode ?? 'Delete node'}
        </button>
      </div>
    </div>
  )
}
