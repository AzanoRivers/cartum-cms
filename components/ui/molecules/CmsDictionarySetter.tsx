'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/lib/stores/uiStore'
import type { CmsDictionary } from '@/locales/en'
import type { SchemaPermissions } from '@/types/roles'

export function CmsDictionarySetter({
  dict,
  schemaPermissions,
}: {
  dict: CmsDictionary
  schemaPermissions: SchemaPermissions
}) {
  const setCmsDict            = useUIStore((s) => s.setCmsDict)
  const setSchemaPermissions  = useUIStore((s) => s.setSchemaPermissions)
  const setGlobalLoading      = useUIStore((s) => s.setGlobalLoading)
  useEffect(() => {
    setCmsDict(dict)
    setSchemaPermissions(schemaPermissions)
    setGlobalLoading(false)
  }, [dict, setCmsDict, schemaPermissions, setSchemaPermissions, setGlobalLoading])
  return null
}
