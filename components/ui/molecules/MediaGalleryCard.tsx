'use client'

import { useState } from 'react'
import { Link2, Trash2, Check } from 'lucide-react'
import type { MediaRecord } from '@/types/media'

export type MediaGalleryCardProps = {
  asset:     MediaRecord
  onClick?:  (asset: MediaRecord) => void
  onDelete?: (asset: MediaRecord) => void
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('default', { month: 'short', day: 'numeric' }).format(new Date(date))
}

export function MediaGalleryCard({ asset, onClick, onDelete }: MediaGalleryCardProps) {
  const isVideo  = asset.mimeType.startsWith('video/')
  const name     = asset.key.split('/').pop() ?? asset.key
  const [copied,      setCopied]      = useState(false)
  const [confirming,  setConfirming]  = useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(asset.publicUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirming) {
      onDelete?.(asset)
      setConfirming(false)
    } else {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
    }
  }

  return (
    <div className="group flex flex-col gap-1.5">
      {/* Thumbnail */}
      <div className="relative aspect-square w-full overflow-hidden rounded-md border border-border bg-surface-2 transition-all duration-200 group-hover:border-primary/50 group-hover:ring-1 group-hover:ring-primary/30">
        {/* Clickable area */}
        <button
          type="button"
          onClick={() => onClick?.(asset)}
          className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-md"
          aria-label={name}
        >
          {isVideo ? (
            <div className="flex h-full w-full items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.publicUrl}
              alt={name}
              loading="lazy"
              className="h-full w-full object-cover group-hover:scale-105"
              style={{ transition: 'transform 300ms ease-in-out' }}
            />
          )}
        </button>

        {/* Action buttons — appear on hover, sit on a gradient scrim */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-end gap-1.5 px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-linear-to-t from-black/60 to-transparent">
          {/* Copy link */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy URL"
            className={`flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-md transition-all duration-150 ${
              copied
                ? 'bg-success text-white shadow-sm'
                : 'bg-surface/70 text-text hover:bg-primary hover:text-white'
            }`}
          >
            {copied ? <Check size={13} className="sm:hidden" /> : <Link2 size={13} className="sm:hidden" />}
            {copied ? <Check size={18} className="hidden sm:block" /> : <Link2 size={18} className="hidden sm:block" />}
          </button>

          {/* Delete */}
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              title={confirming ? 'Confirm delete' : 'Delete'}
              className={`flex h-7 sm:h-10 items-center justify-center rounded-md px-2 sm:px-3 gap-1.5 font-mono text-[11px] sm:text-[13px] font-medium transition-all duration-150 ${
                confirming
                  ? 'bg-danger text-white w-auto'
                  : 'bg-danger/80 text-white hover:bg-danger w-7 sm:w-10'
              }`}
            >
              <Trash2 size={11} className="sm:hidden" />
              <Trash2 size={16} className="hidden sm:block" />
              {confirming && <span>sure?</span>}
            </button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="min-w-0 px-0.5">
        <p className="truncate font-mono text-[11px] text-text">{name}</p>
        <p className="font-mono text-[10px] text-muted">
          {formatBytes(asset.sizeBytes)} · {formatDate(asset.createdAt)}
        </p>
      </div>
    </div>
  )
}
