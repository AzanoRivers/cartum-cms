'use client'

import { useUIStore } from '@/lib/stores/uiStore'

export function useTier2Status(): boolean | null {
  return useUIStore((s) => s.hasTier2)
}
