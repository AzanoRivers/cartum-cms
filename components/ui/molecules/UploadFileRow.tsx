'use client'

import { X, CheckCircle2, AlertCircle, Loader2, Clock3 } from 'lucide-react'

export type UploadFileStatus = 'pending' | 'optimizing' | 'uploading' | 'done' | 'error'

export type UploadFileRowProps = {
  name:     string
  status:   UploadFileStatus
  progress: number   // 0–100, used during 'uploading'
  error?:   string
  onRemove?: () => void
  /** Called when the user clicks Cancel on an active VPS upload. */
  onCancel?: () => void
  optimizingLabel: string
  uploadingLabel:  string
  /** When set and status==='uploading', replaces the uploadingLabel prefix text */
  phaseLabel?:     string
  /** Original file size in bytes — used to render the size badge. */
  fileSizeBytes?:  number
  /** True if the file is a video — changes the color thresholds. */
  isVideo?:        boolean
}

function formatName(name: string) {
  if (name.length <= 28) return name
  const ext  = name.split('.').pop() ?? ''
  const base = name.slice(0, 20)
  return `${base}…${ext ? `.${ext}` : ''}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type BadgeColor = 'green' | 'yellow' | 'red' | 'neutral'

function sizeColor(bytes: number, isVideo: boolean): BadgeColor {
  const MB = 1024 * 1024
  if (isVideo) {
    if (bytes > 80 * MB) return 'red'
    if (bytes > 40 * MB) return 'yellow'
    return 'green'
  }
  if (bytes > 50 * MB) return 'red'
  if (bytes > 5  * MB) return 'yellow'
  if (bytes < 1.5 * MB) return 'green'
  return 'neutral'
}

const BADGE_CLASSES: Record<BadgeColor, string> = {
  green:   'text-success  bg-success/10  border-success/30',
  yellow:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  red:     'text-danger   bg-danger/10   border-danger/30',
  neutral: 'text-muted    bg-surface     border-border',
}

export function UploadFileRow({
  name,
  status,
  progress,
  error,
  onRemove,
  onCancel,
  optimizingLabel,
  uploadingLabel,
  phaseLabel,
  fileSizeBytes,
  isVideo = false,
}: UploadFileRowProps) {
  const showBar  = status === 'uploading' || status === 'optimizing'
  const badgeColor = fileSizeBytes != null ? sizeColor(fileSizeBytes, isVideo) : null

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
      {/* Status icon */}
      <span className="shrink-0">
        {status === 'done'      && <CheckCircle2 size={14} className="text-success" />}
        {status === 'error'     && <AlertCircle  size={14} className="text-danger" />}
        {status === 'pending'   && <Clock3        size={14} className="text-muted" />}
        {(status === 'optimizing' || status === 'uploading') && (
          <Loader2 size={14} className="animate-spin text-primary" />
        )}
      </span>

      {/* Name + progress bar */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-mono text-[11px] text-text">{formatName(name)}</p>
          {badgeColor && fileSizeBytes != null && (
            <span className={`shrink-0 rounded border px-1 py-px font-mono text-[9px] leading-none ${BADGE_CLASSES[badgeColor]}`}>
              {formatBytes(fileSizeBytes)}
            </span>
          )}
        </div>
        {showBar && (
          <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-150"
              style={{ width: `${status === 'optimizing' ? 30 : progress}%` }}
            />
          </div>
        )}
        {showBar && (
          <p className="mt-0.5 font-mono text-[10px] text-muted">
            {status === 'optimizing'
              ? optimizingLabel
              : phaseLabel
                ? `${phaseLabel} ${progress}%`
                : `${uploadingLabel} ${progress}%`
            }
          </p>
        )}
        {status === 'error' && error && (
          <p className="mt-0.5 font-mono text-[10px] text-danger">{error}</p>
        )}
      </div>

      {/* Remove (only for pending/error) or Cancel (only for active VPS uploads) */}
      {onCancel && status === 'uploading' && phaseLabel !== undefined && (
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded p-0.5 text-muted hover:text-danger focus:outline-none"
          aria-label="Cancel upload"
        >
          <X size={12} />
        </button>
      )}
      {onRemove && (status === 'pending' || status === 'error') && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-0.5 text-muted hover:text-danger focus:outline-none"
          aria-label="Remove"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
