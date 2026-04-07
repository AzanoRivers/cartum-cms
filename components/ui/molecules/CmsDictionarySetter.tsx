'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/lib/stores/uiStore'
import type { CmsDictionary } from '@/locales/en'

export function CmsDictionarySetter({
  dict,
  canAccessBuilder,
}: {
  dict: CmsDictionary
  canAccessBuilder: boolean
}) {
  const setCmsDict          = useUIStore((s) => s.setCmsDict)
  const setCanAccessBuilder = useUIStore((s) => s.setCanAccessBuilder)
  useEffect(() => {
    setCmsDict(dict)
    setCanAccessBuilder(canAccessBuilder)
  }, [dict, setCmsDict, canAccessBuilder, setCanAccessBuilder])
  return null
}
