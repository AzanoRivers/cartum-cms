'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { uploadFileWithProgress } from '@/lib/media/upload'
import { optimizeImage } from '@/lib/media/optimize'
import { getUploadUrl, saveMediaRecord, listMediaAssetsPaged } from '@/lib/actions/media.actions'
import { uploadVideoViaVps } from '@/lib/media/video-vps-upload'
import type { VpsDirectConfig } from '@/lib/media/video-vps-upload'
import type { MediaRecord, VpsWarning } from '@/types/media'
import type { UploadFileStatus } from '@/components/ui/molecules/UploadFileRow'
import type { MediaGalleryFilter } from '@/components/ui/molecules/MediaGalleryTabs'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  VIDEO_FALLBACK_WARNING_BYTES,
} from '@/types/media'

export type UploadLabels = {
  error:          string
  success:        string
  vpsUnreachable: string
  vpsAuth:        string
  vpsTimeout:     string
  vpsValidation:  string
  vpsPartial:     string
  // Video VPS phase labels
  videoSizeError:  string
  videoChunking:   string
  videoProcessing: string
  videoFinalizing: string
  videoVpsSkipped: string
}

export type UploadEntry = {
  id:          string
  name:        string
  file:        File
  status:      UploadFileStatus
  progress:    number
  error?:      string
  /** Phase-specific label shown in the upload row during VPS video upload */
  phaseLabel?: string
}

const ALLOWED_ALL          = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES] as string[]
const MAX_IMAGE_QUEUE       = 25
const MAX_VIDEO_QUEUE       = 5
const MAX_CONCURRENT_UPLOADS = 5

export type UseMediaGalleryConfig = {
  /** Label shown in a toast when a video exceeds MAX_VIDEO_SIZE_BYTES. */
  videoSizeErrorLabel?:   string
  /** Label shown when the image queue limit is reached. */
  imageLimitErrorLabel?:  string
  /** Label shown when the video queue limit is reached. */
  videoLimitErrorLabel?:  string
  /** Batch success toast — use {n} as placeholder for file count. */
  uploadSuccessBatch?:    string
  /** Batch error toast — use {n} as placeholder for file count. */
  uploadErrorBatch?:      string
  /** Compression summary — use {pct} as placeholder for average % reduction. */
  compressionBatch?:      string
  /** Shown when a file already exists in the queue or gallery — use {names} as placeholder. */
  duplicateErrorLabel?:   string
}

