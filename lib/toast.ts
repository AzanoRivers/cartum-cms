'use client'

/**
 * Sound-aware toast wrapper around sonner.
 * Drop-in replacement for `import { toast } from 'sonner'`.
 * All methods are pass-through except `error` / `errorKey`, which
 * additionally play /sounds/error_001.wav (best-effort, silent if blocked).
 */

import { toast as _toast } from 'sonner'
import type { ExternalToast } from 'sonner'
import { playErrorSound } from '@/lib/sounds'

export const toast = {
  ..._toast,

  error(message: string | React.ReactNode, opts?: ExternalToast) {
    playErrorSound()
    return _toast.error(message, { duration: 6000, ...opts })
  },
} as typeof _toast
