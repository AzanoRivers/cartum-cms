'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Upload, X, ImageIcon, Send, Clock, Gift, Bug } from 'lucide-react'
import { sendHelpReport, getHelpRateStatus, type HelpAttachment } from '@/lib/actions/help.actions'
import { useToast } from '@/lib/hooks/useToast'
import { SectionLoader } from '@/components/ui/atoms/SectionLoader'
import type { Dictionary } from '@/locales/en'

type D = Dictionary['settings']['help']

export type HelpSectionProps = {
  d:           D
  loadingText: string
}

const MAX_CHARS       = 800
const MAX_IMAGES      = 5
const MAX_SIZE_MB     = 3
const ACCEPT_TYPES    = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function toBase64(file: File): Promise<string> {
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
  const [images,    setImages]    = useState<Array<{ file: File; preview: string; b64: string; mime: string }>>([])
  const [dragOver,  setDragOver]  = useState(false)
  const [isSending, startSend]    = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const toast   = useToast()

  useEffect(() => {
    getHelpRateStatus().then((res) => {
      setCanSend(res.canSend)
      setNextAt(res.nextAllowedAt ?? null)
      setLoaded(true)
    })
  }, [])

  async function addFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) { toast.error(d.maxImagesError ?? `Max ${MAX_IMAGES} images.`); return }
    const toAdd = arr.slice(0, remaining)
    const results = await Promise.all(toAdd.filter(f => {
      if (!ACCEPT_TYPES.includes(f.type)) { toast.error(d.invalidTypeError ?? 'Only JPG, PNG, WebP, GIF allowed.'); return false }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(d.fileTooLargeError ?? `Max ${MAX_SIZE_MB}MB per image.`); return false }
      return true
    }).map(async (f) => ({ file: f, preview: URL.createObjectURL(f), b64: await toBase64(f), mime: f.type })))
    setImages(prev => [...prev, ...results])
  }

  function removeImage(i: number) {
    setImages(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i) })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  function handleSubmit() {
    if (!subject.trim() || !email.trim() || !message.trim()) { toast.error(d.allFieldsRequired ?? 'All fields are required.'); return }
    if (message.length > MAX_CHARS) { toast.error(d.messageTooLong ?? `Max ${MAX_CHARS} characters.`); return }
    startSend(async () => {
      const attachments: HelpAttachment[] = images.map(img => ({
        filename: img.file.name,
        content:  img.b64,
        mimeType: img.mime,
      }))
      const res = await sendHelpReport({ subject, email, message, attachments })
      if (res.success) {
        toast.success(d.sent ?? 'Report sent. Thank you!')
        setSubject(''); setMessage(''); setImages([]); setCanSend(false)
        setNextAt(res.nextAllowedAt ?? null)
      } else if (res.error === 'RATE_LIMITED') {
        setCanSend(false); setNextAt(res.nextAllowedAt ?? null)
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
            <p className="font-mono text-[11px] text-muted/80 leading-relaxed max-w-lg">{d.description}</p>
          </div>
        </div>
        {/* Reward badge */}
        <div className="rainbow-border mt-4 flex items-center gap-2 rounded-md bg-amber-400/8 px-3 py-2 w-fit">
          <Gift size={13} className="text-amber-400 shrink-0" />
          <span className="font-mono text-[10px] text-amber-400/90">{d.rewardNote}</span>
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
            <span className="font-mono text-[10px] text-muted/50">{images.length}/{MAX_IMAGES}</span>
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
              <p className="font-mono text-[10px] text-muted/40">{d.dropZoneHint ?? 'JPG, PNG, WebP, GIF · max 3MB each'}</p>
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

          {/* Image previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative group aspect-square rounded-md overflow-hidden border border-border/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt={img.file.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 rounded-full bg-danger/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X size={10} className="text-white" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                    <p className="font-mono text-[8px] text-white/80 truncate">{img.file.name}</p>
                  </div>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
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
            disabled={!canSend || isSending || !subject.trim() || !email.trim() || !message.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 font-mono text-xs font-semibold text-white hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.35)]"
          >
            <Send size={13} />
            {isSending ? (d.sending ?? 'Sending…') : (d.send ?? 'Send report')}
          </button>
        </div>
      </div>
    </div>
  )
}