export function useMediaGallery(config?: UseMediaGalleryConfig) {
  // Keep labels in refs so drag handlers always have latest without re-renders
  const videoSizeErrorLabelRef  = useRef(config?.videoSizeErrorLabel ?? '')
  videoSizeErrorLabelRef.current  = config?.videoSizeErrorLabel ?? ''
  const imageLimitErrorLabelRef = useRef(config?.imageLimitErrorLabel ?? '')
  imageLimitErrorLabelRef.current = config?.imageLimitErrorLabel ?? ''
  const videoLimitErrorLabelRef = useRef(config?.videoLimitErrorLabel ?? '')
  videoLimitErrorLabelRef.current = config?.videoLimitErrorLabel ?? ''
  const uploadSuccessBatchRef   = useRef(config?.uploadSuccessBatch ?? '')
  uploadSuccessBatchRef.current   = config?.uploadSuccessBatch ?? ''
  const uploadErrorBatchRef     = useRef(config?.uploadErrorBatch ?? '')
  uploadErrorBatchRef.current     = config?.uploadErrorBatch ?? ''
  const compressionBatchRef     = useRef(config?.compressionBatch ?? '')
  compressionBatchRef.current     = config?.compressionBatch ?? ''
  const duplicateErrorLabelRef  = useRef(config?.duplicateErrorLabel ?? '')
  duplicateErrorLabelRef.current  = config?.duplicateErrorLabel ?? ''

  // ── VPS session (short-lived token for browser → VPS direct calls) ────────
  const vpsSessionRef    = useRef<(VpsDirectConfig & { expiresAt: number }) | null>(null)
  const vpsRefreshTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let destroyed = false

    async function fetchVpsSession(): Promise<void> {
      try {
        const res = await fetch('/api/internal/media/vps-session')
        if (!res.ok || destroyed) return
        const data: { skipped?: boolean; vpsUrl?: string; token?: string; expiresIn?: number } = await res.json()
        if (data.skipped || !data.token || !data.vpsUrl) return

        const expiresIn = data.expiresIn ?? 7200   // seconds
        vpsSessionRef.current = {
          url:       data.vpsUrl,
          token:     data.token,
          expiresAt: Date.now() + expiresIn * 1000,
        }

        // Schedule a refresh at 90 % of the TTL so the token is always fresh.
        // e.g. 2 h token → refresh after 1 h 48 min.
        const refreshIn = Math.floor(expiresIn * 0.9) * 1000
        if (vpsRefreshTimer.current) clearTimeout(vpsRefreshTimer.current)
        vpsRefreshTimer.current = setTimeout(() => {
          if (!destroyed) void fetchVpsSession()
        }, refreshIn)
      } catch {
        // VPS unreachable — uploads fall back to Vercel proxy
      }
    }

    void fetchVpsSession()

    return () => {
      destroyed = true
      if (vpsRefreshTimer.current) clearTimeout(vpsRefreshTimer.current)
    }
  }, [])

  /** Returns a VpsDirectConfig when the session is valid, undefined otherwise. */
  function getVpsConfig(): VpsDirectConfig | undefined {
    const s = vpsSessionRef.current
    if (!s || Date.now() >= s.expiresAt) return undefined
    return { url: s.url, token: s.token }
  }

  // Batch counters — accumulate across concurrent uploads, reset when all finish
  const batchSuccessCount     = useRef(0)
  const batchErrorCount       = useRef(0)
  const batchOriginalBytes    = useRef(0)
  const batchCompressedBytes  = useRef(0)

  // ── Upload semaphore (max MAX_CONCURRENT_UPLOADS at once) ─────────────────
  type SlotWaiter = { resolve: () => void; reject: () => void }
  const semaphoreSlots  = useRef(0)
  const semaphoreQueue  = useRef<SlotWaiter[]>([])

  function acquireSlot(): Promise<void> {
    if (semaphoreSlots.current < MAX_CONCURRENT_UPLOADS) {
      semaphoreSlots.current++
      return Promise.resolve()
    }
    return new Promise<void>((resolve, reject) => {
      semaphoreQueue.current.push({
        resolve: () => { semaphoreSlots.current++; resolve() },
        reject,
      })
    })
  }

  function releaseSlot() {
    semaphoreSlots.current--
    const next = semaphoreQueue.current.shift()
    if (next) next.resolve()
  }

  function drainSemaphore() {
    for (const waiter of semaphoreQueue.current) waiter.reject()
    semaphoreQueue.current = []
    semaphoreSlots.current = 0
  }

  // ── Prevent tab close while uploads are active ────────────────────────────
  useEffect(() => {
    // beforeunload: solo muestra el diálogo. NO abortar aquí — si el usuario
    // cancela el reload los uploads deben continuar intactos.
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (activeUploadCount.current > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    // pagehide: dispara SOLO cuando la página realmente se va (el usuario confirmó
    // el reload/cierre). Aquí sí abortamos y notificamos al VPS con keepalive.
    function handlePageHide() {
      if (activeUploadCount.current > 0) {
        for (const controller of uploadAbortControllers.current.values()) {
          controller.abort()
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, []) // uses refs only — no reactive deps needed

  // ── Video fallback warning modal ───────────────────────────────────────────
  // Promise-resolver pattern: uploadEntry awaits user decision before continuing.
  const [videoFallbackOpen, setVideoFallbackOpen] = useState(false)
  const videoFallbackResolverRef = useRef<((confirmed: boolean) => void) | null>(null)

  function askVideoFallback(): Promise<boolean> {
    return new Promise((resolve) => {
      videoFallbackResolverRef.current = resolve
      setVideoFallbackOpen(true)
    })
  }

  function confirmVideoFallback() {
    videoFallbackResolverRef.current?.(true)
    videoFallbackResolverRef.current = null
    setVideoFallbackOpen(false)
  }

  function cancelVideoFallback() {
    videoFallbackResolverRef.current?.(false)
    videoFallbackResolverRef.current = null
    setVideoFallbackOpen(false)
  }

  // ── Pagination & filter ────────────────────────────────────────────────────
  const [filter,     setFilter]     = useState<MediaGalleryFilter>('image')
  const [page,       setPage]       = useState(1)
  const [perPage,    setPerPage]    = useState(10)
  const [search,     setSearch]     = useState('')
  const searchTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Data ───────────────────────────────────────────────────────────────────
  const [assets,     setAssets]     = useState<MediaRecord[]>([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(false)

  // ── Multi-select ───────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const selectionMode = selectedIds.size > 0

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() { setSelectedIds(new Set()) }

  function selectAll() { setSelectedIds(new Set(assets.map((a) => a.id))) }

  // ── Upload queue ───────────────────────────────────────────────────────────
  const [queue,      setQueue]      = useState<UploadEntry[]>([])
  const [dragging,   setDragging]   = useState(false)
  /** Keeps AbortControllers for active VPS video uploads, keyed by entry id. */
  const uploadAbortControllers = useRef(new Map<string, AbortController>())
  /** Tracks how many concurrent startUpload calls are in flight. */
  const activeUploadCount = useRef(0)
  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (
    f: MediaGalleryFilter,
    p: number,
    pp: number,
    s: string,
  ) => {
    setLoading(true)
    try {
      const res = await listMediaAssetsPaged({ filter: f, page: p, perPage: pp, search: s || undefined })
      if (res.success) {
        setAssets(res.data.assets)
        setTotal(res.data.total)
        setTotalPages(res.data.totalPages)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPage(filter, page, perPage, search)
  }, [filter, page, perPage, search, fetchPage])

  // ── Filter/page helpers ────────────────────────────────────────────────────
  function changeFilter(f: MediaGalleryFilter) {
    setFilter(f)
    setPage(1)
    setSelectedIds(new Set())
  }

  function changePage(p: number) {
    setPage(p)
    setSelectedIds(new Set())
  }

  function changePerPage(n: number) {
    setPerPage(n)
    setPage(1)
    setSelectedIds(new Set())
  }

  function handleSearchInput(value: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
      setSelectedIds(new Set())
    }, 350)
  }

  // ── Upload queue helpers ───────────────────────────────────────────────────
  function addFilesToQueue(files: FileList | File[], videoSizeErrorLabel?: string) {
    // Caller may pass a label directly (button/input), or we fall back to the ref (drag-drop)
    const sizeErrorLabel = videoSizeErrorLabel ?? videoSizeErrorLabelRef.current
    const imgLabel       = imageLimitErrorLabelRef.current
    const vidLabel       = videoLimitErrorLabelRef.current
    const dupLabel       = duplicateErrorLabelRef.current

    // Build a case-insensitive set of names already in queue or gallery
    const existingNames = new Set<string>()
    for (const e of queue)   existingNames.add(e.name.toLowerCase())
    for (const a of assets) {
      const n = a.name ?? a.key.split('/').pop() ?? ''
      if (n) existingNames.add(n.toLowerCase())
    }

    const newImages: UploadEntry[] = []
    const newVideos: UploadEntry[] = []
    const duplicateNames: string[] = []

    for (const file of Array.from(files)) {
      if (!ALLOWED_ALL.includes(file.type)) continue
      if (existingNames.has(file.name.toLowerCase())) {
        duplicateNames.push(file.name)
        continue
      }
      const isVideo = file.type.startsWith('video/')
      const sizeLimit = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES
      if (file.size > sizeLimit) {
        if (isVideo && sizeErrorLabel) toast.error(sizeErrorLabel)
        continue
      }
      const entry: UploadEntry = { id: crypto.randomUUID(), name: file.name, file, status: 'pending', progress: 0 }
      if (isVideo) newVideos.push(entry)
      else         newImages.push(entry)
    }

    if (duplicateNames.length > 0 && dupLabel) {
      toast.warning(dupLabel.replace('{names}', duplicateNames.join(', ')))
    }

    if (newImages.length === 0 && newVideos.length === 0) return

    const nameSort = (a: UploadEntry, b: UploadEntry) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })

    setQueue((q) => {
      const qImages = q.filter((e) => !e.file.type.startsWith('video/'))
      const qVideos = q.filter((e) =>  e.file.type.startsWith('video/'))

      const combinedImages = [...qImages, ...newImages].sort(nameSort)
      const combinedVideos = [...qVideos, ...newVideos].sort(nameSort)

      let droppedImages = 0
      let droppedVideos = 0

      const finalImages = combinedImages.length > MAX_IMAGE_QUEUE
        ? (droppedImages = combinedImages.length - MAX_IMAGE_QUEUE, combinedImages.slice(0, MAX_IMAGE_QUEUE))
        : combinedImages

      const finalVideos = combinedVideos.length > MAX_VIDEO_QUEUE
        ? (droppedVideos = combinedVideos.length - MAX_VIDEO_QUEUE, combinedVideos.slice(0, MAX_VIDEO_QUEUE))
        : combinedVideos

      if (droppedImages > 0 && imgLabel) toast.error(imgLabel)
      if (droppedVideos > 0 && vidLabel) toast.error(vidLabel)

      return [...finalImages, ...finalVideos].sort(nameSort)
    })
  }

  function removeFromQueue(id: string) {
    setQueue((q) => q.filter((e) => e.id !== id))
  }

  /** Cancel an active VPS video upload. Aborts in-flight fetches and notifies the VPS. */
  function cancelUpload(id: string) {
    uploadAbortControllers.current.get(id)?.abort()
    setQueue((q) => q.filter((e) => e.id !== id))
  }

  /** Cancel ALL active uploads and clear the entire queue. */
  function cancelAllUploads() {
    // Reject all entries waiting for a semaphore slot
    drainSemaphore()
    // Abort in-flight uploads
    for (const controller of uploadAbortControllers.current.values()) {
      controller.abort()
    }
    uploadAbortControllers.current.clear()
    // Reset counters so no stale batch toast fires
    activeUploadCount.current    = 0
    batchSuccessCount.current    = 0
    batchErrorCount.current      = 0
    batchOriginalBytes.current   = 0
    batchCompressedBytes.current = 0
    setQueue([])
  }

  function patchEntry(id: string, patch: Partial<UploadEntry>) {
    setQueue((q) => q.map((e) => e.id === id ? { ...e, ...patch } : e))
  }

  // ── Upload single entry ────────────────────────────────────────────────────
  //
  // Image flow (bytes NEVER stored via Vercel):
  //   1. Tier 1: browser-image-compression (client, no network)
  //   2. Tier 2: /api/internal/media/compress → thin proxy to Optimus VPS
  //              Vercel only touches bytes for optimization, NOT for storage.
  //   3. getUploadUrl  → presigned R2 URL (server action, tiny — no bytes)
  //   4. PUT to R2 directly from browser via XHR (presigned URL)
  //   5. saveMediaRecord → metadata only (server action, no bytes)
  //
  // Video flow — unchanged (presigned PUT to R2 directly):
  //   1. getUploadUrl  → presigned R2 URL
  //   2. PUT to R2 directly from browser via XHR with progress
  //   3. saveMediaRecord → metadata only
  //
  async function uploadEntry(entry: UploadEntry, labels: UploadLabels): Promise<'success' | 'error' | 'cancelled'> {
    const { id, file } = entry
    const isImage = file.type.startsWith('image/')

    if (isImage) {
      patchEntry(id, { status: 'optimizing', progress: 0 })

      // Yield one frame so React can paint the spinner before blocking the main thread
      await new Promise<void>((r) => setTimeout(r, 50))

      // ── Tier 1: client-side compression ──
      const { file: tier1File } = await optimizeImage(file)

      // ── Tier 2: Optimus proxy ──
      let finalBlob: Blob   = tier1File
      let finalMime: string = tier1File.type || file.type
      let vpsWarning: VpsWarning | null = null

      try {
        const form = new FormData()
        // VPS endpoint expects "files" (list field), whether called directly or via proxy
        form.append('files', tier1File, file.name)

        // 30s timeout — Optimus can be slow but shouldn't exceed this for single images
        const controller = new AbortController()
        const timeoutId  = setTimeout(() => controller.abort(), 30_000)

        // Use VPS directly when a session is available (avoids Vercel bandwidth)
        const imgVpsConfig    = getVpsConfig()
        const compressUrl     = imgVpsConfig
          ? `${imgVpsConfig.url}/api/v1/media/images/compress?out=webp`
          : '/api/internal/media/compress'
        const compressHeaders: HeadersInit = imgVpsConfig
          ? { 'X-Session-Token': imgVpsConfig.token }
          : {}

        const proxyRes = await fetch(compressUrl, {
          method:  'POST',
          headers: compressHeaders,
          body:    form,
          signal:  controller.signal,
        }).finally(() => clearTimeout(timeoutId))

        // Vercel proxy translates VPS errors to X-Vps-Warning headers.
        // For direct VPS calls, map HTTP status codes ourselves.
        const skipped = proxyRes.headers.get('X-Vps-Skipped')
        const ct      = proxyRes.headers.get('Content-Type') ?? ''
        let warnHdr   = proxyRes.headers.get('X-Vps-Warning') as VpsWarning | null

        if (!warnHdr && imgVpsConfig && !proxyRes.ok && proxyRes.status !== 206) {
          const statusMap: Partial<Record<number, VpsWarning>> = {
            401: 'auth', 408: 'timeout', 422: 'validation',
          }
          warnHdr = statusMap[proxyRes.status] ?? 'unreachable'
        }

        if (!skipped && (proxyRes.ok || proxyRes.status === 206) && ct.startsWith('image/')) {
          // Optimus returned optimized bytes
          finalBlob = await proxyRes.blob()
          finalMime = 'image/webp'
          if (proxyRes.status === 206) vpsWarning = 'partial'
          else if (warnHdr) vpsWarning = warnHdr
        } else if (warnHdr) {
          // Optimus returned a warning, use Tier 1 result as-is
          vpsWarning = warnHdr
        }
        // skipped or unrecognized → use Tier 1 result silently
      } catch {
        // Network error reaching proxy — use Tier 1 result silently
      }

      // ── Presigned URL (tiny server request, no bytes) ──
      // Derive filename with the correct extension — if Optimus converted to webp,
      // the original file.name still has the old extension (e.g. .png).
      const baseName     = file.name.replace(/\.[^.]+$/, '')
      const finalExt     = finalMime === 'image/webp' ? 'webp' : (file.name.split('.').pop() ?? 'bin')
      const finalFilename = `${baseName}.${finalExt}`
      const urlRes = await getUploadUrl({ filename: finalFilename, mimeType: finalMime })
      if (!urlRes.success) {
        patchEntry(id, { status: 'error', error: labels.error })
        return 'error'
      }
      const { uploadUrl, key, publicUrl } = urlRes.data

      // ── PUT directly to R2 from browser — Vercel not involved ──
      patchEntry(id, { status: 'uploading', progress: 0 })
      try {
        await uploadFileWithProgress(finalBlob, uploadUrl, finalMime, (pct) => {
          patchEntry(id, { progress: pct })
        })
      } catch {
        patchEntry(id, { status: 'error', error: labels.error })
        return 'error'
      }

      // ── Save metadata only (no bytes) ──
      await saveMediaRecord({
        key,
        publicUrl,
        mimeType:  finalMime,
        sizeBytes: finalBlob.size,
        name:      file.name,
      })

      patchEntry(id, { status: 'done', progress: 100 })
      batchOriginalBytes.current   += file.size
      batchCompressedBytes.current += finalBlob.size

      if (vpsWarning) {
        const vpsToasts: Record<VpsWarning, string> = {
          unreachable: labels.vpsUnreachable,
          auth:        labels.vpsAuth,
          timeout:     labels.vpsTimeout,
          validation:  labels.vpsValidation,
          partial:     labels.vpsPartial,
        }
        toast.warning(vpsToasts[vpsWarning])
      }

      return 'success'

    } else {
      // ── Video: warn before uploading any video larger than the recommended threshold ──
      // This check runs regardless of whether VPS is configured, so the user is always
      // informed before a large upload starts (VPS compression or direct R2).
      if (file.size > VIDEO_FALLBACK_WARNING_BYTES) {
        const confirmed = await askVideoFallback()
        if (!confirmed) {
          setQueue((q) => q.filter((e) => e.id !== id))
          return 'cancelled'
        }
      }

      // ── Video: VPS chunked pipeline (fallback to direct R2 on init rejection/no config) ──
      patchEntry(id, { status: 'uploading', progress: 0, phaseLabel: labels.videoChunking })

      const controller = new AbortController()
      uploadAbortControllers.current.set(id, controller)

      try {
        const result = await uploadVideoViaVps(
          file,
          {
            chunking:   labels.videoChunking,
            processing: labels.videoProcessing,
            finalizing: labels.videoFinalizing,
          },
          {
            onProgress:   (pct)   => patchEntry(id, { progress: pct }),
            onPhaseLabel: (label) => patchEntry(id, { phaseLabel: label }),
            onError:      ()      => { /* non-recoverable errors are thrown and caught below */ },
            signal:       controller.signal,
          },
          getVpsConfig(),
        )

        if (result.cancelled) {
          // cancelUpload() already removed the entry from the queue
          return 'cancelled'
        }

        if (result.skipped) {
          // VPS not configured → silent fallback
          // VPS rejected init (auth/validation/unreachable) → warn + fallback
          if (result.vpsError) {
            const warnMap = {
              auth:        labels.vpsAuth,
              validation:  labels.vpsValidation,
              unreachable: labels.vpsUnreachable,
            }
            toast.warning(warnMap[result.vpsError])
          }

          // Direct presigned R2 upload (user already confirmed the size warning above)
          patchEntry(id, { phaseLabel: undefined })
          const urlRes = await getUploadUrl({ filename: file.name, mimeType: file.type })
          if (!urlRes.success) {
            patchEntry(id, { status: 'error', error: labels.error })
            return 'error'
          }
          const { uploadUrl, key, publicUrl } = urlRes.data

          try {
            await uploadFileWithProgress(file, uploadUrl, file.type, (pct) => {
              patchEntry(id, { progress: pct })
            })
          } catch {
            patchEntry(id, { status: 'error', error: labels.error })
            return 'error'
          }

          await saveMediaRecord({
            key,
            publicUrl,
            mimeType:  file.type,
            sizeBytes: file.size,
            name:      file.name,
          })
        }

        // VPS path: record was already saved server-side by the /complete route
        patchEntry(id, { status: 'done', progress: 100, phaseLabel: undefined })
        // Track compression ratio (VPS result carries compressed sizeBytes)
        if (result.sizeBytes != null && result.sizeBytes > 0) {
          batchOriginalBytes.current   += file.size
          batchCompressedBytes.current += result.sizeBytes
        }
        return 'success'

      } catch {
        // Non-recoverable error mid-pipeline (chunk failure, VPS job failed, R2 write failed, etc.)
        patchEntry(id, { status: 'error', error: labels.error, phaseLabel: undefined })
        return 'error'
      } finally {
        uploadAbortControllers.current.delete(id)
      }
    }
  }

  async function startUpload(entry: UploadEntry, labels: UploadLabels) {
    activeUploadCount.current++
    // Wait for a free slot — rejects immediately if cancelAllUploads is called
    try {
      await acquireSlot()
    } catch {
      // Cancelled while waiting in the semaphore queue
      activeUploadCount.current--
      return
    }

    const outcome = await uploadEntry(entry, labels)
    // Release slot as soon as upload finishes so next entry starts immediately
    releaseSlot()

    if (outcome === 'success') batchSuccessCount.current++
    if (outcome === 'error')   batchErrorCount.current++
    // Show done/error state briefly so the user sees the checkmark before it disappears
    await new Promise((r) => setTimeout(r, 1800))
    setQueue((q) => q.filter((e) => e.id !== entry.id || e.status === 'error'))
    activeUploadCount.current--
    // Only when all concurrent uploads finish: show batch summary + refresh grid
    if (activeUploadCount.current === 0) {
      const s          = batchSuccessCount.current
      const e          = batchErrorCount.current
      const origBytes  = batchOriginalBytes.current
      const compBytes  = batchCompressedBytes.current
      batchSuccessCount.current    = 0
      batchErrorCount.current      = 0
      batchOriginalBytes.current   = 0
      batchCompressedBytes.current = 0
      if (s > 0) {
        const tpl = uploadSuccessBatchRef.current
        toast.success(tpl ? tpl.replace('{n}', String(s)) : `${s} file(s) uploaded.`)
      }
      if (origBytes > 0 && compBytes > 0 && compBytes < origBytes) {
        const pct    = Math.round((1 - compBytes / origBytes) * 100)
        const cTpl   = compressionBatchRef.current
        if (pct > 0 && cTpl) toast.info(cTpl.replace('{pct}', String(pct)))
      }
      if (e > 0) {
        const tpl = uploadErrorBatchRef.current
        toast.error(tpl ? tpl.replace('{n}', String(e)) : `${e} file(s) failed.`)
      }
      fetchPage(filter, page, perPage, search)
    }
  }

  // Auto-start pending entries one by one
  const uploading = queue.some((e) => e.status === 'uploading' || e.status === 'optimizing')

  // Drag-over events
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFilesToQueue(e.dataTransfer.files)
  }

  return {
    // data
    assets, total, totalPages, loading,
    // pagination
    filter, page, perPage,
    changeFilter, changePage, changePerPage,
    // search
    handleSearchInput,
    // upload
    queue, dragging, uploading,
    addFilesToQueue, removeFromQueue, startUpload, cancelUpload, cancelAllUploads,
    onDragOver, onDragLeave, onDrop,
    // selection
    selectedIds, selectionMode, toggleSelect, clearSelection, selectAll,
    // refresh
    refresh: () => fetchPage(filter, page, perPage, search),
    // video fallback modal
    videoFallbackOpen, confirmVideoFallback, cancelVideoFallback,
  }
}
