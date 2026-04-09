'use client'

import { useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useMediaGallery } from '@/lib/hooks/useMediaGallery'
import { deleteMediaRecord } from '@/lib/actions/media.actions'
import { MediaGalleryTabs }      from '@/components/ui/molecules/MediaGalleryTabs'
import { MediaGalleryGrid }      from '@/components/ui/molecules/MediaGalleryGrid'
import { MediaGalleryPagination } from '@/components/ui/molecules/MediaGalleryPagination'
import { MediaUploadModal }      from '@/components/ui/organisms/MediaUploadModal'
import { MediaPreviewModal }     from '@/components/ui/organisms/MediaPreviewModal'
import { VHSTransition }         from '@/components/ui/transitions/VHSTransition'
import type { CmsDictionary }    from '@/locales/en'
import type { MediaRecord }      from '@/types/media'

export type MediaGalleryPageProps = {
  d: CmsDictionary
}

export function MediaGalleryPage({ d }: MediaGalleryPageProps) {
  const g = d.content.mediaGallery
  const [showUpload,  setShowUpload]  = useState(false)
  const [previewAsset, setPreviewAsset] = useState<MediaRecord | null>(null)

  const {
    assets, total, totalPages, loading,
    filter, page, perPage,
    changeFilter, changePage, changePerPage,
    handleSearchInput,
    queue, dragging, uploading,
    addFilesToQueue, removeFromQueue, startUpload,
    onDragOver, onDragLeave, onDrop,
    refresh,
  } = useMediaGallery()

  async function handleDelete(asset: MediaRecord) {
    await deleteMediaRecord(asset.id)
    refresh()
  }

  const searchRef = useRef<HTMLInputElement>(null)

  const emptyLabel = (() => {
    const hasSearch = searchRef.current?.value?.trim()
    if (hasSearch) return g.emptySearch
    return filter === 'image' ? g.emptyImages : g.emptyVideos
  })()

  return (
    <div className="w-full min-h-full">
      <div className="flex flex-col gap-4 p-4 md:p-6 md:max-w-350 md:mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-base font-semibold text-text">{g.title}</h1>

        <button
          type="button"
          onClick={() => setShowUpload((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {g.uploadBtn}
        </button>
      </div>

      {/* Upload modal */}
      <MediaUploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        queue={queue}
        dragging={dragging}
        onFiles={addFilesToQueue}
        onRemove={removeFromQueue}
        onStartUpload={(entry) =>
          startUpload(entry, {
            error:          g.uploadError,
            success:        g.uploadSuccess,
            vpsUnreachable: g.vpsUnreachable,
            vpsAuth:        g.vpsAuth,
            vpsTimeout:     g.vpsTimeout,
            vpsValidation:  g.vpsValidation,
            vpsPartial:     g.vpsPartial,
          })
        }
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        title={g.uploadBtn}
        dropHereLabel={g.dropHere}
        orClickLabel={g.orClick}
        uploadBtnLabel={g.uploadStart}
        optimizingLabel={g.optimizing}
        uploadingLabel={g.uploading}
        errorLabel={g.uploadError}
        successLabel={g.uploadSuccess}
      />

      {/* Preview modal */}
      <MediaPreviewModal
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
        onDelete={handleDelete}
      />

      {/* Tabs + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <MediaGalleryTabs
          value={filter}
          onChange={changeFilter}
          imageLabel={g.tabImages}
          videoLabel={g.tabVideos}
        />

        <div className="relative flex-1 min-w-45">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            type="search"
            placeholder={g.searchPlaceholder}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="w-full rounded-md border border-border bg-surface-2 py-1.5 pl-7 pr-3 font-mono text-xs text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary/60"
          />
        </div>
      </div>

      {/* Pagination — top */}
      {!loading && total > 0 && (
        <MediaGalleryPagination
          page={page}
          totalPages={totalPages}
          total={total}
          perPage={perPage}
          onPage={changePage}
          onPerPage={changePerPage}
          ofLabel={g.ofLabel}
          perPageLabel={g.perPageLabel}
        />
      )}

      {/* Grid + bottom pagination wrapped in VHSTransition, re-fires on tab change */}
      <VHSTransition trigger={filter} duration="normal">
        <MediaGalleryGrid
          assets={assets}
          loading={loading}
          onSelect={(asset) => setPreviewAsset(asset)}
          onDelete={handleDelete}
          emptyLabel={emptyLabel}
        />

        {/* Pagination — bottom */}
        {!loading && total > 0 && (
          <MediaGalleryPagination
            page={page}
            totalPages={totalPages}
            total={total}
            perPage={perPage}
            onPage={changePage}
            onPerPage={changePerPage}
            ofLabel={g.ofLabel}
            perPageLabel={g.perPageLabel}
          />
        )}
      </VHSTransition>
    </div>
    </div>
  )
}
