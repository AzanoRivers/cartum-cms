'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Sparkles } from 'lucide-react'
import { UploadFileRow } from '@/components/ui/molecules/UploadFileRow'
import type { UploadEntry } from '@/lib/hooks/useMediaGallery'

// Empirical throughput: video ~100 KB/s through full VPS pipeline (12–24 MB samples)
const VIDEO_BYTES_PER_SEC  = 100_000
const IMAGE_BYTES_PER_SEC  = 150_000  // client compression is slow
const IMAGE_OVERHEAD_SECS  = 1.5      // per-file init cost (decoder + encoder startup)
const MIN_ESTIMATE_SECS    = 30

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatEstimate(secs: number, secsUnit: string, minsUnit: string): string {
  if (secs < 60) return `${secs} ${secsUnit}`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')} ${minsUnit}`
}

export type MediaUploadZoneProps = {
  queue:          UploadEntry[]
  dragging:       boolean
  onFiles:        (files: FileList) => void
  onRemove:       (id: string) => void
  onStartUpload:  (entry: UploadEntry) => void
  onCancel?:      (id: string) => void
  onDragOver:     (e: React.DragEvent) => void
  onDragLeave:    () => void
  onDrop:         (e: React.DragEvent) => void
  // labels
  dropHereLabel:       string
  orClickLabel:        string
  uploadBtnLabel:      string
  optimizingLabel:     string
  uploadingLabel:      string
  errorLabel:          string
  successLabel:        string
  estimatedTimeLabel:  string
  estimatedSecsUnit:   string
  estimatedMinsUnit:   string
  videoUploadWarning?: string
  imageUploadWarning?: string
  finalizingSoonLabel?: string
}

