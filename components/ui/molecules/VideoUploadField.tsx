'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useUIStore } from '@/lib/stores/uiStore'
import { optimizeVideo } from '@/lib/media/video-optimize'
import { uploadFileWithProgress } from '@/lib/media/upload'
import { getUploadUrl, saveMediaRecord } from '@/lib/actions/media.actions'
import { MediaLibraryPicker } from '@/components/ui/organisms/MediaLibraryPicker'
import { Button } from '@/components/ui/atoms/Button'
import type { MediaRecord } from '@/types/media'
import {
  ALLOWED_VIDEO_TYPES,
  MAX_VIDEO_SIZE_BYTES,
} from '@/types/media'

export type VideoUploadFieldProps = {
  label:                string
  value:                string | null
  onChange:             (url: string | null) => void
  isStorageConfigured:  boolean
  nodeId?:              string
  error?:               string
}

export function VideoUploadField({
  label,
  value,
  onChange,
  isStorageConfigured,
  nodeId,
  error,
}: VideoUploadFieldProps) {
  const d           = useUIStore((s) => s.cmsDict)
  const u           = d?.content.upload
  const fileRef     = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [libOpen,   setLibOpen]   = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!(ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type)) {
      toast.error(u?.invalidType ?? 'File type not allowed.')
      return
    }
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      toast.error(u?.fileTooLarge ?? 'File exceeds the maximum allowed size.')
      return
    }

    setUploading(true)
    setProgress(0)

    const pipeline = async (): Promise<string> => {
      // Tier 1 — client-side video compression (ffmpeg.wasm, only >20 MB)
      const { file: optimized, tier1Failed } = await optimizeVideo(file, (p) => setProgress(Math.round(p * 50)))
      if (tier1Failed) toast.warning(u?.tier1VideoWarn ?? 'Video compression failed. Uploading original.')

      // Get presigned PUT URL
      const urlResult = await getUploadUrl({
        filename: optimized.name,
        mimeType: optimized.type || file.type,
        nodeId,
      })

      if (!urlResult.success) throw new Error(u?.uploadError ?? 'Upload failed. Please try again.')

      const { uploadUrl, key, publicUrl } = urlResult.data

      // Upload to R2
      await uploadFileWithProgress(optimized, uploadUrl, optimized.type || file.type, (p) => {
        setProgress(50 + Math.round(p / 2))
      })

      // Save media record
      await saveMediaRecord({
        key,
        publicUrl,
        mimeType:  optimized.type || file.type,
        sizeBytes: optimized.size,
        name:      file.name,
        nodeId,
      })

      return publicUrl
    }

    toast.promise(
      pipeline().finally(() => { setUploading(false); setProgress(0) }),
      {
        loading: u?.uploading ?? 'Uploading…',
        success: (url) => { onChange(url); return u?.uploadSuccess ?? 'File uploaded successfully.' },
        error:   (err: unknown) => (err instanceof Error ? err.message : null) ?? (u?.uploadError ?? 'Upload failed.'),
      },
    )
  }

  function handleLibrarySelect(asset: MediaRecord) {
    onChange(asset.publicUrl)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-xs text-muted">{label}</label>

      {!isStorageConfigured && (
        <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-warning font-mono">
          {u?.storageNotConfigured ?? 'Storage is not configured.'}
        </div>
      )}

      {value ? (
        <div className="flex flex-col gap-2">
          <video
            src={value}
            controls
            className="h-48 w-full rounded-md border border-border bg-surface-2 object-cover"
          />
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm" type="button"
              disabled={uploading || !isStorageConfigured}
              onClick={() => setLibOpen(true)}
            >
              {u?.chooseFromLibrary ?? 'Choose from library'}
            </Button>
            <Button
              variant="outline" size="sm" type="button"
              disabled={uploading || !isStorageConfigured}
              onClick={() => fileRef.current?.click()}
            >
              {uploading
                ? (progress > 0 ? `${progress}%` : (u?.uploading ?? 'Uploading…'))
                : (u?.uploadNew ?? 'Upload new')}
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => onChange(null)}>
              {u?.remove ?? 'Remove'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={uploading || !isStorageConfigured}
            onClick={() => fileRef.current?.click()}
            className="flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-surface-2 text-muted transition-colors hover:border-primary hover:text-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="font-mono text-xs">
                {progress > 0 ? `${progress}%` : (u?.videoProcessing ?? 'Processing video…')}
              </span>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
                <span className="font-mono text-[10px]">
                  {u?.dragOrClick ?? 'Click to upload'}
                </span>
                <span className="font-mono text-[9px] opacity-60">
                  {u?.videoFormats ?? 'MP4, MOV, WebM'}
                </span>
              </>
            )}
          </button>

          {isStorageConfigured && (
            <Button
              variant="ghost" size="sm" type="button"
              disabled={uploading}
              onClick={() => setLibOpen(true)}
              className="w-full justify-center font-mono text-xs"
            >
              {u?.chooseFromLibrary ?? 'Choose from library'}
            </Button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".mp4,.mov,.webm"
        className="hidden"
        onChange={handleFile}
        tabIndex={-1}
      />

      {error && <p className="text-xs text-danger">{error}</p>}

      <MediaLibraryPicker
        open={libOpen}
        filter="video"
        onClose={() => setLibOpen(false)}
        onSelect={handleLibrarySelect}
      />
    </div>
  )
}

