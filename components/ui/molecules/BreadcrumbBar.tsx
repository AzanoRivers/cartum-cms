'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUIStore } from '@/lib/stores/uiStore'
import type { BreadcrumbItem } from '@/types/nodes'

export type BreadcrumbBarProps = {
  breadcrumb: BreadcrumbItem[]
}

export function BreadcrumbBar({ breadcrumb }: BreadcrumbBarProps) {
  const router           = useRouter()
  const pathname         = usePathname()
  const setGlobalLoading = useUIStore((s) => s.setGlobalLoading)

  // Reset global loader when navigation completes
  useEffect(() => {
    setGlobalLoading(false)
  }, [pathname, setGlobalLoading])

  function navigate(href: string) {
    setGlobalLoading(true)
    router.push(href)
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 font-mono text-muted text-xs md:text-sm">
      <button
        type="button"
        onClick={() => breadcrumb.length > 0 && navigate('/cms/board')}
        className={[
          'font-semibold transition-colors',
          breadcrumb.length === 0
            ? 'text-text/70 cursor-default pointer-events-none'
            : 'text-text/70 hover:text-text cursor-pointer',
        ].join(' ')}
      >
        CMS
      </button>
      {breadcrumb.map((item, i) => {
        const isLast = i === breadcrumb.length - 1
        return (
          <span key={item.id} className="flex items-center gap-1">
            <span className="text-muted/60 select-none">/</span>
            {isLast ? (
              <span className="text-text">{item.name}</span>
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/cms/board/${item.id}`)}
                className="hover:text-text transition-colors cursor-pointer"
              >
                {item.name}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
