'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Copy, Maximize2, Pencil, Trash2 } from 'lucide-react'

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
  back?:      string
  forward?:   string
  fitAll?:    string
}

export type BoardContextMenuProps = {
  menu:        BoardContextMenuState
  onRename:    (nodeId: string) => void
  onDuplicate: (nodeId: string) => void
  onDelete:    (nodeId: string) => void
  onFitAll:    () => void
  onClose:     () => void
  canEdit?:    boolean
  canDelete?:  boolean
  d?:          BoardContextMenuDict
}

export function BoardContextMenu({ menu, onRename, onDuplicate, onDelete, onFitAll, onClose, canEdit = true, canDelete = true, d }: BoardContextMenuProps) {
  const ref    = useRef<HTMLDivElement>(null)
  const router = useRouter()

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

  const hasActions = canEdit || canDelete
  const MENU_W = 176
  const MENU_H = hasActions ? 200 : 116
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.min(menu.x, vw - MENU_W - 8)
  const top  = Math.min(menu.y, vh - MENU_H - 8)

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Node actions"
      className="fixed z-50 min-w-44 rounded-lg border border-border bg-surface shadow-xl animate-in fade-in-0 zoom-in-95 duration-100 select-none"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="p-1">
        {canEdit && (
          <button
            role="menuitem"
            onClick={() => { onRename(menu.nodeId); onClose() }}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-text hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <Pencil size={14} className="text-muted" />
            {d?.rename ?? 'Rename'}
          </button>
        )}
        {canEdit && (
          <button
            role="menuitem"
            onClick={() => { onDuplicate(menu.nodeId); onClose() }}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-text hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <Copy size={14} className="text-muted" />
            {d?.duplicate ?? 'Duplicate'}
          </button>
        )}
        {canDelete && (
          <>
            {canEdit && <div className="my-1 border-t border-border/60" />}
            <button
              role="menuitem"
              onClick={() => { onDelete(menu.nodeId); onClose() }}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              {d?.deleteNode ?? 'Delete node'}
            </button>
          </>
        )}

        {/* Navigation — always visible */}
        {hasActions && <div className="my-1 border-t border-border/60" />}
        <button
          role="menuitem"
          onClick={() => { router.back(); onClose() }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-text hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} className="text-muted" />
          {d?.back ?? 'Go back'}
        </button>
        <button
          role="menuitem"
          onClick={() => { router.forward(); onClose() }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-text hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <ArrowRight size={14} className="text-muted" />
          {d?.forward ?? 'Go forward'}
        </button>
        <button
          role="menuitem"
          onClick={() => { onFitAll(); onClose() }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-text hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <Maximize2 size={14} className="text-muted" />
          {d?.fitAll ?? 'Center nodes'}
        </button>
      </div>
    </div>
  )
}
