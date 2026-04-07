'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '@/lib/stores/uiStore'
import { getRelatedRecords } from '@/lib/actions/records.actions'
import type { ContentRecord } from '@/types/records'

export type RelationSelectFieldProps = {
  label:        string
  targetNodeId: string
  value:        string | null
  onChange:     (id: string | null) => void
  error?:       string
}

export function RelationSelectField({
  label,
  targetNodeId,
  value,
  onChange,
  error,
}: RelationSelectFieldProps) {
  const d = useUIStore((s) => s.cmsDict)
  const [options, setOptions] = useState<ContentRecord[]>([])

  useEffect(() => {
    getRelatedRecords(targetNodeId).then((res) => {
      if (res.success) setOptions(res.data)
    })
  }, [targetNodeId])

  function getDisplayLabel(record: ContentRecord): string {
    const firstStr = Object.values(record.data).find((v) => typeof v === 'string')
    return (firstStr as string | undefined) ?? record.id.slice(0, 8)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-xs text-muted">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-9 rounded-md border border-border bg-surface-2 px-3 font-mono text-xs text-text outline-none focus:border-primary transition-colors cursor-pointer"
      >
        <option value="">{d?.content.relation.placeholder ?? '— Select a record —'}</option>
        {options.map((r) => (
          <option key={r.id} value={r.id}>
            {getDisplayLabel(r)}
          </option>
        ))}
      </select>
      {options.length === 0 && (
        <p className="font-mono text-[10px] text-muted">
          {d?.content.relation.noOptions ?? 'No records found.'}
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
