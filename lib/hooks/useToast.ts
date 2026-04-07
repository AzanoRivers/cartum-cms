'use client'

import { toast } from 'sonner'
import { useUIStore } from '@/lib/stores/uiStore'
import { t } from '@/lib/i18n/t'
import type { ExternalToast } from 'sonner'

/**
 * Thin wrapper around Sonner toast() with type-safe shorthand methods.
 *
 * `errorKey(key)` resolves a dot-path key against the CMS dictionary
 * (the cms section of Dictionary, stored in Zustand).
 * Keys are relative to the cms sub-object: e.g. 'canvas.empty', not 'cms.canvas.empty'.
 *
 * For setup/auth contexts outside the CMS, call toast() directly.
 */
export function useToast() {
  const cmsDict = useUIStore((s) => s.cmsDict)

  return {
    success: (message: string, opts?: ExternalToast) =>
      toast.success(message, opts),

    error: (message: string, opts?: ExternalToast) =>
      toast.error(message, { duration: 6000, ...opts }),

    warning: (message: string, opts?: ExternalToast) =>
      toast.warning(message, opts),

    info: (message: string, opts?: ExternalToast) =>
      toast.info(message, opts),

    /** Resolve a CMS dictionary key and show as an error toast */
    errorKey: (key: string, opts?: ExternalToast) =>
      toast.error(t(cmsDict ?? {}, key), { duration: 6000, ...opts }),

    /** Promise toast — shows loading → success/error automatically */
    promise: toast.promise,

    dismiss: toast.dismiss,
    dismissAll: () => toast.dismiss(),
  }
}
