'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

export type MediaGalleryPaginationProps = {
  page:       number
  totalPages: number
  total:      number
  perPage:    number
  onPage:     (p: number) => void
  onPerPage:  (n: number) => void
  perPageOptions?: number[]
  ofLabel:    string
  perPageLabel: string
}

export function MediaGalleryPagination({
  page,
  totalPages,
  total,
  perPage,
  onPage,
  onPerPage,
  perPageOptions = [10, 20, 40],
  ofLabel,
  perPageLabel,
}: MediaGalleryPaginationProps) {
  const start = (page - 1) * perPage + 1
  const end   = Math.min(page * perPage, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Count */}
      <p className="font-mono text-[11px] text-muted">
        {start}–{end} {ofLabel} {total}
      </p>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="flex h-7 w-7 items-center justify-center rounded border border-border bg-surface text-muted transition-colors hover:border-primary/50 hover:text-text disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft size={13} />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | '…')[]>((acc, p, idx, arr) => {
            if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push('…')
            acc.push(p)
            return acc
          }, [])
          .map((item, idx) =>
            item === '…' ? (
              <span key={`sep-${idx}`} className="px-1 font-mono text-xs text-muted">…</span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPage(item as number)}
                className={`flex h-7 min-w-7 items-center justify-center rounded border px-1 font-mono text-xs transition-colors ${
                  item === page
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-muted hover:border-primary/50 hover:text-text'
                }`}
              >
                {item}
              </button>
            )
          )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="flex h-7 w-7 items-center justify-center rounded border border-border bg-surface text-muted transition-colors hover:border-primary/50 hover:text-text disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Per-page selector */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-muted">{perPageLabel}</span>
        <select
          value={perPage}
          onChange={(e) => { onPage(1); onPerPage(Number(e.target.value)) }}
          className="h-7 rounded border border-border bg-surface px-2 font-mono text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary/60"
        >
          {perPageOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
