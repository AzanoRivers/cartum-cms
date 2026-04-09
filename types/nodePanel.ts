import type React from 'react'

export interface NodePanelProps {
  open:       boolean
  onClose:    () => void
  /** Trigger element — used for desktop anchored positioning.
   *  When omitted, the panel is centered in the viewport. */
  anchorRef?: React.RefObject<HTMLElement | null>
  title:      string
  children:   React.ReactNode
  /** Desktop placement hint. 'auto' picks the side with the most room. */
  side?:      'auto' | 'top' | 'right' | 'left' | 'bottom'
  /** Panel width in px — desktop only. Default 320. */
  width?:     number
  className?: string
}

export interface AnchoredPanelPosition {
  x:               number   // left in px
  y:               number   // top in px
  transformOrigin: string   // e.g. "left center" | "right center" | "top center"
}
