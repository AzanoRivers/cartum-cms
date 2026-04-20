'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useMediaGallery } from '@/lib/hooks/useMediaGallery'
import { deleteMediaRecord, bulkDeleteMediaRecords, getMediaStorageSummary } from '@/lib/actions/media.actions'
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
import type { MediaRecord, MediaStorageSummary } from '@/types/media'
import { BLOB_STORAGE_QUOTA_BYTES } from '@/types/media'

// ── Storage badge helpers ───────────────────────────────────────────────────

function formatStorageBytes(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

type BadgeColor = 'accent' | 'primary'

function StorageBadge({ label, bytes, count, color }: {
  label: string
  bytes: number
  count: number
  color: BadgeColor
}) {
  const dotCls  = color === 'accent' ? 'bg-accent'   : 'bg-primary'
  const ringCls = color === 'accent'
    ? 'border-accent/20 bg-accent/[0.07]'
    : 'border-primary/20 bg-primary/[0.07]'
  const sizeCls = color === 'accent' ? 'text-accent' : 'text-primary'

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.75 font-mono text-[10px] ${ringCls}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${dotCls}`} />
      <span className="text-muted">{label}</span>
      <span className="text-muted/40">·</span>
      <span className={`font-semibold ${sizeCls}`}>{formatStorageBytes(bytes)}</span>
      <span className="text-muted/40">·</span>
      <span className="text-muted">{count}</span>
    </div>
  )
}

function BlobQuotaBadge({ usedBytes }: { usedBytes: number }) {
  const quota  = BLOB_STORAGE_QUOTA_BYTES
  const pct    = Math.min(usedBytes / quota, 1)
  const pctInt = Math.round(pct * 100)

  const level = pct > 0.9 ? 'danger' : pct > 0.7 ? 'warn' : 'ok'
  const styles = {
    ok:     { dot: 'bg-success',     bar: 'bg-success',     border: 'border-success/20',     bg: 'bg-success/[0.07]',     text: 'text-success' },
    warn:   { dot: 'bg-amber-400',   bar: 'bg-amber-400',   border: 'border-amber-400/25',   bg: 'bg-amber-400/[0.07]',   text: 'text-amber-400' },
    danger: { dot: 'bg-danger',      bar: 'bg-danger',      border: 'border-danger/25',      bg: 'bg-danger/[0.07]',      text: 'text-danger' },
  }[level]

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.75 font-mono text-[10px] ${styles.border} ${styles.bg}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${styles.dot}`} />
      <span className="text-muted">Blob</span>
      <span className="text-muted/40">·</span>
      <span className={`font-semibold ${styles.text}`}>{formatStorageBytes(usedBytes)}</span>
      <span className="text-muted/40">/</span>
      <span className="text-muted">{formatStorageBytes(quota)}</span>
      {/* progress bar */}
      <div className="relative h-0.75 w-10 overflow-hidden rounded-full bg-border">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${styles.bar}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className={`tabular-nums ${styles.text}`}>{pctInt}%</span>
    </div>
  )
}

/** cms.cartum.io + 5 → "cms_cartum_media_5.zip"  */
function buildZipFilename(count: number): string {
  const parts = window.location.hostname.split('.')
  const prefix = parts.length >= 2
    ? `${parts[0]}_${parts[1]}`
    : parts[0]
  return `${prefix}_media_${count}.zip`
}

export type MediaGalleryPageProps = {
  d:                CmsDictionary
  activeProvider?:  'r2' | 'blob'
  vpsConfigured?:   boolean
  storageSummary?:  MediaStorageSummary
}

