'use client'

import { toast } from 'sonner'
import type { VpsWarning } from '@/types/media'
import type { CmsDictionary } from '@/locales/en'

type MediaDict = CmsDictionary['content']['upload']

export function emitVpsWarningToast(
  warning: VpsWarning,
  dict: MediaDict,
  meta?: { processed?: number; total?: number },
) {
  switch (warning) {
    case 'auth':
      toast.error(dict.vpsAuthError, {
        duration:    Infinity,
        description: dict.vpsAuthErrorDesc,
        closeButton: true,
      })
      break
    case 'partial':
      toast.warning(dict.vpsPartial, {
        description: `${meta?.processed ?? '?'} / ${meta?.total ?? '?'} processed`,
      })
      break
    case 'timeout':
      toast.warning(dict.vpsTimeout)
      break
    case 'validation':
      toast.warning(dict.vpsValidationWarn)
      break
    case 'unreachable':
      toast.warning(dict.vpsUnreachable)
      break
  }
}
