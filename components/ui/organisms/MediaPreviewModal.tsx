'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, ExternalLink, Link2, Trash2, Check } from 'lucide-react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { MediaRecord } from '@/types/media'

export type MediaPreviewModalProps = {
  asset:     MediaRecord | null
  onClose:   () => void
  onDelete?: (asset: MediaRecord) => void
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('default', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date))
}

export function MediaPreviewModal({ asset, onClose, onDelete }: MediaPreviewModalProps) {
  const open = asset !== null
  const [copied,     setCopied]     = useState(false)
  const [confirming, setConfirming] = useState(false)

  // ESC to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !asset) return null

  const isVideo = asset.mimeType.startsWith('video/')
  const name    = asset.key.split('/').pop() ?? asset.key

  function handleCopy() {
    navigator.clipboard.writeText(asset!.publicUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDelete() {
    if (confirming) {
      onDelete?.(asset!)
      setConfirming(false)
      onClose()
    } else {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <VHSTransition duration="fast" className="flex w-full max-w-4xl flex-col rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
          <span className="font-mono text-xs text-muted truncate max-w-[60%]" title={name}>{name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Copy URL */}
            <button
              type="button"
              onClick={handleCopy}
              title="Copy URL"
              className={`flex h-7 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] transition-all duration-150 ${
                copied
                  ? 'bg-success/15 text-success'
                  : 'text-muted hover:bg-surface-2 hover:text-text'
              }`}
            >
              {copied ? <Check size={12} /> : <Link2 size={12} />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy URL'}</span>
            </button>

            <a
              href={asset.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
              aria-label="Open in new tab"
            >
              <ExternalLink size={13} />
            </a>
            <a
              href={asset.publicUrl}
              download={name}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
              aria-label="Download"
            >
              <Download size={13} />
            </a>

            {/* Divider */}
            <span className="h-4 w-px bg-border mx-0.5" />

            {/* Delete */}
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                title={confirming ? 'Click again to confirm' : 'Delete'}
                className={`flex h-7 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] transition-all duration-150 ${
                  confirming
                    ? 'bg-danger/15 text-danger ring-1 ring-danger/40'
                    : 'text-muted hover:bg-danger/10 hover:text-danger'
                }`}
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">{confirming ? 'Confirm?' : 'Delete'}</span>
              </button>
            )}

            <span className="h-4 w-px bg-border mx-0.5" />

            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Preview — min-h prevents modal from flashing tiny while image loads */}
        <div className="flex min-h-70 sm:min-h-95 flex-1 items-center justify-center bg-bg p-4">
          {isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={asset.publicUrl}
              controls
              className="max-h-[60vh] max-w-full rounded-md"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.publicUrl}
              alt={name}
              className="max-h-[60vh] max-w-full rounded-md object-contain"
            />
          )}
        </div>

        {/* Footer — metadata */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 shrink-0">
          <span className="font-mono text-[10px] text-muted">{formatBytes(asset.sizeBytes)}</span>
          <span className="h-3 w-px bg-border" />
          <span className="font-mono text-[10px] text-muted">{asset.mimeType}</span>
          <span className="h-3 w-px bg-border" />
          <span className="font-mono text-[10px] text-muted">{formatDate(asset.createdAt)}</span>
        </div>
      </VHSTransition>
    </div>,
    document.body,
  )
}
