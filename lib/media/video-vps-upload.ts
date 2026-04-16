'use client'

import { VIDEO_CHUNK_MAX_BYTES } from '@/types/media'

/** Labels used during VPS video upload phases. */
export type VideoPhaseLabels = {
  chunking:   string   // "Uploading to VPS…"
  processing: string   // "Compressing…"
  finalizing: string   // "Saving…"
}

/** Callbacks fired during upload for progress + phase label updates. */
export type VideoUploadCallbacks = {
  onProgress:   (pct: number)    => void
  onPhaseLabel: (label: string)  => void
  onError:      (msg: string)    => void
  /** AbortSignal — when aborted the upload is cancelled cleanly and VPS is notified. */
  signal?:      AbortSignal
}

/** What the function returns on success. */
export type VideoVpsResult = {
  key:        string
  publicUrl:  string
  mimeType:   string
  sizeBytes:  number | null
  /** true when VPS is not configured OR when init was rejected — caller must fall back to direct R2 */
  skipped:    boolean
  /**
   * Set when VPS was reachable but rejected init (e.g. 422 validation, 401 auth, 5xx).
   * When true AND skipped === true the caller should show a warning toast before falling back.
   */
  vpsError?:  'auth' | 'validation' | 'unreachable'
  /** true when the upload was cancelled via AbortSignal — caller should discard the entry silently */
  cancelled?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return }
    const id = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

/** Fire-and-forget: tells VPS to clean up a partially uploaded job.
 *  Uses keepalive:true so the request survives a tab close / beforeunload. */
function cancelVpsUpload(uploadId: string): void {
  void fetch('/api/internal/media/videos/cancel', {
    method:   'DELETE',
    headers:  { 'Content-Type': 'application/json' },
    body:     JSON.stringify({ upload_id: uploadId }),
    keepalive: true,
  }).catch(() => { /* ignore — VPS may have already expired the job */ })
}

function sliceIntoChunks(file: File, chunkSize: number): Blob[] {
  const chunks: Blob[] = []
  let offset = 0
  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + chunkSize))
    offset += chunkSize
  }
  return chunks
}

// ── Main orchestration ────────────────────────────────────────────────────────

/**
 * Full VPS video upload pipeline:
 *   init → chunks (sequential) → finalize → poll status → complete
 *
 * Returns `{ skipped: true }` when the VPS is not configured so the caller
 * can transparently fall back to a direct R2 presigned-URL upload.
 *
 * Throws on non-recoverable errors (chunk failure, status 'failed', etc.).
 */
