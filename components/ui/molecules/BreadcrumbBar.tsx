'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUIStore } from '@/lib/stores/uiStore'
import type { BreadcrumbItem } from '@/types/nodes'

export type BreadcrumbBarProps = {
  breadcrumb: BreadcrumbItem[]
  /**
   * Max breadcrumb items to show (not counting the implicit "CMS" root).
   * When items exceed this, middle items collapse to "…".
   *   maxItems=4 (desktop): CMS / A / … / E  when > 4 items
   *   maxItems=1 (mobile):  CMS / … / E      when > 1 item
   * Omit for no limit (show all).
   */
  maxItems?: number
  className?: string
}

export function BreadcrumbBar({ breadcrumb, maxItems, className }: BreadcrumbBarProps) {
  const router           = useRouter()
  const pathname         = usePathname()
  const setGlobalLoading = useUIStore((s) => s.setGlobalLoading)

  useEffect(() => {
    setGlobalLoading(false)
  }, [pathname, setGlobalLoading])

  function navigate(href: string) {
    setGlobalLoading(true)
    router.push(href)
  }

  const shouldCollapse = maxItems !== undefined && breadcrumb.length > maxItems

  // head = first item shown before "…" (only when maxItems ≥ 2)
  const head: BreadcrumbItem[] = shouldCollapse && maxItems >= 2 ? [breadcrumb[0]] : []
  // tail = last item shown after "…"
  const tail: BreadcrumbItem[] = shouldCollapse ? [breadcrumb[breadcrumb.length - 1]] : []

  return (
    <nav
      aria-label="Breadcrumb"
      className={[
        'flex items-center gap-1 font-mono text-muted text-xs md:text-sm min-w-0',
        className,
      ].filter(Boolean).join(' ')}
    >
      {/* Root */}
      <button
        type="button"
        onClick={() => breadcrumb.length > 0 && navigate('/cms/board')}
        className={[
          'font-semibold shrink-0 transition-colors',
          breadcrumb.length === 0
            ? 'text-text/70 cursor-default pointer-events-none'
            : 'text-text/70 hover:text-text cursor-pointer',
        ].join(' ')}
      >
        CMS
      </button>

      {shouldCollapse ? (
        <>
          {/* Head: first item (desktop only — maxItems ≥ 2) */}
          {head.map((item) => (
            <span key={item.id} className="flex items-center gap-1 shrink-0 min-w-0">
              <span className="text-muted/60 select-none">/</span>
              <button
                type="button"
                onClick={() => navigate(`/cms/board/${item.id}`)}
                title={item.name}
                className="truncate max-w-24 hover:text-text transition-colors cursor-pointer"
              >
                {item.name}
              </button>
            </span>
          ))}

          {/* Ellipsis */}
          <span className="flex items-center gap-1 shrink-0 text-muted/60 select-none">
            <span>/</span>
            <span>…</span>
          </span>

          {/* Tail: current (last) item */}
          {tail.map((item) => (
            <span key={item.id} className="flex items-center gap-1 min-w-0">
              <span className="text-muted/60 select-none shrink-0">/</span>
              <span className="text-text truncate max-w-40" title={item.name}>
                {item.name}
              </span>
            </span>
          ))}
        </>
      ) : (
        // Full list — each item truncates at max-w to prevent overflow
        breadcrumb.map((item, i) => {
          const isLast = i === breadcrumb.length - 1
          return (
            <span key={item.id} className="flex items-center gap-1 shrink-0 min-w-0">
              <span className="text-muted/60 select-none">/</span>
              {isLast ? (
                <span className="text-text truncate max-w-35" title={item.name}>
                  {item.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/cms/board/${item.id}`)}
                  title={item.name}
                  className="truncate max-w-30 hover:text-text transition-colors cursor-pointer"
                >
                  {item.name}
                </button>
              )}
            </span>
          )
        })
      )}
    </nav>
  )
}
