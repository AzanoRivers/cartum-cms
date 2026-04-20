'use client'

import { VIDEO_CHUNK_MAX_BYTES } from '@/types/media'

/** Labels used during VPS video upload phases. */
export type VideoPhaseLabels = {
  chunking:   string   // "Uploading…"
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
  vpsError?:  'auth' | 'validation' | 'unreachable' | 'queue_full'
  /** true when the upload was cancelled via AbortSignal — caller should discard the entry silently */
  cancelled?: boolean
}

/**
 * When provided, the browser calls the VPS directly (no Vercel proxy).
 * Obtained by calling GET /api/internal/media/vps-session.
 */
export type VpsDirectConfig = {
  /** Base URL of the VPS, e.g. https://optimus.azanolabs.com */
  url:   string
  /** Short-lived session token (2 h TTL) */
  token: string
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

/**
 * Returns the full URL for a VPS endpoint.
 * When vpsConfig is present, calls VPS directly; otherwise uses the Vercel proxy.
 */
function vpsOrProxy(vpsConfig: VpsDirectConfig | undefined, vpsPath: string, proxyPath: string): string {
  return vpsConfig
    ? `${vpsConfig.url}/api/v1/media${vpsPath}`
    : proxyPath
}

/**
 * Returns auth headers for VPS calls.
 * Direct VPS calls use X-Session-Token; proxy calls need no extra auth.
 */
function authHeaders(vpsConfig: VpsDirectConfig | undefined): Record<string, string> {
  return vpsConfig ? { 'X-Session-Token': vpsConfig.token } : {}
}

/** Fire-and-forget: tells VPS to clean up a partially uploaded job.
 *  Uses keepalive:true so the request survives a tab close / beforeunload. */
function cancelVpsUpload(uploadId: string, vpsConfig?: VpsDirectConfig): void {
  const url = vpsConfig
    ? `${vpsConfig.url}/api/v1/media/videos/upload/${encodeURIComponent(uploadId)}`
    : '/api/internal/media/videos/cancel'

  const init: RequestInit = vpsConfig
    ? {
        method:    'DELETE',
        headers:   { 'X-Session-Token': vpsConfig.token },
        keepalive: true,
      }
    : {
        method:    'DELETE',
        headers:   { 'Content-Type': 'application/json' },
        body:      JSON.stringify({ upload_id: uploadId }),
        keepalive: true,
      }

  void fetch(url, init).catch(() => { /* ignore — VPS may have already expired the job */ })
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
 * When `vpsConfig` is provided the browser calls the VPS directly,
 * bypassing Vercel entirely for all phases except the final "complete" step
 * (which needs Vercel to access R2 credentials and write to the DB).
 *
 * Returns `{ skipped: true }` when the VPS is not configured so the caller
 * can transparently fall back to a direct R2 presigned-URL upload.
 *
 * Throws on non-recoverable errors (chunk failure, status 'failed', etc.).
 */
export async function uploadVideoViaVps(
  file:       File,
  labels:     VideoPhaseLabels,
  callbacks:  VideoUploadCallbacks,
  vpsConfig?: VpsDirectConfig,
): Promise<VideoVpsResult> {
  const { onProgress, onPhaseLabel, onError, signal } = callbacks

  let uploadId: string | undefined

  try { return await _runUpload() } catch (err) {
    // Clean up orphan chunks on the VPS for ANY error — token expiry, network failure, etc.
    if (uploadId) cancelVpsUpload(uploadId, vpsConfig)

    if (err instanceof DOMException && err.name === 'AbortError') {
      return { key: '', publicUrl: '', mimeType: file.type, sizeBytes: null, skipped: false, cancelled: true }
    }
    throw err
  }

  async function _runUpload(): Promise<VideoVpsResult> {

  // ── Phase 1: Init ──────────────────────────────────────────────────────────
  const totalChunks = Math.max(1, Math.ceil(file.size / VIDEO_CHUNK_MAX_BYTES))

  let initRes: Response
  try {
    initRes = await fetch(
      vpsOrProxy(vpsConfig, '/videos/upload/init', '/api/internal/media/videos/init'),
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(vpsConfig) },
        signal,
        body:    JSON.stringify({
          filename:     file.name,
          total_size:   file.size,
          total_chunks: totalChunks,
        }),
      },
    )
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    return { key: '', publicUrl: '', mimeType: file.type, sizeBytes: null, skipped: true, vpsError: 'unreachable' }
  }

  if (!initRes.ok) {
    const status = initRes.status
    const vpsError: VideoVpsResult['vpsError'] =
      status === 401 ? 'auth' :
      status === 422 ? 'validation' :
      'unreachable'
    return { key: '', publicUrl: '', mimeType: file.type, sizeBytes: null, skipped: true, vpsError }
  }

  const initData = await initRes.json()

  // VPS not configured (proxy returned skipped:true) → tell caller to use direct R2
  if (initData.skipped) {
    return { key: '', publicUrl: '', mimeType: file.type, sizeBytes: null, skipped: true }
  }

  uploadId = initData.upload_id as string
  if (!uploadId) throw new Error('VPS_INIT_NO_ID')

  // ── Phase 2: Chunk upload (0–50 %) ────────────────────────────────────────
  onPhaseLabel(labels.chunking)
  onProgress(0)

  const chunks = sliceIntoChunks(file, VIDEO_CHUNK_MAX_BYTES)
  const chunkUrl = vpsOrProxy(vpsConfig, '/videos/upload/chunk', '/api/internal/media/videos/chunk')

  for (let i = 0; i < totalChunks; i++) {
    const form = new FormData()
    form.append('upload_id',   uploadId)
    form.append('chunk_index', String(i))
    form.append('chunk',       chunks[i], 'chunk.bin')

    const chunkRes = await fetch(chunkUrl, {
      method:  'POST',
      headers: authHeaders(vpsConfig),
      body:    form,
      signal,
    })

    if (!chunkRes.ok) {
      onError('CHUNK_UPLOAD_FAILED')
      throw new Error('CHUNK_UPLOAD_FAILED')
    }

    onProgress(Math.round(((i + 1) / totalChunks) * 50))
  }

  // ── Phase 3: Finalize ─────────────────────────────────────────────────────
  let jobId: string | null = null
  const finalizeUrl = vpsOrProxy(vpsConfig, '/videos/upload/finalize', '/api/internal/media/videos/finalize')

  const finalRes = await fetch(finalizeUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(vpsConfig) },
    body:    JSON.stringify({ upload_id: uploadId }),
    signal,
  })

  if (finalRes.status === 503) {
    // Queue full — skip VPS entirely, caller will fall back to direct upload
    return { key: '', publicUrl: '', mimeType: file.type, sizeBytes: null, skipped: true, vpsError: 'queue_full' }
  }

  if (!finalRes.ok) throw new Error('VPS_FINALIZE_FAILED')

  const { job_id } = await finalRes.json()
  jobId = job_id

  if (!jobId) throw new Error('VPS_FINALIZE_NO_JOB')

  // ── Phase 4: Poll status (50–90 %) ────────────────────────────────────────
  onPhaseLabel(labels.processing)
  onProgress(50)

  let outputSize: number | undefined
  const POLL_INTERVAL_MS = 15000
  const MAX_POLLS        = 120   // 30 min cap (15 s × 120)

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    await sleep(POLL_INTERVAL_MS, signal)

    // Direct VPS uses path param; Vercel proxy uses query param
    const statusUrl = vpsConfig
      ? `${vpsConfig.url}/api/v1/media/videos/status/${encodeURIComponent(jobId)}`
      : `/api/internal/media/videos/status?job_id=${encodeURIComponent(jobId)}`

    const statusRes = await fetch(statusUrl, {
      headers: authHeaders(vpsConfig),
      signal,
    })
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
  // Always goes through Vercel: needs R2 credentials and DB access.
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
