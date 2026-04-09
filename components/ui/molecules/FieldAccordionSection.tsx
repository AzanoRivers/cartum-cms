'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type FieldAccordionSectionProps = {
  title:          string
  defaultOpen?:   boolean
  children:       React.ReactNode
  // Controlled mode — when provided, overrides internal state
  open?:          boolean
  onToggle?:      () => void
}

export function FieldAccordionSection({
  title,
  defaultOpen = false,
  children,
  open: controlledOpen,
  onToggle,
}: FieldAccordionSectionProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open         = isControlled ? controlledOpen : uncontrolledOpen

  function handleToggle() {
    if (isControlled) onToggle?.()
    else setUncontrolledOpen((v) => !v)
  }

  return (
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={handleToggle}
        className="group flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
      >
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest transition-colors duration-200 ${
            open
              ? 'bg-primary/15 text-primary'
              : 'bg-surface-2 text-muted group-hover:bg-border group-hover:text-text'
          }`}
        >
          {title}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-all duration-300 ${
            open ? 'rotate-180 text-primary' : 'text-muted group-hover:text-text'
          }`}
        />
      </button>

      {/* style prop garantiza que grid-template-rows se anima —
          Tailwind v4 no siempre emite transition-property para esta prop */}
      <div
        className={`grid ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        style={{ transition: 'grid-template-rows 280ms cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div
          className={`min-h-0 overflow-hidden transition-opacity duration-200 ${
            open ? 'opacity-100 delay-75' : 'opacity-0'
          }`}
        >
          <div className="px-4 pb-4 pt-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
