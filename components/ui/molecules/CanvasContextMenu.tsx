'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Maximize2 } from 'lucide-react'

export type CanvasContextMenuState = {
  x: number
  y: number
}

export type CanvasContextMenuDict = {
  back:    string
  forward: string
  fitAll:  string
}

export type CanvasContextMenuProps = {
  menu:     CanvasContextMenuState
  onFitAll: () => void
  onClose:  () => void
  d?:       CanvasContextMenuDict
}

const FALLBACK: CanvasContextMenuDict = {
  back:    'Go back',
  forward: 'Go forward',
  fitAll:  'Center nodes',
}

export function CanvasContextMenu({ menu, onFitAll, onClose, d }: CanvasContextMenuProps) {
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

  const MENU_W = 192
  const MENU_H = 116
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.min(menu.x, vw - MENU_W - 8)
  const top  = Math.min(menu.y, vh - MENU_H - 8)

  const label = d ?? FALLBACK

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Canvas actions"
      className="fixed z-50 min-w-48 rounded-lg border border-border bg-surface shadow-xl animate-in fade-in-0 zoom-in-95 duration-100 select-none"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="p-1">
        <button
          role="menuitem"
          onClick={() => { router.back(); onClose() }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-text hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} className="text-muted" />
          {label.back}
        </button>
        <button
          role="menuitem"
          onClick={() => { router.forward(); onClose() }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-text hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <ArrowRight size={14} className="text-muted" />
          {label.forward}
        </button>
        <div className="my-1 border-t border-border/60" />
        <button
          role="menuitem"
          onClick={() => { onFitAll(); onClose() }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-mono text-text hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <Maximize2 size={14} className="text-muted" />
          {label.fitAll}
        </button>
      </div>
    </div>
  )
}
