'use client'

import { useRef, useState } from 'react'
import { ImageIcon, VideoIcon, Upload, Library, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { optimizeImage } from '@/lib/media/optimize'
import { uploadFileWithProgress } from '@/lib/media/upload'
import { getUploadUrl, saveMediaRecord } from '@/lib/actions/media.actions'
import { MediaLibraryPicker } from '@/components/ui/organisms/MediaLibraryPicker'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { FieldType, ImageFieldConfig, VideoFieldConfig } from '@/types/nodes'
import type { MediaRecord } from '@/types/media'
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, MAX_IMAGE_SIZE_BYTES, MAX_VIDEO_SIZE_BYTES } from '@/types/media'

export type FieldMediaContentProps = {
  fieldType:  FieldType
  nodeId?:    string
  // current stored value from config
  defaultUrl:     string | null
  defaultMediaId: string | null
  // called when user picks/uploads a new default or removes it
  onChange: (patch: Partial<ImageFieldConfig & VideoFieldConfig>) => void
  // labels
  labels: {
    noImage:       string
    noVideo:       string
    dragOrSelect:  string
    dropHere:      string
    selectFromLib: string
    uploadNew:     string
    changeMedia:   string
    removeMedia:   string
    confirmRemove: string
    otherTypesMsg: string
    uploading:     string
    optimizing:    string
    uploadError:   string
  }
}

type UploadState = 'idle' | 'optimizing' | 'uploading'

export function FieldMediaContent({
  fieldType,
  nodeId,
  defaultUrl,
  defaultMediaId,
  onChange,
  labels,
}: FieldMediaContentProps) {
  const isMedia = fieldType === 'image' || fieldType === 'video'

  // Non-media fields — informational message only
  if (!isMedia) {
    return (
      <p className="font-mono text-[11px] text-muted leading-relaxed">
        {labels.otherTypesMsg}
      </p>
    )
  }

  return (
    <MediaContentInner
      fieldType={fieldType as 'image' | 'video'}
      nodeId={nodeId}
      defaultUrl={defaultUrl}
      defaultMediaId={defaultMediaId}
      onChange={onChange}
      labels={labels}
    />
  )
}

// ── Inner component (only for image/video) ────────────────────────────────────

