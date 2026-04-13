'use client'

import { useRef, useState } from 'react'
import { cva } from 'class-variance-authority'
import { GripVertical, Library, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { optimizeImage } from '@/lib/media/optimize'
import { uploadFileWithProgress } from '@/lib/media/upload'
import { getUploadUrl, saveMediaRecord } from '@/lib/actions/media.actions'
import { MediaLibraryPicker } from '@/components/ui/organisms/MediaLibraryPicker'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import {
  SortableGalleryGrid,
  SortableItem,
  arrayMove,
} from '@/components/external/dnd/SortableGalleryGrid'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/types/media'
import type { GalleryItem, GalleryContentLabels } from '@/types/nodes'
import type { MediaRecord } from '@/types/media'

// ── Types ──────────────────────────────────────────────────────────────────────

export type FieldGalleryContentProps = {
  nodeId?:   string
  items:     GalleryItem[]
  maxItems?: number
  onChange:  (items: GalleryItem[]) => Promise<void>
  labels:    GalleryContentLabels
}

type UploadingSlot = {
  id:       string   // temporal, para key de React
  progress: number
  phase:    'optimizing' | 'uploading'
  error:    boolean
}

// ── cva variants ──────────────────────────────────────────────────────────────

const thumbnailVariants = cva(
  'relative aspect-square overflow-hidden rounded-md border transition-all duration-150 select-none',
  {
    variants: {
      state: {
        idle:       'border-border',
        confirming: 'border-danger',
        dragging:   'border-primary/50 opacity-40',
      },
    },
    defaultVariants: { state: 'idle' },
  },
)

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function Thumbnail({
  item,
  confirmingId,
  labels,
  dragListeners,
  dragAttributes,
  isDragging,
  onRemoveClick,
}: {
  item:           GalleryItem
  confirmingId:   string | null
  labels:         { removeImage: string; confirmRemove: string }
  dragListeners:  Record<string, unknown> | undefined
  dragAttributes: Record<string, unknown>
  isDragging:     boolean
  onRemoveClick:  (url: string) => void
}) {
  const isConfirming = confirmingId === item.url

  return (
    <div className={`group ${thumbnailVariants({ state: isDragging ? 'dragging' : isConfirming ? 'confirming' : 'idle' })}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt="" className="h-full w-full object-cover" loading="lazy" />

      {/* Drag handle */}
      <button
        {...dragListeners}
        {...dragAttributes}
        type="button"
        className="absolute top-1 left-1 flex h-5 w-5 cursor-grab items-center justify-center rounded bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical size={10} />
      </button>

      {/* Remove overlay */}
      <div className="absolute inset-0 flex items-end justify-end p-1 opacity-0 transition-opacity hover:opacity-100">
        <button
          type="button"
          onClick={() => onRemoveClick(item.url)}
          className={[
            'flex h-6 items-center gap-1 rounded px-1.5 font-mono text-[9px] transition-all',
            isConfirming
              ? 'bg-danger text-white'
              : 'bg-black/70 text-white hover:bg-danger',
          ].join(' ')}
        >
          <X size={9} />
          {isConfirming ? labels.confirmRemove : labels.removeImage}
        </button>
      </div>
    </div>
  )
}

// ── UploadSlot ────────────────────────────────────────────────────────────────

function UploadSlot({ slot }: { slot: UploadingSlot }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-surface-2">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
        {slot.error ? (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-danger/20 text-danger">
            <X size={10} />
          </div>
        ) : (
          <>
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${slot.phase === 'optimizing' ? 15 : slot.progress}%` }}
              />
            </div>
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </>
        )}
      </div>
    </div>
  )
}

// ── DropZone — visible when not at max ────────────────────────────────────────

function DropZone({
  onFiles,
  onFromLib,
  onUpload,
  labels,
}: {
  onFiles:   (files: File[]) => void
  onFromLib: () => void
  onUpload:  () => void
  labels:    { selectFromLib: string; uploadNew: string; dragOrSelect?: string }
}) {
  const [dragging, setDragging] = useState(false)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }
  function handleDragLeave() { setDragging(false) }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles(files)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed px-4 py-5 transition-all',
        dragging ? 'border-primary bg-primary/5' : 'border-border bg-surface-2',
      ].join(' ')}
    >
      <p className="font-mono text-[10px] text-muted">
        {labels.dragOrSelect ?? 'Drag images here or'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onFromLib}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text transition-colors hover:border-primary hover:text-primary"
        >
          <Library size={11} />
          {labels.selectFromLib}
        </button>
        <button
          type="button"
          onClick={onUpload}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text transition-colors hover:border-primary hover:text-primary"
        >
          <Upload size={11} />
          {labels.uploadNew}
        </button>
      </div>
    </div>
  )
}

// ── FieldGalleryContent ───────────────────────────────────────────────────────