export function MediaUploadZone({
  queue,
  dragging,
  onFiles,
  onRemove,
  onStartUpload,
  onCancel,
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
  estimatedTimeLabel,
  estimatedSecsUnit,
  estimatedMinsUnit,
  videoUploadWarning,
  imageUploadWarning,
  finalizingSoonLabel,
}: MediaUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const pending  = queue.filter((e) => e.status === 'pending')
  const active   = queue.filter((e) => e.status === 'optimizing' || e.status === 'uploading')
  const finished = queue.filter((e) => e.status === 'done' || e.status === 'error')
  const allRows  = [...active, ...pending, ...finished]
  const hasVideos = allRows.some((e) =>  e.file.type.startsWith('video/'))
  const hasImages = allRows.some((e) => !e.file.type.startsWith('video/'))
  const hasActive = active.length > 0

  // Static pre-upload estimate shown below drop zone while files are pending
  const pendingEstimateSecs = pending.length > 0 && !hasActive
    ? Math.max(MIN_ESTIMATE_SECS, Math.ceil(
        pending.reduce((sum, e) => {
          const isVideo = e.file.type.startsWith('video/')
          const bps     = isVideo ? VIDEO_BYTES_PER_SEC : IMAGE_BYTES_PER_SEC
          const overhead = isVideo ? 0 : IMAGE_OVERHEAD_SECS
          return sum + overhead + e.file.size / bps
        }, 0)
      ))
    : null

  // ── Countdown timer ────────────────────────────────────────────────────────
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const isRunning  = useRef(false)
  // Ref trick: always-latest queue without adding queue to effect deps
  const queueRef   = useRef(queue)
  queueRef.current = queue

  useEffect(() => {
    if (hasActive && !isRunning.current) {
      isRunning.current = true
      const estimated = Math.max(
        MIN_ESTIMATE_SECS,
        Math.ceil(
          queueRef.current.reduce((sum, e) => {
            const isVideo  = e.file.type.startsWith('video/')
            const bps      = isVideo ? VIDEO_BYTES_PER_SEC : IMAGE_BYTES_PER_SEC
            const overhead = isVideo ? 0 : IMAGE_OVERHEAD_SECS
            return sum + overhead + e.file.size / bps
          }, 0),
        ),
      )
      const startedAt = Date.now()
      setSecondsLeft(estimated)
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000)
        setSecondsLeft(Math.max(0, estimated - elapsed))
      }, 1000)
    }

    if (!hasActive && isRunning.current) {
      isRunning.current = false
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setSecondsLeft(null)
    }
  }, [hasActive])

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])
  // ── End countdown ──────────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) onFiles(e.target.files)
    e.target.value = ''
  }

  function startAll() {
    for (const entry of pending) onStartUpload(entry)
  }

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">

      {/* Drop zone ↔ Countdown (mutually exclusive) */}
      {hasActive ? (
        <div className="shrink-0 flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-surface-2 px-6 py-10">
          {secondsLeft === 0 && finalizingSoonLabel ? (
            <>
              <Sparkles size={22} className="text-primary animate-pulse" />
              <p className="font-mono text-[11px] text-primary text-center">{finalizingSoonLabel}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                <span className="font-mono text-2xl font-semibold text-primary tabular-nums tracking-widest">
                  {secondsLeft !== null ? formatCountdown(secondsLeft) : '--:--'}
                </span>
              </div>
              <p className="font-mono text-[11px] text-muted text-center">{estimatedTimeLabel}</p>
            </>
          )}
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          className={`shrink-0 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-8 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
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
      )}

      {/* Pre-upload estimate — shown below drop zone while files are pending */}
      {pendingEstimateSecs !== null && (
        <div className="shrink-0 flex items-center justify-center gap-2 rounded-md border border-border bg-surface-2 px-4 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
          <p className="font-mono text-[11px] text-muted">
            {estimatedTimeLabel}{' '}
            <span className="text-primary tabular-nums">{formatEstimate(pendingEstimateSecs, estimatedSecsUnit, estimatedMinsUnit)}</span>
          </p>
        </div>
      )}

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

      {/* Queue rows — grid trick: gridTemplateRows 0fr↔1fr is transitionable */}
      <div
        className="upload-rows-wrapper min-h-0"
        style={{ gridTemplateRows: allRows.length > 0 ? '1fr' : '0fr' }}
      >
        <div className="overflow-y-auto min-h-0 max-h-[min(20rem,40vh)]">
          <div className="flex flex-col gap-1.5 pr-px py-px">
            {allRows.map((entry, i) => (
              <div
                key={entry.id}
                className="upload-row-animate shrink-0"
                style={{ animationDelay: `${Math.min(i * 10, 80)}ms` }}
              >
                <UploadFileRow
                  name={entry.name}
                  status={entry.status}
                  progress={entry.progress}
                  error={entry.error}
                  fileSizeBytes={entry.file.size}
                  isVideo={entry.file.type.startsWith('video/')}
                  onRemove={entry.status === 'pending' || entry.status === 'error'
                    ? () => onRemove(entry.id)
                    : undefined}
                  onCancel={onCancel && entry.phaseLabel !== undefined
                    ? () => onCancel(entry.id)
                    : undefined}
                  optimizingLabel={optimizingLabel}
                  uploadingLabel={uploadingLabel}
                  phaseLabel={entry.phaseLabel}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload warnings — video takes priority when both types present */}
      {hasVideos && videoUploadWarning && (
        <div className="shrink-0 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5">
          <span className="mt-px shrink-0 text-sm leading-none text-warning">⚠</span>
          <p className="font-mono text-[10px] leading-relaxed text-warning">{videoUploadWarning}</p>
        </div>
      )}
      {hasImages && !hasVideos && imageUploadWarning && (
        <div className="shrink-0 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5">
          <span className="mt-px shrink-0 text-sm leading-none text-warning">⚠</span>
          <p className="font-mono text-[10px] leading-relaxed text-warning">{imageUploadWarning}</p>
        </div>
      )}

      {/* Start all button */}
      {pending.length > 0 && active.length === 0 && (
        <button
          type="button"
          onClick={startAll}
          className="shrink-0 self-end rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {uploadBtnLabel} ({pending.length})
        </button>
      )}
    </div>
  )
}
