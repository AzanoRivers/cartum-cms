'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/lib/stores/uiStore'
import type { CmsDictionary } from '@/locales/en'
import type { SchemaPermissions } from '@/types/roles'

export function CmsDictionarySetter({
  dict,
  schemaPermissions,
  hasTier2,
}: {
  dict: CmsDictionary
  schemaPermissions: SchemaPermissions
  hasTier2: boolean
}) {
  const setCmsDict           = useUIStore((s) => s.setCmsDict)
  const setSchemaPermissions = useUIStore((s) => s.setSchemaPermissions)
  const setHasTier2          = useUIStore((s) => s.setHasTier2)
  const setGlobalLoading     = useUIStore((s) => s.setGlobalLoading)
  useEffect(() => {
    setCmsDict(dict)
    setSchemaPermissions(schemaPermissions)
    setHasTier2(hasTier2)
    setGlobalLoading(false)
  }, [dict, setCmsDict, schemaPermissions, setSchemaPermissions, hasTier2, setHasTier2, setGlobalLoading])
  return null
}
