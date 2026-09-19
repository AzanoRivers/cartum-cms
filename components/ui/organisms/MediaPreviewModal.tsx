'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, ExternalLink, Link2, Trash2, Check, Pencil, Loader2 } from 'lucide-react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { MediaRecord } from '@/types/media'

export type RenameResult = { success: boolean; error?: string }

export type MediaPreviewModalProps = {
  asset:     MediaRecord | null
  onClose:   () => void
  onDelete?: (asset: MediaRecord) => void
  onRename?: (asset: MediaRecord, name: string) => Promise<RenameResult>
  deleteLabel?:  string
  confirmLabel?: string
  copyUrlLabel?: string
  copiedLabel?:  string
  renameLabel?:        string
  renameSaveLabel?:    string
  renameCancelLabel?:  string
  nameRequiredLabel?:  string
  duplicateNameLabel?: string
  renameErrorLabel?:   string
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('default', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date))
}

export function MediaPreviewModal({
  asset, onClose, onDelete, onRename,
  deleteLabel = 'Delete', confirmLabel = 'Sure?', copyUrlLabel = 'Copy URL', copiedLabel = 'Copied!',
  renameLabel = 'Rename', renameSaveLabel = 'Save', renameCancelLabel = 'Cancel',
  nameRequiredLabel = 'Name is required.', duplicateNameLabel = 'An image with that name already exists in this project.', renameErrorLabel = 'Could not rename.',
}: MediaPreviewModalProps) {
  const open = asset !== null
  const [copied,     setCopied]     = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [renaming,   setRenaming]   = useState(false)
  const [draftName,  setDraftName]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const name = asset ? (asset.name ?? asset.key.split('/').pop() ?? asset.key) : ''

  // ESC to close (or, mid-rename, to just cancel the edit)
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (renaming) {
        setRenaming(false)
        setRenameError(null)
      } else {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, renaming])

  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  if (!open || !asset) return null

  const isVideo = asset.mimeType.startsWith('video/')

  function handleCopy() {
    navigator.clipboard.writeText(asset!.publicUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDelete() {
    if (confirming) {
      onDelete?.(asset!)
      setConfirming(false)
      onClose()
    } else {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
    }
  }

  function startRename() {
    setDraftName(name)
    setRenameError(null)
    setRenaming(true)
  }

  function cancelRename() {
    setRenaming(false)
    setRenameError(null)
  }

  async function saveRename() {
    const trimmed = draftName.trim()
    if (!trimmed) {
      setRenameError(nameRequiredLabel)
      return
    }
    if (trimmed === name) {
      cancelRename()
      return
    }
    setSaving(true)
    setRenameError(null)
    const result = await onRename!(asset!, trimmed)
    setSaving(false)
    if (result.success) {
      setRenaming(false)
    } else {
      setRenameError(result.error === 'DUPLICATE_NAME' ? duplicateNameLabel : renameErrorLabel)
    }
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void saveRename()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      cancelRename()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <VHSTransition duration="fast" className="flex w-full max-w-4xl flex-col rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          {renaming ? (
            <div className="flex min-w-0 max-w-[60%] items-center gap-1">
              <input
                ref={inputRef}
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                disabled={saving}
                className="min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-text outline-none focus:border-accent disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void saveRename()}
                disabled={saving}
                title={renameSaveLabel}
                aria-label={renameSaveLabel}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-success hover:bg-success/10 disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              </button>
              <button
                type="button"
                onClick={cancelRename}
                disabled={saving}
                title={renameCancelLabel}
                aria-label={renameCancelLabel}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text disabled:opacity-60"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 max-w-[60%] items-center gap-1">
              <span className="font-mono text-xs text-muted truncate" title={name}>{name}</span>
              {onRename && (
                <button
                  type="button"
                  onClick={startRename}
                  title={renameLabel}
                  aria-label={renameLabel}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Copy URL */}
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? copiedLabel : copyUrlLabel}
              className={`flex h-7 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] transition-all duration-150 ${
                copied
                  ? 'bg-success/15 text-success'
                  : 'text-muted hover:bg-surface-2 hover:text-text'
              }`}
            >
              {copied ? <Check size={12} /> : <Link2 size={12} />}
              <span className="hidden sm:inline">{copied ? copiedLabel : copyUrlLabel}</span>
            </button>

            <a
              href={asset.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
              aria-label="Open in new tab"
            >
              <ExternalLink size={13} />
            </a>
            <a
              href={asset.publicUrl}
              download={name}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
              aria-label="Download"
            >
              <Download size={13} />
            </a>

            {/* Divider */}
            <span className="h-4 w-px bg-border mx-0.5" />

            {/* Delete */}
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                title={confirming ? confirmLabel : deleteLabel}
                className={`flex h-7 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] transition-all duration-150 ${
                  confirming
                    ? 'bg-danger/15 text-danger ring-1 ring-danger/40'
                    : 'text-muted hover:bg-danger/10 hover:text-danger'
                }`}
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">{confirming ? confirmLabel : deleteLabel}</span>
              </button>
            )}

            <span className="h-4 w-px bg-border mx-0.5" />

            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text transition-colors"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        {renameError && (
          <p className="mt-1.5 font-mono text-[10px] text-danger">{renameError}</p>
        )}
        </div>

        {/* Preview — min-h prevents modal from flashing tiny while image loads */}
        <div className="flex min-h-70 sm:min-h-95 flex-1 items-center justify-center bg-bg p-4">
          {isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={asset.publicUrl}
              controls
              className="max-h-[60vh] max-w-full rounded-md"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.publicUrl}
              alt={name}
              className="max-h-[60vh] max-w-full rounded-md object-contain"
            />
          )}
        </div>

        {/* Footer — metadata */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 shrink-0">
          <span className="font-mono text-[10px] text-muted">{formatBytes(asset.sizeBytes)}</span>
          <span className="h-3 w-px bg-border" />
          <span className="font-mono text-[10px] text-muted">{asset.mimeType}</span>
          <span className="h-3 w-px bg-border" />
          <span className="font-mono text-[10px] text-muted">{formatDate(asset.createdAt)}</span>
        </div>
      </VHSTransition>
    </div>,
    document.body,
  )
}
