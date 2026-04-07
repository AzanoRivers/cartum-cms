'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { AnchoredPanelPosition } from '@/types/nodePanel'

const GAP = 12     // px gap between anchor and panel
const MARGIN = 16  // min distance from viewport edge

export function useAnchoredPanel(
  anchorRef: React.RefObject<HTMLElement | null> | undefined,
  panelRef:  React.RefObject<HTMLElement | null>,
  side: 'auto' | 'right' | 'left' | 'bottom' = 'auto',
  panelWidth = 320,
): AnchoredPanelPosition {
  const [pos, setPos] = useState<AnchoredPanelPosition>({
    x: 0,
    y: 0,
    transformOrigin: 'left center',
  })

  const calculate = useCallback(() => {
    const anchor = anchorRef?.current

    // No anchor → center the panel in the viewport
    if (!anchor) {
      const pw = panelWidth
      const ph = panelRef.current?.offsetHeight ?? 400
      const vw = window.innerWidth
      const vh = window.innerHeight
      setPos({
        x: Math.max(MARGIN, (vw - pw) / 2),
        y: Math.max(MARGIN, (vh - ph) / 2),
        transformOrigin: 'center center',
      })
      return
    }

    const a      = anchor.getBoundingClientRect()
    const ph     = panelRef.current?.offsetHeight ?? 400
    const pw     = panelWidth
    const vw     = window.innerWidth
    const vh     = window.innerHeight

    // Determine best side if 'auto'
    let resolved = side
    if (resolved === 'auto') {
      if (a.right + pw + GAP + MARGIN <= vw) {
        resolved = 'right'
      } else if (a.left - pw - GAP - MARGIN >= 0) {
        resolved = 'left'
      } else {
        resolved = 'bottom'
      }
    }

    let x: number
    let y: number
    let transformOrigin: string

    if (resolved === 'right') {
      x = a.right + GAP
      y = Math.min(Math.max(a.top, MARGIN), vh - ph - MARGIN)
      transformOrigin = 'left center'
    } else if (resolved === 'left') {
      x = a.left - pw - GAP
      y = Math.min(Math.max(a.top, MARGIN), vh - ph - MARGIN)
      transformOrigin = 'right center'
    } else {
      // bottom
      x = Math.min(Math.max(a.left, MARGIN), vw - pw - MARGIN)
      y = a.bottom + GAP
      transformOrigin = 'top center'
    }

    // Clamp to viewport
    x = Math.min(Math.max(x, MARGIN), vw - pw - MARGIN)
    y = Math.min(Math.max(y, MARGIN), vh - ph - MARGIN)

    setPos({ x, y, transformOrigin })
  }, [anchorRef, panelRef, side, panelWidth])

  // Recalculate on mount and on resize
  useEffect(() => {
    calculate()
    const ro = new ResizeObserver(calculate)
    if (anchorRef?.current) ro.observe(anchorRef.current)
    window.addEventListener('resize', calculate, { passive: true })
    window.addEventListener('scroll', calculate, { passive: true, capture: true })
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', calculate)
      window.removeEventListener('scroll', calculate, true)
    }
  }, [calculate])

  return pos
}
