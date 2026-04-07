'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/lib/stores/uiStore'
import type { BreadcrumbItem } from '@/types/nodes'

export type BreadcrumbSetterProps = {
  items: BreadcrumbItem[]
  parentId: string | null
}

/**
 * Invisible component. Syncs server-fetched breadcrumb data into
 * the UI store so TopBar (which lives in the layout) can read it.
 */
export function BreadcrumbSetter({ items, parentId }: BreadcrumbSetterProps) {
  const setBreadcrumb = useUIStore((s) => s.setBreadcrumb)

  useEffect(() => {
    setBreadcrumb(items, parentId)
    return () => setBreadcrumb([], null)
  }, [items, parentId, setBreadcrumb])

  return null
}