export function MediaGalleryPage({ d, activeProvider = 'r2', vpsConfigured = false, storageSummary: initialSummary }: MediaGalleryPageProps) {
  const g = d.content.mediaGallery
  const [storageSummary, setStorageSummary] = useState(initialSummary)

  const refreshSummary = useCallback(async () => {
    const res = await getMediaStorageSummary()
    if (res.success) setStorageSummary(res.data)
  }, [])

  const [showUpload,       setShowUpload]       = useState(false)
  const [previewAsset,     setPreviewAsset]     = useState<MediaRecord | null>(null)

  // Refresh the names cache every time the upload modal opens so that files
  // uploaded in the current session (or deleted externally) are correctly detected.
  useEffect(() => { if (showUpload) refreshNames() }, [showUpload])
  const [showBulkDelete,   setShowBulkDelete]   = useState(false)
  const [gridDragging,     setGridDragging]     = useState(false)
  const gridDragCounter = useRef(0)

  const {
    assets, total, totalPages, loading,
    filter, page, perPage,
    changeFilter, changePage, changePerPage,
    handleSearchInput,
    queue, dragging,
    addFilesToQueue, removeFromQueue, startUpload, cancelUpload, cancelAllUploads,
    onDragOver, onDragLeave, onDrop,
    selectedIds, selectionMode, toggleSelect, clearSelection,
    refresh, refreshNames,
    videoFallbackOpen, confirmVideoFallback, cancelVideoFallback,
    imageFallbackOpen, confirmImageFallback, cancelImageFallback,
  } = useMediaGallery({
    videoSizeErrorLabel:  g.videoSizeError,
    imageLimitErrorLabel: g.imageLimitError,
    videoLimitErrorLabel: g.videoLimitError,
    uploadSuccessBatch:   g.uploadedBatch,
    uploadErrorBatch:     g.uploadErrorBatch,
    compressionBatch:     g.compressionBatch,
    duplicateErrorLabel:  g.duplicateError,
    activeProvider,
    vpsConfigured,
    blobVideoTooLargeLabel: g.videoBlobTooLarge,
    onBatchComplete: refreshSummary,
  })

  const blobVideoWarning = activeProvider === 'blob' && !vpsConfigured
    ? g.videoBlobTooLarge
    : undefined

  async function handleDelete(asset: MediaRecord) {
    await deleteMediaRecord(asset.id)
    refresh()
    void refreshSummary()
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
    void refreshSummary()
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

  function handleGridDragEnter(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    gridDragCounter.current += 1
    setGridDragging(true)
  }
  function handleGridDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
  }
  function handleGridDragLeave() {
    gridDragCounter.current -= 1
    if (gridDragCounter.current <= 0) {
      gridDragCounter.current = 0
      setGridDragging(false)
    }
  }
  function handleGridDrop(e: React.DragEvent) {
    e.preventDefault()
    gridDragCounter.current = 0
    setGridDragging(false)
    if (!e.dataTransfer.files.length) return
    addFilesToQueue(e.dataTransfer.files, g.videoSizeError)
    setShowUpload(true)
  }

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
    <div className="w-full min-h-dvh">
      <div className="flex flex-col gap-4 p-4 pt-12 pb-28 md:pt-6 md:p-6 md:pb-28 md:max-w-350 md:mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-mono text-base font-semibold text-text">{g.title}</h1>
          {storageSummary && (
            <div className="flex flex-wrap items-center gap-1.5">
              <StorageBadge label={g.tabImages} bytes={storageSummary.imagesTotalBytes} count={storageSummary.imagesCount} color="accent" />
              <StorageBadge label={g.tabVideos} bytes={storageSummary.videosTotalBytes} count={storageSummary.videosCount} color="primary" />
              {activeProvider === 'blob' && (
                <BlobQuotaBadge usedBytes={storageSummary.blobTotalBytes} />
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowUpload((v) => !v)}
          className="group flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-mono text-xs font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px active:translate-y-0 active:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 md:px-5 md:py-2.5 md:text-sm"
        >
          <Upload size={14} className="shrink-0 md:w-4 md:h-4" />
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
            vpsQueueFull:    g.vpsQueueFull,
            videoSizeError:       g.videoSizeError,
            videoChunking:        g.videoChunking,
            videoProcessing:      g.videoProcessing,
            videoFinalizing:      g.videoFinalizing,
            videoVpsSkipped:      g.videoVpsSkipped,
            videoBlobTooLarge:     g.videoBlobTooLarge,
            videoBlobFallbackFail: g.videoBlobFallbackFail,
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
        estimatedTimeLabel={g.estimatedTimeLabel}
        estimatedSecsUnit={g.estimatedSecsUnit}
        estimatedMinsUnit={g.estimatedMinsUnit}
        videoUploadWarning={g.videoUploadWarning}
        imageUploadWarning={g.imageUploadWarning}
        blobVideoWarning={blobVideoWarning}
        cancelConfirmTitle={g.uploadCancelConfirmTitle}
        cancelConfirmDesc={g.uploadCancelConfirmDesc}
        cancelConfirmYes={g.uploadCancelConfirmYes}
        cancelConfirmNo={g.uploadCancelConfirmNo}
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

      {/* Image fallback warning modal (large image + no VPS) */}
      <VideoFallbackModal
        open={imageFallbackOpen}
        onUpload={confirmImageFallback}
        onCancel={cancelImageFallback}
        labels={{
          title:  g.imageFallbackTitle,
          body:   g.imageFallbackBody,
          upload: g.imageFallbackUpload,
          cancel: g.imageFallbackCancel,
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
        {/* Grid drop zone wrapper with drag overlay */}
        <div
          className="relative"
          onDragEnter={handleGridDragEnter}
          onDragOver={handleGridDragOver}
          onDragLeave={handleGridDragLeave}
          onDrop={handleGridDrop}
        >
          {gridDragging && (
            <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-primary bg-surface/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-full bg-primary/15 p-4 ring-1 ring-primary/30">
                  <Upload size={32} className="text-primary" />
                </div>
                <p className="font-mono text-sm font-semibold text-primary">{g.dropHere}</p>
              </div>
            </div>
          )}
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
              vpsQueueFull:    g.vpsQueueFull,
              videoSizeError:  g.videoSizeError,
              videoChunking:   g.videoChunking,
              videoProcessing: g.videoProcessing,
              videoFinalizing: g.videoFinalizing,
              videoVpsSkipped: g.videoVpsSkipped,
            }),
            onDragOver,
            onDragLeave,
            // stopPropagation prevents the event from bubbling to the outer grid
            // container's handleGridDrop (which would call addFilesToQueue a second time).
            onDrop: (e) => { e.stopPropagation(); handleGridDrop(e) },
            dropHereLabel:   g.dropHere,
            orClickLabel:    g.orClick,
            uploadBtnLabel:  g.uploadStart,
            optimizingLabel: g.optimizing,
            uploadingLabel:  g.uploading,
            errorLabel:          g.uploadError,
            successLabel:        g.uploadSuccess,
            estimatedTimeLabel:  g.estimatedTimeLabel,
            estimatedSecsUnit:   g.estimatedSecsUnit,
            estimatedMinsUnit:   g.estimatedMinsUnit,
            videoUploadWarning:  g.videoUploadWarning,
            imageUploadWarning:  g.imageUploadWarning,
          }}
          />
        </div>

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
