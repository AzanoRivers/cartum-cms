'use client'

import { useEffect, useRef } from 'react'

/**
 * Traps focus within a container element while active.
 * On mount: saves previously focused element.
 * Tab/Shift+Tab cycles within focusable children.
 * On unmount: restores focus to the previously focused element.
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active: boolean) {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    previousFocusRef.current = document.activeElement as HTMLElement

    const container = containerRef.current
    if (!container) return

    const FOCUSABLE = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    // Move focus into the container
    const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE)
    firstFocusable?.focus()

    function trapTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      const focusables = Array.from(container!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.closest('[aria-hidden="true"]'),
      )
      if (focusables.length === 0) { e.preventDefault(); return }

      const first = focusables[0]
      const last  = focusables[focusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', trapTab)
    return () => document.removeEventListener('keydown', trapTab)
  }, [active, containerRef])

  // Restore focus on deactivation
  useEffect(() => {
    if (active) return
    previousFocusRef.current?.focus()
  }, [active])
}
