'use client'

import { MediaGalleryCard } from './MediaGalleryCard'
import { MediaUploadZone }  from '@/components/ui/organisms/MediaUploadZone'
import type { MediaRecord }  from '@/types/media'
import type { UploadEntry } from '@/lib/hooks/useMediaGallery'

export type MediaGalleryGridUploadProps = {
  queue:          UploadEntry[]
  dragging:       boolean
  onFiles:        (files: FileList) => void
  onRemove:       (id: string) => void
  onStartUpload:  (entry: UploadEntry) => void
  onCancel?:      (id: string) => void
  onDragOver:     (e: React.DragEvent) => void
  onDragLeave:    () => void
  onDrop:         (e: React.DragEvent) => void
  dropHereLabel:  string
  orClickLabel:   string
  uploadBtnLabel: string
  optimizingLabel: string
  uploadingLabel:  string
  errorLabel:          string
  successLabel:        string
  estimatedTimeLabel:  string
  videoUploadWarning?: string
  imageUploadWarning?: string
}

export type MediaGalleryGridProps = {
  assets:               MediaRecord[]
  loading:              boolean
  onSelect:             (asset: MediaRecord) => void
  onDelete?:            (asset: MediaRecord) => void
  emptyLabel:           string
  confirmDeleteLabel?:  string
  loadingCount?:        number
  uploadProps?:         MediaGalleryGridUploadProps
  selectedIds?:         Set<string>
  selectionMode?:       boolean
  onToggleSelect?:      (id: string) => void
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
  confirmDeleteLabel,
  loadingCount = 20,
  uploadProps,
  selectedIds,
  selectionMode = false,
  onToggleSelect,
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
    if (uploadProps) {
      return (
        <div className="rounded-md border border-border bg-surface p-6">
          <p className="mb-4 font-mono text-sm text-muted">{emptyLabel}</p>
          <MediaUploadZone
            queue={uploadProps.queue}
            dragging={uploadProps.dragging}
            onFiles={uploadProps.onFiles}
            onRemove={uploadProps.onRemove}
            onStartUpload={uploadProps.onStartUpload}
            onCancel={uploadProps.onCancel}
            onDragOver={uploadProps.onDragOver}
            onDragLeave={uploadProps.onDragLeave}
            onDrop={uploadProps.onDrop}
            dropHereLabel={uploadProps.dropHereLabel}
            orClickLabel={uploadProps.orClickLabel}
            uploadBtnLabel={uploadProps.uploadBtnLabel}
            optimizingLabel={uploadProps.optimizingLabel}
            uploadingLabel={uploadProps.uploadingLabel}
            errorLabel={uploadProps.errorLabel}
            successLabel={uploadProps.successLabel}
            estimatedTimeLabel={uploadProps.estimatedTimeLabel}
            videoUploadWarning={uploadProps.videoUploadWarning}
            imageUploadWarning={uploadProps.imageUploadWarning}
          />
        </div>
      )
    }
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
          confirmDeleteLabel={confirmDeleteLabel}
          selectionMode={selectionMode}
          selected={selectedIds?.has(asset.id)}
          onToggleSelect={() => onToggleSelect?.(asset.id)}
        />
      ))}
    </div>
  )
}