export async function uploadVideoViaVps(
  file:      File,
  labels:    VideoPhaseLabels,
  callbacks: VideoUploadCallbacks,
): Promise<VideoVpsResult> {
  const { onProgress, onPhaseLabel, onError, signal } = callbacks

  let uploadId: string | undefined

  try { return await _runUpload() } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (uploadId) cancelVpsUpload(uploadId)
      return { key: '', publicUrl: '', mimeType: file.type, sizeBytes: null, skipped: false, cancelled: true }
    }
    throw err
  }

  async function _runUpload(): Promise<VideoVpsResult> {

  // ── Phase 1: Init ──────────────────────────────────────────────────────────
  const totalChunks = Math.max(1, Math.ceil(file.size / VIDEO_CHUNK_MAX_BYTES))

  let initRes: Response
  try {
    initRes = await fetch('/api/internal/media/videos/init', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body:    JSON.stringify({
        filename:     file.name,
        total_size:   file.size,
        total_chunks: totalChunks,
      }),
    })
  } catch (err) {
    // Re-throw AbortError so the outer handler can cancel the VPS job
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    // Network error reaching our proxy → fall back to direct R2
    return { key: '', publicUrl: '', mimeType: file.type, sizeBytes: null, skipped: true, vpsError: 'unreachable' }
  }

  // Proxy route returned an error (VPS rejected init: bad format, auth, etc.)
  // Treat as graceful skip so the upload can still succeed via direct R2.
  if (!initRes.ok) {
    const status = initRes.status
    const vpsError: VideoVpsResult['vpsError'] =
      status === 401 ? 'auth' :
      status === 422 ? 'validation' :
      'unreachable'
    return { key: '', publicUrl: '', mimeType: file.type, sizeBytes: null, skipped: true, vpsError }
  }

  const initData = await initRes.json()

  // VPS not configured → tell caller to use direct R2 (silent, no vpsError)
  if (initData.skipped) {
    return { key: '', publicUrl: '', mimeType: file.type, sizeBytes: null, skipped: true }
  }

  uploadId = initData.upload_id as string
  if (!uploadId) throw new Error('VPS_INIT_NO_ID')

  // ── Phase 2: Chunk upload (0–50 %) ────────────────────────────────────────
  onPhaseLabel(labels.chunking)
  onProgress(0)

  const chunks = sliceIntoChunks(file, VIDEO_CHUNK_MAX_BYTES)

  for (let i = 0; i < totalChunks; i++) {
    const form = new FormData()
    form.append('upload_id',   uploadId)
    form.append('chunk_index', String(i))
    form.append('chunk',       chunks[i], 'chunk.bin')

    const chunkRes = await fetch('/api/internal/media/videos/chunk', {
      method: 'POST',
      body:   form,
      signal,
    })

    if (!chunkRes.ok) {
      onError('CHUNK_UPLOAD_FAILED')
      throw new Error('CHUNK_UPLOAD_FAILED')
    }

    onProgress(Math.round(((i + 1) / totalChunks) * 50))
  }

  // ── Phase 3: Finalize (with retry on queue-full) ───────────────────────────
  let jobId: string | null = null
  let retries = 0
  const MAX_RETRIES = 10

  while (retries < MAX_RETRIES) {
    const finalRes = await fetch('/api/internal/media/videos/finalize', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ upload_id: uploadId }),
      signal,
    })

    if (finalRes.status === 503) {
      const { retry_after_seconds } = await finalRes.json().catch(() => ({ retry_after_seconds: 10 }))
      await sleep((retry_after_seconds ?? 10) * 1000, signal)
      retries++
      continue
    }

    if (!finalRes.ok) throw new Error('VPS_FINALIZE_FAILED')

    const { job_id } = await finalRes.json()
    jobId = job_id
    break
  }

  if (!jobId) throw new Error('VPS_FINALIZE_TIMEOUT')

  // ── Phase 4: Poll status (50–90 %) ────────────────────────────────────────
  onPhaseLabel(labels.processing)
  onProgress(50)

  let outputSize: number | undefined
  const POLL_INTERVAL_MS = 3000          // guide: poll every 3 s
  const MAX_POLLS        = 600           // 30 min cap (3 s × 600 = 1800 s = VPS timeout)

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    await sleep(POLL_INTERVAL_MS, signal)

    const statusRes = await fetch(`/api/internal/media/videos/status?job_id=${encodeURIComponent(jobId)}`, { signal })
    if (!statusRes.ok) continue  // transient error — keep polling

    const { status, progress_pct, output_size } = await statusRes.json()

    if (output_size) outputSize = output_size

    if (status === 'done') {
      onProgress(90)
      break
    }

    if (status === 'failed')  throw new Error('VPS_JOB_FAILED')
    if (status === 'expired') throw new Error('VPS_JOB_EXPIRED')

    // uploading | queued | processing
    const vpsPct: number = typeof progress_pct === 'number' ? progress_pct : 0
    onProgress(50 + Math.round(vpsPct * 0.4))
  }

  // ── Phase 5: Complete — VPS download → R2 → DB (90–100 %) ─────────────────
  onPhaseLabel(labels.finalizing)
  onProgress(92)

  const completeRes = await fetch('/api/internal/media/videos/complete', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body:    JSON.stringify({
      job_id:      jobId,
      filename:    file.name,
      mime_type:   file.type,
      output_size: outputSize,
    }),
  })

  if (!completeRes.ok) throw new Error('VPS_COMPLETE_FAILED')

  const result = await completeRes.json()
  onProgress(100)

  return {
    key:       result.key,
    publicUrl: result.publicUrl,
    mimeType:  result.mimeType,
    sizeBytes: result.sizeBytes,
    skipped:   false,
  }
  } // end _runUpload
}
