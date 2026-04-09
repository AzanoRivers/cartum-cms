'use client'

import { useUIStore } from '@/lib/stores/uiStore'
import { BreadcrumbBar } from '@/components/ui/molecules/BreadcrumbBar'

/**
 * Floating breadcrumb strip for mobile.
 * Positioned at the very top of the <main> content area (absolute),
 * so it overlays the canvas without affecting flex layout.
 *
 * Only renders when depth > 0 (not on the root /cms/board page).
 * Shows: CMS / … / last-node  (always collapsed to 1 visible item).
 */
export function MobileBreadcrumbBar() {
  const breadcrumb = useUIStore((s) => s.breadcrumb)

  if (breadcrumb.length === 0) return null

  return (
    <div
      aria-label="Mobile breadcrumb"
      className="absolute inset-x-0 top-0 z-20 flex items-center border-b border-border/40 bg-surface/85 px-4 py-1.5 backdrop-blur-sm"
    >
      <BreadcrumbBar
        breadcrumb={breadcrumb}
        maxItems={1}
        className="w-full overflow-hidden"
      />
    </div>
  )
}
