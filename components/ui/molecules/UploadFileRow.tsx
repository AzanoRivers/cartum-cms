'use client'

import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export type UploadFileStatus = 'pending' | 'optimizing' | 'uploading' | 'done' | 'error'

export type UploadFileRowProps = {
  name:     string
  status:   UploadFileStatus
  progress: number   // 0–100, used during 'uploading'
  error?:   string
  onRemove?: () => void
  optimizingLabel: string
  uploadingLabel:  string
}

function formatName(name: string) {
  if (name.length <= 28) return name
  const ext  = name.split('.').pop() ?? ''
  const base = name.slice(0, 20)
  return `${base}…${ext ? `.${ext}` : ''}`
}

export function UploadFileRow({
  name,
  status,
  progress,
  error,
  onRemove,
  optimizingLabel,
  uploadingLabel,
}: UploadFileRowProps) {
  const showBar = status === 'uploading' || status === 'optimizing'

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
      {/* Status icon */}
      <span className="shrink-0">
        {status === 'done' && <CheckCircle2 size={14} className="text-success" />}
        {status === 'error' && <AlertCircle size={14} className="text-danger" />}
        {(status === 'pending' || status === 'optimizing' || status === 'uploading') && (
          <Loader2 size={14} className="animate-spin text-primary" />
        )}
      </span>

      {/* Name + progress bar */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[11px] text-text">{formatName(name)}</p>
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
            {status === 'optimizing' ? optimizingLabel : `${uploadingLabel} ${progress}%`}
          </p>
        )}
        {status === 'error' && error && (
          <p className="mt-0.5 font-mono text-[10px] text-danger">{error}</p>
        )}
      </div>

      {/* Remove (only for pending/error) */}
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
