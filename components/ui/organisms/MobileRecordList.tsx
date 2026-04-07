'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useUIStore } from '@/lib/stores/uiStore'
import { deleteRecord } from '@/lib/actions/records.actions'
import { Input } from '@/components/ui/atoms/Input'
import { useLongPress } from '@/lib/hooks/useLongPress'
import type { FieldNode } from '@/types/nodes'
import type { ContentRecord, RecordValue } from '@/types/records'

export type MobileRecordListProps = {
  nodeId:    string
  fields:    FieldNode[]
  records:   ContentRecord[]
  canUpdate: boolean
  canDelete: boolean
}

function formatValue(v: RecordValue): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? '✓' : '✗'
  const s = String(v)
  return s.length > 40 ? s.slice(0, 40) + '…' : s
}

function RecordCard({
  nodeId,
  record,
  previewFields,
  canUpdate,
  canDelete,
  onDelete,
  isPending,
}: {
  nodeId:        string
  record:        ContentRecord
  previewFields: FieldNode[]
  canUpdate:     boolean
  canDelete:     boolean
  onDelete:      (id: string) => void
  isPending:     boolean
}) {
  const [showActions, setShowActions] = useState(false)
  const d = useUIStore((s) => s.cmsDict)

  const longPress = useLongPress(() => setShowActions(true))

  return (
    <div
      className="relative rounded-md border border-border bg-surface overflow-hidden"
      {...longPress}
    >
      {/* Card body */}
      <div className="px-4 py-3 flex flex-col gap-1.5">
        {previewFields.map((field) => (
          <div key={field.id} className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] text-muted min-w-20 shrink-0">
              {field.name}
            </span>
            <span className="font-mono text-xs text-text truncate">
              {formatValue(record.data[field.id] ?? record.data[field.name])}
            </span>
          </div>
        ))}
        {previewFields.length === 0 && (
          <span className="font-mono text-xs text-muted">{record.id.slice(0, 8)}…</span>
        )}
      </div>

      {/* Actions footer (visible after long-press or always when no actions shown) */}
      {showActions ? (
        <div className="flex border-t border-border">
          {canUpdate && (
            <Link
              href={`/cms/content/${nodeId}/${record.id}`}
              className="flex-1 py-2 font-mono text-xs text-center text-primary hover:bg-surface-2 transition-colors"
              onClick={() => setShowActions(false)}
            >
              {d?.content.list.editAriaLabel ?? 'Edit'}
            </Link>
          )}
          {canDelete && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                onDelete(record.id)
                setShowActions(false)
              }}
              className="flex-1 py-2 font-mono text-xs text-center text-danger hover:bg-surface-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {d?.content.list.deleteAriaLabel ?? 'Delete'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowActions(false)}
            className="flex-1 py-2 font-mono text-xs text-center text-muted hover:bg-surface-2 transition-colors cursor-pointer"
          >
            {'Cancel'}
          </button>
        </div>
      ) : (
        canUpdate && (
          <Link
            href={`/cms/content/${nodeId}/${record.id}`}
            className="absolute inset-0"
            aria-label={`Edit record ${record.id}`}
          />
        )
      )}
    </div>
  )
}

export function MobileRecordList({
  nodeId,
  fields,
  records: initialRecords,
  canUpdate,
  canDelete,
}: MobileRecordListProps) {
  const d = useUIStore((s) => s.cmsDict)
  const [search, setSearch]         = useState('')
  const [allRecords, setAllRecords] = useState<ContentRecord[]>(initialRecords)
  const [isPending, startTransition] = useTransition()

  const previewFields = fields.slice(0, 3)

  const searchLower = search.toLowerCase()
  const filtered = searchLower
    ? allRecords.filter((r) =>
        Object.values(r.data).some((v) =>
          String(v ?? '').toLowerCase().includes(searchLower),
        ),
      )
    : allRecords

  function handleDelete(recordId: string) {
    startTransition(async () => {
      await deleteRecord(nodeId, recordId)
      setAllRecords((prev) => prev.filter((r) => r.id !== recordId))
    })
  }

  return (
    <div className="flex flex-col gap-4 px-3 pt-3 pb-4">
      <Input
        size="sm"
        placeholder={d?.content.list.search ?? 'Search…'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="rounded-md border border-border bg-surface px-4 py-10 text-center">
          <p className="font-mono text-sm text-muted">
            {allRecords.length === 0
              ? (d?.content.list.empty ?? 'No records yet.')
              : (d?.content.list.noResults ?? 'No results match your search.')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((record) => (
            <RecordCard
              key={record.id}
              nodeId={nodeId}
              record={record}
              previewFields={previewFields}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onDelete={handleDelete}
              isPending={isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
