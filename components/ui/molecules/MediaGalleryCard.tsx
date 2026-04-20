'use client'

import { useRef, useState } from 'react'
import { Link2, Trash2, Check } from 'lucide-react'
import { Spinner } from '@/components/ui/atoms/Spinner'
import type { MediaRecord } from '@/types/media'

export type MediaGalleryCardProps = {
  asset:               MediaRecord
  onClick?:            (asset: MediaRecord) => void
  onDelete?:           (asset: MediaRecord) => void
  confirmDeleteLabel?: string
  selectionMode?:      boolean
  selected?:           boolean
  onToggleSelect?:     () => void
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

const LONG_PRESS_MS = 500

export function MediaGalleryCard({
  asset,
  onClick,
  onDelete,
  confirmDeleteLabel = 'Sure?',
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: MediaGalleryCardProps) {
  const isVideo  = asset.mimeType.startsWith('video/')
  const name     = asset.name ?? asset.key.split('/').pop() ?? asset.key
  const [copied,     setCopied]     = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [pressing,   setPressing]   = useState(false)

  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired  = useRef(false)

  // ── Long press (mobile) ────────────────────────────────────────────────────
  function startLongPress() {
    longPressFired.current = false
    setPressing(true)
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      setPressing(false)
      onToggleSelect?.()
      navigator.vibrate?.(40)
    }, LONG_PRESS_MS)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setPressing(false)
  }

  function handleTouchStart(e: React.TouchEvent) {
    // Only single-finger press
    if (e.touches.length !== 1) return
    startLongPress()
  }

  function handleTouchEnd(e: React.TouchEvent) {
    cancelLongPress()
    // Prevent the synthetic click from firing after a long press
    if (longPressFired.current) {
      e.preventDefault()
      longPressFired.current = false
    }
  }

  function handleTouchMove() {
    cancelLongPress()
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
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
      setConfirming(false)
      setDeleting(true)
      Promise.resolve(onDelete?.(asset)).finally(() => setDeleting(false))
    } else {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
    }
  }

  return (
    <div className="group flex flex-col gap-1.5 select-none">
      {/* Thumbnail */}
      <div className={`relative aspect-square w-full overflow-hidden rounded-md border bg-surface-2 transition-all duration-200 ${
        pressing  ? 'scale-95 ring-2 ring-primary/40' :
        selected  ? 'border-primary ring-2 ring-primary/50 scale-100' :
        'border-border group-hover:border-primary/50 group-hover:ring-1 group-hover:ring-primary/30'
      }`}>
        {/* Blur + spinner overlay while deleting */}
        {deleting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/50 backdrop-blur-sm">
            <Spinner size="md" color="primary" />
          </div>
        )}

        {/* Selection checkbox — top-left */}
        <div className={`absolute left-2 top-2 z-20 transition-all duration-200 ${
          (selected || selectionMode) ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
        }`}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.() }}
            aria-label={selected ? 'Deselect' : 'Select'}
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-150 shadow-sm ${
              selected
                ? 'border-primary bg-primary text-white'
                : 'border-white/80 bg-black/40 backdrop-blur-sm hover:border-primary/80'
            }`}
          >
            {selected && (
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Clickable area — handles both mouse click and touch long-press */}
        <button
          type="button"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onClick={() => {
            if (longPressFired.current) return
            if (selectionMode) onToggleSelect?.()
            else onClick?.(asset)
          }}
          className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-md"
          aria-label={name}
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTouchCallout: 'none' } as React.CSSProperties}
        >
          {isVideo ? (
            <div className={`relative h-full w-full bg-black transition-transform duration-300 ${pressing ? '' : 'group-hover:scale-105'}`}>
              <video
                src={`${asset.publicUrl}#t=5`}
                preload="metadata"
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget
                  v.currentTime = v.duration > 10 ? 5 : v.duration * 0.5
                }}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="none" className="opacity-60 drop-shadow" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.publicUrl}
              alt={name}
              loading="lazy"
              draggable={false}
              className={`h-full w-full object-cover transition-transform duration-300 ${pressing ? '' : 'group-hover:scale-105'}`}
            onContextMenu={(e) => e.preventDefault()}
            />
          )}
        </button>

        {/* Action buttons — desktop: appear on hover; mobile: appear in selection mode */}
        <div className={`absolute bottom-0 inset-x-0 flex items-center justify-end gap-1.5 px-2 py-2 transition-opacity duration-200 bg-linear-to-t from-black/60 to-transparent ${
          deleting || selectionMode
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto'
        }`}>
            {/* Copy link */}
            <button
              type="button"
              onClick={handleCopy}
              title="Copy URL"
              disabled={deleting}
              className={`flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-md transition-all duration-150 ${
                copied
                  ? 'bg-success text-white shadow-sm'
                  : 'bg-surface/70 text-text hover:bg-primary hover:text-white disabled:opacity-40'
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
                disabled={deleting}
                title={deleting ? '' : confirming ? 'Confirm delete' : 'Delete'}
                className={`flex h-7 sm:h-10 items-center justify-center rounded-md px-2 sm:px-3 gap-1.5 font-mono text-[11px] sm:text-[13px] font-medium transition-all duration-150 ${
                  deleting
                    ? 'bg-danger/60 text-white w-auto cursor-not-allowed'
                    : confirming
                      ? 'bg-danger text-white w-auto'
                      : 'bg-danger/80 text-white hover:bg-danger w-7 sm:w-10'
                }`}
              >
                {deleting
                  ? <><Spinner size="sm" color="primary" className="border-white/60" /><span className="hidden sm:inline">...</span></>
                  : <>
                      <Trash2 size={11} className="sm:hidden" />
                      <Trash2 size={16} className="hidden sm:block" />
                      {confirming && <span>{confirmDeleteLabel}</span>}
                    </>
                }
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
