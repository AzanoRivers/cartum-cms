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
  const setGlobalLoading    = useUIStore((s) => s.setGlobalLoading)
  useEffect(() => {
    setCmsDict(dict)
    setCanAccessBuilder(canAccessBuilder)
    setGlobalLoading(false)
  }, [dict, setCmsDict, canAccessBuilder, setCanAccessBuilder, setGlobalLoading])
  return null
}
