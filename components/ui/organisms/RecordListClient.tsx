'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useUIStore } from '@/lib/stores/uiStore'
import { deleteRecord } from '@/lib/actions/records.actions'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import type { FieldNode } from '@/types/nodes'
import type { ContentRecord, RecordValue } from '@/types/records'

export type RecordListClientProps = {
  nodeId:     string
  fields:     FieldNode[]
  records:    ContentRecord[]
  canUpdate:  boolean
  canDelete:  boolean
}

function formatValue(v: RecordValue): string {
  if (v === null || v === undefined) return '·'
  if (typeof v === 'boolean') return v ? '✓' : '✗'
  return String(v)
}

export function RecordListClient({
  nodeId,
  fields,
  records: initialRecords,
  canUpdate,
  canDelete,
}: RecordListClientProps) {
  const d = useUIStore((s) => s.cmsDict)
  const [search, setSearch]       = useState('')
  const [allRecords, setAllRecords] = useState<ContentRecord[]>(initialRecords)
  const [confirmId, setConfirmId]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const displayFields = fields.slice(0, 3)

  const searchLower = search.toLowerCase()
  const filtered = searchLower
    ? allRecords.filter((r) =>
        Object.values(r.data).some((v) =>
          String(v ?? '').toLowerCase().includes(searchLower)
        )
      )
    : allRecords

  function handleDelete(recordId: string) {
    startTransition(async () => {
      await deleteRecord(nodeId, recordId)
      setAllRecords((prev) => prev.filter((r) => r.id !== recordId))
      setConfirmId(null)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="max-w-sm">
        <Input
          size="sm"
          placeholder={d?.content.list.search ?? 'Search…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-md border border-border bg-surface px-6 py-12 text-center">
          <p className="font-mono text-sm text-muted">
            {allRecords.length === 0
              ? (d?.content.list.empty ?? 'No records yet.')
              : (d?.content.list.noResults ?? 'No results match your search.')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                {displayFields.map((f) => (
                  <th key={f.id} className="px-4 py-2.5 text-left font-mono text-xs text-muted">
                    {f.name}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-left font-mono text-xs text-muted">
                  {d?.content.list.createdAt ?? 'Created'}
                </th>
                <th className="w-24 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
                >
                  {displayFields.map((f) => (
                    <td key={f.id} className="px-4 py-2.5 font-mono text-xs text-text max-w-50 truncate">
                      {formatValue(record.data[f.name] as RecordValue)}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && confirmId !== record.id && (
                        <Link
                          href={`/cms/content/${nodeId}/${record.id}`}
                          aria-label={d?.content.list.editAriaLabel ?? 'Edit'}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-text"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </Link>
                      )}

                      {canDelete && (
                        confirmId === record.id ? (
                          <span className="flex items-center gap-1">
                            <span className="font-mono text-[10px] text-muted">
                              {d?.content.list.confirmDelete ?? 'Delete?'}
                            </span>
                            <button
                              onClick={() => handleDelete(record.id)}
                              disabled={isPending}
                              className="rounded px-2 py-0.5 font-mono text-[10px] text-danger hover:underline disabled:opacity-40"
                            >
                              {d?.content.list.confirmYes ?? 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="rounded px-2 py-0.5 font-mono text-[10px] text-muted hover:underline"
                            >
                              {d?.content.list.confirmNo ?? 'No'}
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmId(record.id)}
                            aria-label={d?.content.list.deleteAriaLabel ?? 'Delete'}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-danger"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
