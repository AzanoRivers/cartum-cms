'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useUIStore } from '@/lib/stores/uiStore'
import { optimizeImage } from '@/lib/media/optimize'
import { uploadFileWithProgress } from '@/lib/media/upload'
import { emitVpsWarningToast } from '@/lib/media/vps-toast'
import { uploadViaServer, getUploadUrl, saveMediaRecord } from '@/lib/actions/media.actions'
import { MediaLibraryPicker } from '@/components/ui/organisms/MediaLibraryPicker'
import { Button } from '@/components/ui/atoms/Button'
import type { MediaRecord } from '@/types/media'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '@/types/media'

export type ImageUploadFieldProps = {
  label:                string
  value:                string | null
  onChange:             (url: string | null) => void
  isStorageConfigured:  boolean
  nodeId?:              string
  error?:               string
}

export function ImageUploadField({
  label,
  value,
  onChange,
  isStorageConfigured,
  nodeId,
  error,
}: ImageUploadFieldProps) {
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

    // Validate type & size
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      toast.error(u?.invalidType ?? 'File type not allowed.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(u?.fileTooLarge ?? 'File exceeds the maximum allowed size.')
      return
    }

    setUploading(true)
    setProgress(0)

    const pipeline = async (): Promise<string> => {
      // Tier 1 — client-side compression
      const { file: compressed, tier1Failed } = await optimizeImage(file)
      if (tier1Failed) toast.warning(u?.tier1ImageWarn ?? 'Image compression failed. Uploading original.')

      const arrayBuffer = await compressed.arrayBuffer()
      const result = await uploadViaServer({
        file:     arrayBuffer,
        mimeType: compressed.type || file.type,
        filename: file.name,
        nodeId,
      })

      if (!result.success) throw new Error(u?.uploadError ?? 'Upload failed. Please try again.')

      if (result.data.vpsWarning) {
        emitVpsWarningToast(result.data.vpsWarning, d!.content.upload, result.data.vpsPartialMeta)
      }

      return result.data.publicUrl
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            className="h-40 w-full rounded-md border border-border object-cover bg-surface-2"
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
                {progress > 0 ? `${progress}%` : (u?.uploading ?? 'Uploading…')}
              </span>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="font-mono text-[10px]">
                  {u?.dragOrClick ?? 'Click to upload'}
                </span>
                <span className="font-mono text-[9px] opacity-60">
                  {u?.imageFormats ?? 'JPG, PNG, WebP, GIF'}
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
        accept=".jpg,.jpeg,.png,.webp,.gif,.avif"
        className="hidden"
        onChange={handleFile}
        tabIndex={-1}
      />

      {error && <p className="text-xs text-danger">{error}</p>}

      <MediaLibraryPicker
        open={libOpen}
        filter="image"
        onClose={() => setLibOpen(false)}
        onSelect={handleLibrarySelect}
      />
    </div>
  )
}

