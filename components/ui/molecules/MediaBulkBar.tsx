'use client'

import { useRef } from 'react'
import { X } from 'lucide-react'

export type MediaBulkBarLabels = {
  placeholder: string
  download:    string
  delete:      string
  selected:    string   // "{n} seleccionados"
  clearLabel:  string
}

export type MediaBulkBarProps = {
  count:      number
  labels:     MediaBulkBarLabels
  onDownload: () => void
  onDelete:   () => void
  onClear:    () => void
}

export function MediaBulkBar({ count, labels, onDownload, onDelete, onClear }: MediaBulkBarProps) {
  const selectRef = useRef<HTMLSelectElement>(null)

  function handleAction(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    if (val === 'download') onDownload()
    if (val === 'delete')   onDelete()
    if (selectRef.current) selectRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] text-primary whitespace-nowrap">
        {labels.selected.replace('{n}', String(count))}
      </span>
      <select
        ref={selectRef}
        defaultValue=""
        onChange={handleAction}
        className="h-7 rounded-md border border-primary/40 bg-primary/10 px-2 font-mono text-xs text-primary focus:outline-none focus:ring-1 focus:ring-primary/60 cursor-pointer"
      >
        <option value="" disabled>{labels.placeholder}</option>
        <option value="download">{labels.download}</option>
        <option value="delete">{labels.delete}</option>
      </select>
      <button
        type="button"
        onClick={onClear}
        title={labels.clearLabel}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  )
}
