'use client'

import { useRef, useCallback } from 'react'

const VELOCITY_THRESHOLD = 500  // px/s — fast flick closes regardless of position
const DISTANCE_THRESHOLD = 0.4  // 40% of panel height triggers close

export function useDragDismiss(onClose: () => void) {
  const startYRef    = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const currentYRef  = useRef<number>(0)

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    startYRef.current    = e.clientY
    currentYRef.current  = e.clientY
    startTimeRef.current = performance.now()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>, sheetEl: HTMLElement | null) => {
      if (startYRef.current === null || !sheetEl) return
      const delta = e.clientY - startYRef.current
      currentYRef.current = e.clientY
      // Only allow downward drag
      if (delta > 0) {
        // Zero React renders — direct DOM style mutation
        sheetEl.style.transform = `translateY(${delta}px)`
        sheetEl.style.transition = 'none'
      }
    },
    [],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>, sheetEl: HTMLElement | null) => {
      if (startYRef.current === null || !sheetEl) return

      const delta    = e.clientY - startYRef.current
      const elapsed  = (performance.now() - startTimeRef.current) / 1000  // seconds
      const velocity = elapsed > 0 ? Math.abs(delta) / elapsed : 0
      const height   = sheetEl.offsetHeight

      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)

      const shouldClose =
        velocity > VELOCITY_THRESHOLD ||
        delta > height * DISTANCE_THRESHOLD

      if (shouldClose) {
        // Animate out
        sheetEl.style.transition = 'transform 220ms cubic-bezier(0.7,0,0.84,0)'
        sheetEl.style.transform  = `translateY(100%)`
        setTimeout(() => {
          sheetEl.style.transform  = ''
          sheetEl.style.transition = ''
          onClose()
        }, 220)
      } else {
        // Snap back
        sheetEl.style.transition = 'transform 300ms cubic-bezier(0.34,1.56,0.64,1)'
        sheetEl.style.transform  = 'translateY(0)'
        setTimeout(() => {
          sheetEl.style.transform  = ''
          sheetEl.style.transition = ''
        }, 300)
      }

      startYRef.current = null
    },
    [onClose],
  )

  return { onPointerDown, onPointerMove, onPointerUp }
}
