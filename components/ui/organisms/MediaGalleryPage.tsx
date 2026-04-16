'use client'

import { useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { useMediaGallery } from '@/lib/hooks/useMediaGallery'
import { deleteMediaRecord, bulkDeleteMediaRecords } from '@/lib/actions/media.actions'
import { MediaGalleryTabs }      from '@/components/ui/molecules/MediaGalleryTabs'
import { MediaGalleryGrid }      from '@/components/ui/molecules/MediaGalleryGrid'
import { MediaGalleryPagination } from '@/components/ui/molecules/MediaGalleryPagination'
import { MediaBulkBar }          from '@/components/ui/molecules/MediaBulkBar'
import { MediaUploadModal }      from '@/components/ui/organisms/MediaUploadModal'
import { MediaPreviewModal }     from '@/components/ui/organisms/MediaPreviewModal'
import { MediaBulkDeleteModal }  from '@/components/ui/organisms/MediaBulkDeleteModal'
import { VideoFallbackModal }    from '@/components/ui/organisms/VideoFallbackModal'
import { VHSTransition }         from '@/components/ui/transitions/VHSTransition'
import type { CmsDictionary }    from '@/locales/en'
import type { MediaRecord }      from '@/types/media'

/** cms.cartum.io + 5 → "cms_cartum_media_5.zip"  */
function buildZipFilename(count: number): string {
  const parts = window.location.hostname.split('.')
  const prefix = parts.length >= 2
    ? `${parts[0]}_${parts[1]}`
    : parts[0]
  return `${prefix}_media_${count}.zip`
}

export type MediaGalleryPageProps = {
  d: CmsDictionary
}

export function MediaGalleryPage({ d }: MediaGalleryPageProps) {
  const g = d.content.mediaGallery
  const [showUpload,       setShowUpload]       = useState(false)
  const [previewAsset,     setPreviewAsset]     = useState<MediaRecord | null>(null)
  const [showBulkDelete,   setShowBulkDelete]   = useState(false)

  const {
    assets, total, totalPages, loading,
    filter, page, perPage,
    changeFilter, changePage, changePerPage,
    handleSearchInput,
    queue, dragging, uploading,
    addFilesToQueue, removeFromQueue, startUpload, cancelUpload, cancelAllUploads,
    onDragOver, onDragLeave, onDrop,
    selectedIds, selectionMode, toggleSelect, clearSelection,
    refresh,
    videoFallbackOpen, confirmVideoFallback, cancelVideoFallback,
  } = useMediaGallery({
    videoSizeErrorLabel:  g.videoSizeError,
    imageLimitErrorLabel: g.imageLimitError,
    videoLimitErrorLabel: g.videoLimitError,
    uploadSuccessBatch:   g.uploadedBatch,
    uploadErrorBatch:     g.uploadErrorBatch,
    compressionBatch:     g.compressionBatch,
    duplicateErrorLabel:  g.duplicateError,
  })

  async function handleDelete(asset: MediaRecord) {
    await deleteMediaRecord(asset.id)
    refresh()
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    const res = await bulkDeleteMediaRecords(ids)
    if (res.success) {
      const { deleted, failed } = res.data
      if (failed === 0) {
        toast.success(g.bulkDeletedSuccess.replace('{n}', String(deleted)))
      } else {
        toast.warning(
          g.bulkDeletedPartial
            .replace('{deleted}', String(deleted))
            .replace('{failed}', String(failed))
        )
      }
    } else {
      toast.error(g.uploadError)
    }
    clearSelection()
    setShowBulkDelete(false)
    refresh()
  }

  async function handleBulkDownload() {
    const ids = Array.from(selectedIds)
    const toastId = 'bulk-download'
    toast.loading(g.bulkDownloading, { id: toastId })
    try {
      const res = await fetch('/api/internal/media/bulk-download', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Download failed')

      const blob  = await res.blob()
      const url   = URL.createObjectURL(blob)
      const a     = document.createElement('a')
      a.href      = url
      a.download  = buildZipFilename(ids.length)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(g.bulkDownloadSuccess.replace('{n}', String(ids.length)), { id: toastId })
    } catch {
      toast.error(g.uploadError, { id: toastId })
    }
  }

  const searchRef = useRef<HTMLInputElement>(null)

  const bulkBarLabels = {
    placeholder: g.bulkPlaceholder,
    download:    g.bulkDownload,
    delete:      g.bulkDelete,
    selected:    g.bulkSelected,
    clearLabel:  g.bulkClear,
  }

  const bulkDeleteLabels = {
    title:    g.bulkDeleteTitle,
    body:     g.bulkDeleteBody,
    cancel:   g.bulkDeleteCancel,
    confirm:  g.bulkDeleteConfirm,
    deleting: g.bulkDeleting,
  }

  const emptyLabel = (() => {
    const hasSearch = searchRef.current?.value?.trim()
    if (hasSearch) return g.emptySearch
    return filter === 'image' ? g.emptyImages : g.emptyVideos
  })()

  return (
    <div className="w-full min-h-full">
      <div className="flex flex-col gap-4 p-4 pt-12 md:pt-6 md:p-6 md:max-w-350 md:mx-auto">
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
        onClose={() => { cancelAllUploads(); setShowUpload(false) }}
        queue={queue}
        dragging={dragging}
        onFiles={(files) => addFilesToQueue(files, g.videoSizeError)}
        onRemove={removeFromQueue}
        onStartUpload={(entry) =>
          startUpload(entry, {
            error:           g.uploadError,
            success:         g.uploadSuccess,
            vpsUnreachable:  g.vpsUnreachable,
            vpsAuth:         g.vpsAuth,
            vpsTimeout:      g.vpsTimeout,
            vpsValidation:   g.vpsValidation,
            vpsPartial:      g.vpsPartial,
            videoSizeError:  g.videoSizeError,
            videoChunking:   g.videoChunking,
            videoProcessing: g.videoProcessing,
            videoFinalizing: g.videoFinalizing,
            videoVpsSkipped: g.videoVpsSkipped,
          })
        }
        onCancel={cancelUpload}
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
        videoUploadWarning={g.videoUploadWarning}
      />

      {/* Preview modal */}
      <MediaPreviewModal
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
        onDelete={handleDelete}
        deleteLabel={g.deleteLabel}
        confirmLabel={g.confirmDelete}
        copyUrlLabel={g.copyUrlLabel}
        copiedLabel={g.copiedLabel}
      />

      {/* Tabs + Search + Mobile bulk bar */}
      <div className="flex flex-wrap items-center gap-3">
        <MediaGalleryTabs
          value={filter}
          onChange={changeFilter}
          imageLabel={g.tabImages}
          videoLabel={g.tabVideos}
        />

        {/* Mobile: bulk bar — expand/collapse con overflow+max-height */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
          selectionMode
            ? 'max-h-12 opacity-100 translate-y-0'
            : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
        }`}>
          <MediaBulkBar
            count={selectedIds.size}
            labels={bulkBarLabels}
            onDownload={handleBulkDownload}
            onDelete={() => setShowBulkDelete(true)}
            onClear={clearSelection}
          />
        </div>

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

      {/* Desktop: bulk bar — max-height transition, siempre en DOM */}
      <div className="hidden md:block overflow-hidden">
        <div
          style={{
            maxHeight:  selectionMode ? '48px' : '0px',
            opacity:    selectionMode ? 1 : 0,
            transform:  selectionMode ? 'translateY(0)' : 'translateY(-6px)',
            transition: 'max-height 300ms ease-out, opacity 250ms ease-out, transform 250ms ease-out',
            pointerEvents: selectionMode ? 'auto' : 'none',
          }}
        >
          <div className="pb-1">
            <MediaBulkBar
              count={selectedIds.size}
              labels={bulkBarLabels}
              onDownload={handleBulkDownload}
              onDelete={() => setShowBulkDelete(true)}
              onClear={clearSelection}
            />
          </div>
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

      {/* Video fallback warning modal */}
      <VideoFallbackModal
        open={videoFallbackOpen}
        onUpload={confirmVideoFallback}
        onCancel={cancelVideoFallback}
        labels={{
          title:  g.videoFallbackTitle,
          body:   g.videoFallbackBody,
          upload: g.videoFallbackUpload,
          cancel: g.videoFallbackCancel,
        }}
      />

      {/* Bulk delete confirmation modal */}
      <MediaBulkDeleteModal
        open={showBulkDelete}
        count={selectedIds.size}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        labels={bulkDeleteLabels}
      />

      {/* Grid + bottom pagination wrapped in VHSTransition, re-fires on tab change */}
      <VHSTransition trigger={filter} duration="normal">
        <MediaGalleryGrid
          assets={assets}
          loading={loading}
          onSelect={(asset) => { if (!selectionMode) setPreviewAsset(asset) }}
          onDelete={handleDelete}
          emptyLabel={emptyLabel}
          confirmDeleteLabel={g.confirmDelete}
          selectedIds={selectedIds}
          selectionMode={selectionMode}
          onToggleSelect={toggleSelect}
          uploadProps={{
            queue,
            dragging,
            onFiles:        (files) => addFilesToQueue(files, g.videoSizeError),
            onRemove:       removeFromQueue,
            onCancel:       cancelUpload,
            onStartUpload:  (entry) => startUpload(entry, {
              error:           g.uploadError,
              success:         g.uploadSuccess,
              vpsUnreachable:  g.vpsUnreachable,
              vpsAuth:         g.vpsAuth,
              vpsTimeout:      g.vpsTimeout,
              vpsValidation:   g.vpsValidation,
              vpsPartial:      g.vpsPartial,
              videoSizeError:  g.videoSizeError,
              videoChunking:   g.videoChunking,
              videoProcessing: g.videoProcessing,
              videoFinalizing: g.videoFinalizing,
              videoVpsSkipped: g.videoVpsSkipped,
            }),
            onDragOver,
            onDragLeave,
            onDrop,
            dropHereLabel:   g.dropHere,
            orClickLabel:    g.orClick,
            uploadBtnLabel:  g.uploadStart,
            optimizingLabel: g.optimizing,
            uploadingLabel:  g.uploading,
            errorLabel:          g.uploadError,
            successLabel:        g.uploadSuccess,
            videoUploadWarning:  g.videoUploadWarning,
          }}
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
