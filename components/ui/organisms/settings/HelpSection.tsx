'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import imageCompression from 'browser-image-compression'
import { Upload, X, ImageIcon, Send, Clock, Gift, Bug, AlertCircle } from 'lucide-react'
import { sendHelpReport, getHelpRateStatus, type HelpAttachment } from '@/lib/actions/help.actions'
import { useToast } from '@/lib/hooks/useToast'
import { useTier2Status } from '@/lib/hooks/useTier2Status'
import { useLocalRateLimit } from '@/lib/hooks/useLocalRateLimit'
import { RATE_LIMITS } from '@/lib/rate-limits'
import { SectionLoader } from '@/components/ui/atoms/SectionLoader'
import type { Dictionary } from '@/locales/en'

type D = Dictionary['settings']['help']

export type HelpSectionProps = {
  d:           D
  loadingText: string
}

const MAX_CHARS    = 800
const MAX_IMAGES   = 10
const MAX_SIZE_MB  = 2
const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

type ImageStatus = 'compressing' | 'ready' | 'error'

type ImageEntry = {
  id:       string
  file:     File
  preview:  string
  b64:      string
  mime:     string
  status:   ImageStatus
  progress: number  // 0-100 combined (0-50 = T1, 50-100 = T2 when tier2 active)
}

function toBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function HelpSection({ d, loadingText }: HelpSectionProps) {
  const [loaded,    setLoaded]    = useState(false)
  const [canSend,   setCanSend]   = useState(true)
  const [nextAt,    setNextAt]    = useState<string | null>(null)
  const [subject,   setSubject]   = useState('')
  const [email,     setEmail]     = useState('')
  const [message,   setMessage]   = useState('')
  const [images,    setImages]    = useState<ImageEntry[]>([])
  const [dragOver,  setDragOver]  = useState(false)
  const [isSending, startSend]    = useTransition()
  const fileRef   = useRef<HTMLInputElement>(null)
  const toast     = useToast()
  const hasTier2  = useTier2Status()
  const localRL   = useLocalRateLimit(RATE_LIMITS.HELP_REPORT.key)

  useEffect(() => {
    // Fast-path: if localStorage already knows we're blocked, skip the server call
    if (localRL.blocked) {
      setCanSend(false)
      setNextAt(localRL.nextAt)
      setLoaded(true)
      return
    }
    getHelpRateStatus().then((res) => {
      setCanSend(res.canSend)
      setNextAt(res.nextAllowedAt ?? null)
      if (!res.canSend && res.nextAllowedAt) localRL.markBlocked(res.nextAllowedAt)
      setLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function compressEntry(file: File, id: string, useTier2: boolean) {
    const setProgress = (p: number) =>
      setImages(prev => prev.map(img => img.id === id ? { ...img, progress: p } : img))

    try {
      // Tier 1: browser compression
      const t1 = await imageCompression(file, {
        maxSizeMB:        MAX_SIZE_MB,
        maxWidthOrHeight: 3840,
        useWebWorker:     false,
        fileType:         'image/webp',
        onProgress:       (p) => setProgress(useTier2 ? Math.round(p / 2) : p),
      })

      let final: File | Blob = t1

      // Tier 2: aggressive second pass for smaller attachment
      if (useTier2) {
        const t2 = await imageCompression(t1, {
          maxSizeMB:        0.5,
          maxWidthOrHeight: 1600,
          useWebWorker:     false,
          fileType:         'image/webp',
          onProgress:       (p) => setProgress(50 + Math.round(p / 2)),
        })
        final = t2
      }

      const b64 = await toBase64(final)
      setImages(prev => prev.map(img =>
        img.id === id
          ? { ...img, b64, mime: 'image/webp', status: 'ready', progress: 100 }
          : img
      ))
    } catch {
      // Fallback: send original (still encode it)
      try {
        const b64 = await toBase64(file)
        setImages(prev => prev.map(img =>
          img.id === id
            ? { ...img, b64, mime: file.type, status: 'error', progress: 100 }
            : img
        ))
      } catch {
        setImages(prev => prev.filter(img => img.id !== id))
      }
    }
  }

  async function addFiles(files: FileList | File[]) {
    const arr       = Array.from(files)
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) { toast.error(d.maxImagesError ?? `Max ${MAX_IMAGES} images.`); return }

    const valid: File[] = []
    for (const f of arr.slice(0, remaining)) {
      if (!ACCEPT_TYPES.includes(f.type)) { toast.error(d.invalidTypeError ?? 'Only JPG, PNG, WebP, GIF allowed.'); continue }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(d.fileTooLargeError ?? `Max ${MAX_SIZE_MB}MB per image.`); continue }
      valid.push(f)
    }
    if (!valid.length) return

    const useTier2 = hasTier2 === true

    const newEntries: ImageEntry[] = valid.map(f => ({
      id:       crypto.randomUUID(),
      file:     f,
      preview:  URL.createObjectURL(f),
      b64:      '',
      mime:     f.type,
      status:   'compressing',
      progress: 0,
    }))
    setImages(prev => [...prev, ...newEntries])

    for (const entry of newEntries) {
      compressEntry(entry.file, entry.id, useTier2)
    }
  }

  function removeImage(id: string) {
    setImages(prev => {
      const target = prev.find(img => img.id === id)
      if (target) URL.revokeObjectURL(target.preview)
      return prev.filter(img => img.id !== id)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const anyCompressing = images.some(img => img.status === 'compressing')

  function handleSubmit() {
    if (!subject.trim() || !email.trim() || !message.trim()) { toast.error(d.allFieldsRequired ?? 'All fields are required.'); return }
    if (message.length > MAX_CHARS) { toast.error(d.messageTooLong ?? `Max ${MAX_CHARS} characters.`); return }
    if (anyCompressing) return

    startSend(async () => {
      const attachments: HelpAttachment[] = images
        .filter(img => img.status === 'ready' && img.b64)
        .map(img => ({ filename: img.file.name, content: img.b64, mimeType: img.mime }))

      const res = await sendHelpReport({ subject, email, message, attachments })
      if (res.success) {
        toast.success(d.sent ?? 'Report sent. Thank you!')
        setSubject(''); setMessage('')
        images.forEach(img => URL.revokeObjectURL(img.preview))
        setImages([])
        setCanSend(false)
        const nextAt = res.nextAllowedAt ?? null
        setNextAt(nextAt)
        if (nextAt) localRL.markBlocked(nextAt)
      } else if (res.error === 'RATE_LIMITED') {
        setCanSend(false)
        const nextAt = res.nextAllowedAt ?? null
        setNextAt(nextAt)
        if (nextAt) localRL.markBlocked(nextAt)
        toast.error(d.rateLimited ?? 'You can only send 1 report per day.')
      } else {
        toast.error(res.error ?? d.sendError ?? 'Failed to send.')
      }
    })
  }

  if (!loaded) return <SectionLoader text={loadingText} />

  const charsLeft = MAX_CHARS - message.length
  const nextDate  = nextAt ? new Date(nextAt) : null

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/3 to-transparent pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-lg border border-primary/30 bg-primary/15 p-2.5">
            <Bug size={20} className="text-primary" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-mono text-sm font-semibold text-text">{d.title}</h2>
            <p className="font-mono text-xs text-muted/80 leading-relaxed max-w-lg">{d.description}</p>
          </div>
        </div>
        {/* Reward badge */}
        <div className="rainbow-border mt-4 flex items-center gap-2 rounded-md bg-amber-400/8 px-3 py-2 w-fit">
          <Gift size={13} className="text-amber-400 shrink-0" />
          <span className="font-mono text-[11px] text-amber-400/90">{d.rewardNote}</span>
        </div>
      </div>

      {/* Rate limit warning */}
      {!canSend && nextDate && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2.5">
          <Clock size={14} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-mono text-xs text-warning/90">{d.rateLimited ?? 'You can only send 1 report per day.'}</p>
            <p className="font-mono text-[10px] text-warning/60 mt-0.5">
              {d.nextAllowed ?? 'Next available:'} {nextDate.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Subject */}
        <div className="space-y-1.5">
          <label className="block font-mono text-xs text-muted uppercase tracking-wider">{d.subjectLabel}</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            disabled={!canSend || isSending}
            placeholder={d.subjectPlaceholder}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block font-mono text-xs text-muted uppercase tracking-wider">{d.emailLabel}</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={!canSend || isSending}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block font-mono text-xs text-muted uppercase tracking-wider">{d.messageLabel}</label>
            <span className={`font-mono text-[10px] ${charsLeft < 50 ? 'text-warning' : 'text-muted/50'}`}>
              {message.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
            disabled={!canSend || isSending}
            placeholder={d.messagePlaceholder}
            rows={5}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
          />
        </div>

        {/* Image upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block font-mono text-xs text-muted uppercase tracking-wider">{d.imagesLabel}</label>
            <div className="flex items-center gap-2">
              {hasTier2 !== null && (
                <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${
                  hasTier2
                    ? 'text-accent/80 border-accent/20 bg-accent/5'
                    : 'text-muted/40 border-border/40'
                }`}>
                  {hasTier2 ? 'T1+T2' : 'T1'}
                </span>
              )}
              <span className="font-mono text-[10px] text-muted/50">{images.length}/{MAX_IMAGES}</span>
            </div>
          </div>

          {/* Drag & drop zone */}
          {images.length < MAX_IMAGES && canSend && !isSending && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-all duration-200 ${
                dragOver
                  ? 'border-primary bg-primary/10 scale-[1.01]'
                  : 'border-border/60 bg-surface-2/30 hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              <Upload size={18} className={dragOver ? 'text-primary' : 'text-muted/60'} />
              <p className="font-mono text-[11px] text-muted/70 text-center">
                {d.dropZoneText ?? 'Drag & drop images or click to browse'}
              </p>
              <p className="font-mono text-[10px] text-muted/40">{d.dropZoneHint ?? 'JPG, PNG, WebP, GIF · max 2MB each'}</p>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT_TYPES.join(',')}
                multiple
                className="hidden"
                onChange={e => e.target.files && addFiles(e.target.files)}
              />
            </div>
          )}

          {/* Image previews with progress */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {images.map((img) => {
                const isCompressing = img.status === 'compressing'
                const isError       = img.status === 'error'
                const inTier2Phase  = hasTier2 === true && img.progress > 50
                const barT1Width    = hasTier2 === true
                  ? Math.min(img.progress, 50) * 2
                  : img.progress
                const barT2Width    = hasTier2 === true && img.progress > 50
                  ? (img.progress - 50) * 2
                  : 0

                return (
                  <div key={img.id} className="relative group aspect-square rounded-md overflow-hidden border border-border/60 bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.preview}
                      alt={img.file.name}
                      className={`h-full w-full object-cover transition-opacity duration-300 ${isCompressing ? 'opacity-40' : 'opacity-100'}`}
                    />

                    {/* Compressing overlay */}
                    {isCompressing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
                        <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          inTier2Phase
                            ? 'text-accent bg-black/60 border border-accent/30'
                            : 'text-primary bg-black/60 border border-primary/30'
                        }`}>
                          {inTier2Phase ? 'T2' : 'T1'}
                        </span>
                        <span className="font-mono text-[8px] text-white/50">
                          {img.progress}%
                        </span>
                      </div>
                    )}

                    {/* Error badge */}
                    {isError && (
                      <div className="absolute top-1 left-1 pointer-events-none">
                        <AlertCircle size={12} className="text-warning drop-shadow-md" />
                      </div>
                    )}

                    {/* Progress bar (while compressing) */}
                    {isCompressing && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                        {/* T1 segment */}
                        <div
                          className="absolute left-0 top-0 h-full bg-primary transition-[width] duration-100 ease-linear"
                          style={{ width: `${barT1Width}%` }}
                        />
                        {/* T2 segment (starts at midpoint) */}
                        {hasTier2 === true && (
                          <div
                            className="absolute top-0 h-full bg-accent transition-[width] duration-100 ease-linear"
                            style={{ left: '50%', width: `${barT2Width}%` }}
                          />
                        )}
                      </div>
                    )}

                    {/* Remove button (ready state) */}
                    {!isCompressing && (
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 rounded-full bg-danger/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    )}

                    {/* Filename footer */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                      <p className="font-mono text-[7px] text-white/70 truncate">{img.file.name}</p>
                    </div>
                  </div>
                )
              })}

              {/* Add more slot */}
              {images.length < MAX_IMAGES && canSend && !isSending && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-md border border-dashed border-border/60 flex items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <ImageIcon size={16} className="text-muted/40" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSubmit}
            disabled={!canSend || isSending || anyCompressing || !subject.trim() || !email.trim() || !message.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 font-mono text-xs font-semibold text-white hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.35)]"
          >
            <Send size={13} />
            {isSending ? (d.sending ?? 'Sending…') : anyCompressing ? '…' : (d.send ?? 'Send report')}
          </button>
        </div>
      </div>
    </div>
  )
}
