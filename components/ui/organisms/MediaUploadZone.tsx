'use client'

import { useRef } from 'react'
import { Upload } from 'lucide-react'
import { UploadFileRow } from '@/components/ui/molecules/UploadFileRow'
import type { UploadEntry } from '@/lib/hooks/useMediaGallery'

export type MediaUploadZoneProps = {
  queue:          UploadEntry[]
  dragging:       boolean
  onFiles:        (files: FileList) => void
  onRemove:       (id: string) => void
  onStartUpload:  (entry: UploadEntry) => void
  onDragOver:     (e: React.DragEvent) => void
  onDragLeave:    () => void
  onDrop:         (e: React.DragEvent) => void
  // labels
  dropHereLabel:    string
  orClickLabel:     string
  uploadBtnLabel:   string
  optimizingLabel:  string
  uploadingLabel:   string
  errorLabel:       string
  successLabel:     string
}

export function MediaUploadZone({
  queue,
  dragging,
  onFiles,
  onRemove,
  onStartUpload,
  onDragOver,
  onDragLeave,
  onDrop,
  dropHereLabel,
  orClickLabel,
  uploadBtnLabel,
  optimizingLabel,
  uploadingLabel,
  errorLabel,
  successLabel,
}: MediaUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const pending   = queue.filter((e) => e.status === 'pending')
  const active    = queue.filter((e) => e.status === 'optimizing' || e.status === 'uploading')
  const finished  = queue.filter((e) => e.status === 'done' || e.status === 'error')
  const allRows   = [...active, ...pending, ...finished]

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) onFiles(e.target.files)
    e.target.value = ''
  }

  function startAll() {
    for (const entry of pending) {
      onStartUpload(entry)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-8 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          dragging
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border bg-surface-2 text-muted hover:border-primary/40 hover:text-text'
        }`}
      >
        <Upload size={20} />
        <p className="font-mono text-xs">
          {dropHereLabel}{' '}
          <span className="text-primary">{orClickLabel}</span>
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
        className="sr-only"
        onChange={handleInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Queue rows */}
      {allRows.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {allRows.map((entry) => (
            <UploadFileRow
              key={entry.id}
              name={entry.name}
              status={entry.status}
              progress={entry.progress}
              error={entry.error}
              onRemove={entry.status === 'pending' || entry.status === 'error'
                ? () => onRemove(entry.id)
                : undefined}
              optimizingLabel={optimizingLabel}
              uploadingLabel={uploadingLabel}
            />
          ))}
        </div>
      )}

      {/* Start all button */}
      {pending.length > 0 && active.length === 0 && (
        <button
          type="button"
          onClick={startAll}
          className="self-end rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {uploadBtnLabel} ({pending.length})
        </button>
      )}
    </div>
  )
}
