'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { useMediaLibrary } from '@/lib/hooks/useMediaLibrary'
import { useUIStore } from '@/lib/stores/uiStore'
import type { MediaRecord } from '@/types/media'

export type MediaLibraryPickerProps = {
  open:     boolean
  filter:   'image' | 'video'
  onClose:  () => void
  // Modo single (comportamiento por defecto)
  onSelect?: (asset: MediaRecord) => void
  // Modo multi-selección
  multiSelect?:   boolean
  onSelectMulti?: (assets: MediaRecord[]) => void
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function AssetCard({
  asset,
  selected,
  multiMode,
  onSelect,
  onDoubleClick,
}: {
  asset:         MediaRecord
  selected:      boolean
  multiMode:     boolean
  onSelect:      (a: MediaRecord) => void
  onDoubleClick: (a: MediaRecord) => void
}) {
  const isImage = asset.mimeType.startsWith('image/')
  const name    = asset.key.split('/').pop() ?? asset.key

  return (
    <button
      type="button"
      onClick={() => onSelect(asset)}
      onDoubleClick={() => !multiMode && onDoubleClick(asset)}
      className={[
        'relative aspect-square overflow-hidden rounded-md border bg-surface-2 transition-all duration-150 cursor-pointer',
        selected
          ? multiMode
            ? 'border-primary ring-2 ring-primary ring-offset-1 ring-offset-background'
            : 'border-primary ring-2 ring-primary ring-offset-1 ring-offset-background'
          : 'border-border hover:border-primary/60',
      ].join(' ')}
      title={name}
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.publicUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
          <span className="font-mono text-[9px] px-1 truncate w-full text-center">{name}</span>
        </div>
      )}

      {selected && multiMode && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/60">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {selected && !multiMode && (
        <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="aspect-square rounded-md border border-border bg-surface-2 animate-pulse" />
  )
}

export function MediaLibraryPicker({
  open,
  filter,
  onClose,
  onSelect,
  multiSelect = false,
  onSelectMulti,
}: MediaLibraryPickerProps) {
  const d = useUIStore((s) => s.cmsDict)
  const u = d?.content.upload

  // Single-select state
  const selectedRef                              = useRef<MediaRecord | null>(null)
  const { assets, isLoading, hasMore, sentinelRef, handleSearch } = useMediaLibrary(filter, open)

  const [selectedId, setSelectedId]       = useState<string | null>(null)
  // Multi-select state
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())

  function handleSingleSelect(asset: MediaRecord) {
    setSelectedId(asset.id)
    selectedRef.current = asset
  }

  function handleMultiSelect(asset: MediaRecord) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(asset.id)) next.delete(asset.id)
      else next.add(asset.id)
      return next
    })
  }

  function handleDoubleClick(asset: MediaRecord) {
    onSelect?.(asset)
    onClose()
  }

  function handleConfirmSingle() {
    if (!selectedRef.current) return
    onSelect?.(selectedRef.current)
    onClose()
  }

  function handleConfirmMulti() {
    const selected = assets.filter((a) => selectedIds.has(a.id))
    onSelectMulti?.(selected)
    onClose()
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Reset selection when reopening
  useEffect(() => {
    if (open) {
      setSelectedId(null)
      setSelectedIds(new Set())
      selectedRef.current = null
    }
  }, [open])

  if (!open) return null

  const selectedAsset = assets.find((a) => a.id === selectedId) ?? null
  const multiCount    = selectedIds.size

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <VHSTransition duration="fast" className="flex w-full sm:max-w-5xl flex-col h-[92dvh] sm:h-[90vh] sm:mx-4 rounded-t-2xl sm:rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 overflow-hidden">
        {/* Handle — mobile only */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden shrink-0">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3 shrink-0">
          <span className="font-mono text-sm text-text">
            {u?.mediaLibraryTitle ?? 'Media Library'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-2.5 shrink-0">
          <div className="relative flex-1">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder={u?.searchPlaceholder ?? 'Search…'}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-surface-2 py-1.5 pl-8 pr-3 font-mono text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {assets.length === 0 && !isLoading ? (
            <div className="flex h-full items-center justify-center font-mono text-xs text-muted">
              {u?.emptyLibrary ?? 'No media files yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  selected={multiSelect ? selectedIds.has(asset.id) : asset.id === selectedId}
                  multiMode={multiSelect}
                  onSelect={multiSelect ? handleMultiSelect : handleSingleSelect}
                  onDoubleClick={handleDoubleClick}
                />
              ))}

              {/* Skeleton cards while loading */}
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={`sk-${i}`} />
              ))}
            </div>
          )}

          {/* IntersectionObserver sentinel */}
          {hasMore && <div ref={sentinelRef} className="h-4 w-full" />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 shrink-0">
          {multiSelect ? (
            // ── Multi-select footer ──
            <>
              <span className="font-mono text-xs text-muted">
                {multiCount > 0 ? `${multiCount} seleccionada${multiCount !== 1 ? 's' : ''}` : '·'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:bg-surface-2 hover:text-text transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={multiCount === 0}
                  onClick={handleConfirmMulti}
                  className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white disabled:opacity-40 hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                >
                  {`Añadir${multiCount > 0 ? ` (${multiCount})` : ''}`}
                </button>
              </div>
            </>
          ) : (
            // ── Single-select footer ──
            <>
              <div className="flex flex-col min-w-0">
                {selectedAsset ? (
                  <>
                    <span className="font-mono text-xs text-text truncate max-w-xs">
                      {selectedAsset.key.split('/').pop()}
                    </span>
                    <span className="font-mono text-[10px] text-muted">
                      {formatBytes(selectedAsset.sizeBytes)}
                      {selectedAsset.mimeType ? ` · ${selectedAsset.mimeType}` : ''}
                    </span>
                  </>
                ) : (
                  <span className="font-mono text-xs text-muted">·</span>
                )}
              </div>

              <button
                type="button"
                disabled={!selectedAsset}
                onClick={handleConfirmSingle}
                className="ml-4 shrink-0 rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white disabled:opacity-40 hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                {u?.selectAsset ?? 'Select'}
              </button>
            </>
          )}
        </div>
      </VHSTransition>
    </div>
  , document.body)
}