export function FieldGalleryContent({
  nodeId,
  items,
  maxItems,
  onChange,
  labels,
}: FieldGalleryContentProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [uploading,    setUploading]    = useState<UploadingSlot[]>([])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [libOpen,      setLibOpen]      = useState(false)

  const atMax = maxItems !== undefined && items.length >= maxItems

  // ── Upload pipeline (single file) ──────────────────────────────────────────
  async function processFile(file: File) {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type) || file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(labels.uploadError)
      return
    }

    const slotId: string = `${Date.now()}-${Math.random()}`
    const slot: UploadingSlot = { id: slotId, progress: 0, phase: 'optimizing', error: false }
    setUploading((prev) => [...prev, slot])

    const patchSlot = (patch: Partial<UploadingSlot>) =>
      setUploading((prev) => prev.map((s) => s.id === slotId ? { ...s, ...patch } : s))
    const removeSlot = () =>
      setUploading((prev) => prev.filter((s) => s.id !== slotId))

    try {
      // Tier 1: client-side optimization
      const { file: opt } = await optimizeImage(file)
      const finalMime = opt.type || file.type
      const baseName  = file.name.replace(/\.[^.]+$/, '')
      const finalExt  = finalMime === 'image/webp' ? 'webp' : (file.name.split('.').pop() ?? 'bin')
      const finalName = `${baseName}.${finalExt}`

      // Tier 2: VPS proxy (best-effort — no bloquea si falla)
      let finalBlob: Blob = opt
      try {
        const form = new FormData()
        form.append('file', opt, file.name)
        const proxyRes = await fetch('/api/internal/media/compress', { method: 'POST', body: form })
        const ct = proxyRes.headers.get('Content-Type') ?? ''
        const skipped = proxyRes.headers.get('X-Vps-Skipped')
        if (!skipped && ct.startsWith('image/')) {
          finalBlob = await proxyRes.blob()
        }
      } catch { /* silent fallback to Tier 1 */ }

      patchSlot({ phase: 'uploading', progress: 0 })

      const urlRes = await getUploadUrl({ filename: finalName, mimeType: finalMime, nodeId })
      if (!urlRes.success) throw new Error('URL_FAILED')

      const { uploadUrl, key, publicUrl } = urlRes.data

      await uploadFileWithProgress(finalBlob, uploadUrl, finalMime, (pct) =>
        patchSlot({ progress: pct }),
      )

      const saveRes = await saveMediaRecord({
        key, publicUrl, mimeType: finalMime, sizeBytes: finalBlob.size, nodeId,
      })

      const mediaId = saveRes.success ? saveRes.data.id : null
      const newItem: GalleryItem = { url: publicUrl, mediaId }
      removeSlot()
      await onChange([...items, newItem])
    } catch {
      patchSlot({ error: true })
      toast.error(labels.uploadError)
      setTimeout(removeSlot, 2000)
    }
  }

  // ── Multi-file input ────────────────────────────────────────────────────────
  async function handleFiles(files: File[]) {
    for (const file of files) {
      await processFile(file)
    }
  }

  // ── From library (multi-select) ─────────────────────────────────────────────
  async function handleLibrarySelect(assets: MediaRecord[]) {
    const newItems: GalleryItem[] = assets.map((a) => ({ url: a.publicUrl, mediaId: a.id }))
    const merged = [...items, ...newItems]
    const limited = maxItems !== undefined ? merged.slice(0, maxItems) : merged
    await onChange(limited)
  }

  // ── Remove ──────────────────────────────────────────────────────────────────
  async function handleRemoveClick(url: string) {
    if (confirmingId === url) {
      setConfirmingId(null)
      await onChange(items.filter((i) => i.url !== url))
    } else {
      setConfirmingId(url)
      setTimeout(() => setConfirmingId((id) => id === url ? null : id), 3000)
    }
  }

  // ── Reorder ─────────────────────────────────────────────────────────────────
  async function handleReorder(newIds: string[]) {
    const reordered = newIds.map((url) => items.find((i) => i.url === url)!).filter(Boolean)
    await onChange(reordered)
  }

  const ids = items.map((i) => i.url)

  function handleDropZoneFiles(files: File[]) {
    const available = maxItems !== undefined ? Math.max(0, maxItems - items.length - uploading.length) : files.length
    handleFiles(files.slice(0, available))
  }

  return (
    <VHSTransition duration="fast">
      <div className="flex flex-col gap-3">
        {/* Max reached badge */}
        {atMax && (
          <p className="font-mono text-[10px] text-warning">{labels.maxReached}</p>
        )}

        {/* Grid — thumbnails + upload slots */}
        {(items.length > 0 || uploading.length > 0) && (
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}
          >
            <SortableGalleryGrid ids={ids} onReorder={handleReorder}>
              {items.map((item) => (
                <SortableItem key={item.url} id={item.url}>
                  {({ isDragging, listeners, attributes }) => (
                    <Thumbnail
                      item={item}
                      confirmingId={confirmingId}
                      labels={labels}
                      dragListeners={listeners as Record<string, unknown> | undefined}
                      dragAttributes={attributes as unknown as Record<string, unknown>}
                      isDragging={isDragging}
                      onRemoveClick={handleRemoveClick}
                    />
                  )}
                </SortableItem>
              ))}
            </SortableGalleryGrid>

            {/* Upload slots (progreso) */}
            {uploading.map((slot) => (
              <UploadSlot key={slot.id} slot={slot} />
            ))}
          </div>
        )}

        {/* Drop zone — hidden when at max */}
        {!atMax && (
          <DropZone
            onFiles={handleDropZoneFiles}
            onFromLib={() => setLibOpen(true)}
            onUpload={() => fileRef.current?.click()}
            labels={labels}
          />
        )}

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length) {
              const available = maxItems !== undefined ? Math.max(0, maxItems - items.length) : files.length
              handleFiles(files.slice(0, available))
            }
            e.target.value = ''
          }}
        />

        {/* Library picker — multi-select */}
        <MediaLibraryPicker
          open={libOpen}
          filter="image"
          onClose={() => setLibOpen(false)}
          multiSelect
          onSelectMulti={handleLibrarySelect}
        />
      </div>
    </VHSTransition>
  )
}