function MediaContentInner({
  fieldType,
  nodeId,
  defaultUrl,
  defaultMediaId,
  onChange,
  labels,
}: Omit<FieldMediaContentProps, 'fieldType'> & { fieldType: 'image' | 'video' }) {
  const isImage = fieldType === 'image'
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress]       = useState(0)
  const [dragging,  setDragging]      = useState(false)
  const [libOpen,   setLibOpen]       = useState(false)
  const [confirming, setConfirming]   = useState(false)

  const hasValue = Boolean(defaultUrl)

  // ── Upload pipeline ─────────────────────────────────────────────────────────
  async function uploadFile(file: File) {
    const allowedTypes = isImage
      ? (ALLOWED_IMAGE_TYPES as readonly string[])
      : (ALLOWED_VIDEO_TYPES as readonly string[])
    const maxSize = isImage ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES

    if (!allowedTypes.includes(file.type) || file.size > maxSize) {
      toast.error(labels.uploadError)
      return
    }

    setUploadState('optimizing')
    setProgress(0)

    let uploadFile: File | Blob = file
    let uploadMime = file.type

    if (isImage) {
      const { file: opt } = await optimizeImage(file)
      uploadFile = opt
      uploadMime = opt.type || file.type
    }

    const urlRes = await getUploadUrl({ filename: file.name, mimeType: uploadMime, nodeId })
    if (!urlRes.success) {
      setUploadState('idle')
      toast.error(labels.uploadError)
      return
    }

    const { uploadUrl, key, publicUrl } = urlRes.data

    setUploadState('uploading')
    try {
      await uploadFileWithProgress(uploadFile, uploadUrl, uploadMime, setProgress)
    } catch {
      setUploadState('idle')
      toast.error(labels.uploadError)
      return
    }

    const saveRes = await saveMediaRecord({
      key,
      publicUrl,
      mimeType:  uploadMime,
      sizeBytes: (uploadFile as File).size ?? 0,
      nodeId,
    })

    setUploadState('idle')
    const mediaId = saveRes.success ? saveRes.data.id : null
    onChange({ defaultUrl: publicUrl, defaultMediaId: mediaId ?? undefined })
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) uploadFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  function handleLibrarySelect(asset: MediaRecord) {
    setLibOpen(false)
    onChange({ defaultUrl: asset.publicUrl, defaultMediaId: asset.id })
  }

  function handleRemove() {
    onChange({ defaultUrl: null, defaultMediaId: null })
  }

  function handleRemoveClick() {
    if (confirming) {
      handleRemove()
      setConfirming(false)
    } else {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
    }
  }

  const isUploading = uploadState !== 'idle'

  // ── With value — polaroid card ──────────────────────────────────────────────
  if (hasValue) {
    return (
      <VHSTransition duration="fast" trigger="has-value">
        <div className="flex flex-col gap-2">
        {/* Polaroid card — capped at 50% width on desktop */}
        <div className="group relative w-full sm:w-1/2 overflow-hidden rounded-md border border-border bg-surface-2">
          {/* Image/video preview */}
          <div className={`${isImage ? 'aspect-4/3' : 'aspect-video'} w-full overflow-hidden bg-surface`}>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={defaultUrl!}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <VideoIcon size={32} className="text-muted" />
              </div>
            )}
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setLibOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-surface/90 px-3 py-1.5 font-mono text-xs text-text transition-colors hover:bg-surface"
            >
              <RefreshCw size={11} />
              {labels.changeMedia}
            </button>
            <button
              type="button"
              onClick={handleRemoveClick}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                confirming
                  ? 'bg-danger text-white hover:bg-danger/80'
                  : 'bg-danger/80 text-white hover:bg-danger'
              }`}
            >
              <X size={11} />
              {confirming ? labels.confirmRemove : labels.removeMedia}
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={isImage
            ? 'image/jpeg,image/png,image/webp,image/gif,image/avif'
            : 'video/mp4,video/webm,video/quicktime'}
          className="sr-only"
          onChange={handleFileInput}
          tabIndex={-1}
          aria-hidden="true"
        />

        <MediaLibraryPicker
          open={libOpen}
          filter={fieldType}
          onClose={() => setLibOpen(false)}
          onSelect={handleLibrarySelect}
        />
      </div>
      </VHSTransition>
    )
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {/* Drop zone / placeholder */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex aspect-4/3 w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed transition-all ${
          dragging
            ? 'border-accent bg-accent/5 text-accent'
            : 'border-border bg-surface-2 text-muted hover:border-primary/50 hover:bg-primary/5 hover:text-text'
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all duration-150"
                style={{ width: `${uploadState === 'optimizing' ? 20 : progress}%` }}
              />
            </div>
            <p className="font-mono text-[10px] text-muted">
              {uploadState === 'optimizing' ? labels.optimizing : `${labels.uploading} ${progress}%`}
            </p>
          </div>
        ) : (
          <>
            <span className={`transition-transform duration-200 ${dragging ? '' : 'group-hover:-translate-y-0.5'}`}>
              {isImage
                ? <ImageIcon size={24} />
                : <VideoIcon size={24} />}
            </span>
            <p className="font-mono text-[11px] text-center leading-relaxed px-4">
              {dragging ? labels.dropHere : labels.dragOrSelect}
            </p>
          </>
        )}
      </div>

      {/* Action buttons */}
      {!isUploading && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLibOpen(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-primary/50 hover:text-text focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
          >
            <Library size={11} />
            {labels.selectFromLib}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-primary/50 hover:text-text focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
          >
            <Upload size={11} />
            {labels.uploadNew}
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={isImage
          ? 'image/jpeg,image/png,image/webp,image/gif,image/avif'
          : 'video/mp4,video/webm,video/quicktime'}
        className="sr-only"
        onChange={handleFileInput}
        tabIndex={-1}
        aria-hidden="true"
      />

      <MediaLibraryPicker
        open={libOpen}
        filter={fieldType}
        onClose={() => setLibOpen(false)}
        onSelect={handleLibrarySelect}
      />
    </div>
  )
}
