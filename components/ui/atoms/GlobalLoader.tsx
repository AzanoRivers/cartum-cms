'use client'

import { FullscreenLoader } from '@/components/ui/atoms/FullscreenLoader'
import { useUIStore } from '@/lib/stores/uiStore'

export function GlobalLoader() {
  const loading = useUIStore((s) => s.globalLoading)
  const label   = useUIStore((s) => s.globalLoadingLabel)

  if (!loading) return null
  return <FullscreenLoader label={label} />
}
