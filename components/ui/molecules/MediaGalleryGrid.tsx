'use client'

import { MediaGalleryCard } from './MediaGalleryCard'
import type { MediaRecord } from '@/types/media'

export type MediaGalleryGridProps = {
  assets:      MediaRecord[]
  loading:     boolean
  onSelect:    (asset: MediaRecord) => void
  onDelete?:   (asset: MediaRecord) => void
  emptyLabel:  string
  loadingCount?: number
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="aspect-square w-full animate-pulse rounded-md border border-border bg-surface-2" />
      <div className="h-2.5 w-3/4 animate-pulse rounded bg-surface-2" />
      <div className="h-2 w-1/2 animate-pulse rounded bg-surface-2" />
    </div>
  )
}

export function MediaGalleryGrid({
  assets,
  loading,
  onSelect,
  onDelete,
  emptyLabel,
  loadingCount = 20,
}: MediaGalleryGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {Array.from({ length: loadingCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-border bg-surface py-16">
        <p className="font-mono text-sm text-muted">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
      {assets.map((asset) => (
        <MediaGalleryCard
          key={asset.id}
          asset={asset}
          onClick={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
