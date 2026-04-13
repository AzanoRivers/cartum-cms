'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { uploadFileWithProgress } from '@/lib/media/upload'
import { optimizeImage } from '@/lib/media/optimize'
import { getUploadUrl, saveMediaRecord, listMediaAssetsPaged } from '@/lib/actions/media.actions'
import type { MediaRecord, VpsWarning } from '@/types/media'
import type { UploadFileStatus } from '@/components/ui/molecules/UploadFileRow'
import type { MediaGalleryFilter } from '@/components/ui/molecules/MediaGalleryTabs'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
} from '@/types/media'

export type UploadLabels = {
  error:          string
  success:        string
  vpsUnreachable: string
  vpsAuth:        string
  vpsTimeout:     string
  vpsValidation:  string
  vpsPartial:     string
}

export type UploadEntry = {
  id:       string
  name:     string
  file:     File
  status:   UploadFileStatus
  progress: number
  error?:   string
}

const ALLOWED_ALL = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES] as string[]

export function useMediaGallery() {
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
  function addFilesToQueue(files: FileList | File[]) {
    const entries: UploadEntry[] = []
    for (const file of Array.from(files)) {
      if (!ALLOWED_ALL.includes(file.type)) continue
      const limit = file.type.startsWith('video/') ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES
      if (file.size > limit) continue
      entries.push({
        id:       crypto.randomUUID(),
        name:     file.name,
        file,
        status:   'pending',
        progress: 0,
      })
    }
    if (entries.length > 0) setQueue((q) => [...q, ...entries])
  }

  function removeFromQueue(id: string) {
    setQueue((q) => q.filter((e) => e.id !== id))
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
  async function uploadEntry(entry: UploadEntry, labels: UploadLabels) {
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
        form.append('file', tier1File, file.name)

        // 30s timeout — Optimus can be slow but shouldn't exceed this for single images
        const controller = new AbortController()
        const timeoutId  = setTimeout(() => controller.abort(), 30_000)

        const proxyRes = await fetch('/api/internal/media/compress', {
          method: 'POST',
          body:   form,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))

        const skipped = proxyRes.headers.get('X-Vps-Skipped')
        const warnHdr = proxyRes.headers.get('X-Vps-Warning') as VpsWarning | null
        const ct      = proxyRes.headers.get('Content-Type') ?? ''

        if (!skipped && ct.startsWith('image/')) {
          // Optimus returned optimized bytes
          finalBlob = await proxyRes.blob()
          finalMime = 'image/webp'
          if (warnHdr) vpsWarning = warnHdr
        } else if (warnHdr) {
          // Optimus returned a warning, use Tier 1 result as-is
          vpsWarning = warnHdr
        }
        // skipped → use Tier 1 result silently
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
        return
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
        return
      }

      // ── Save metadata only (no bytes) ──
      await saveMediaRecord({
        key,
        publicUrl,
        mimeType:  finalMime,
        sizeBytes: finalBlob.size,
      })

      patchEntry(id, { status: 'done', progress: 100 })
      toast.success(labels.success)

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

    } else {
      // ── Video: presigned PUT direct to R2 ──
      const urlRes = await getUploadUrl({ filename: file.name, mimeType: file.type })
      if (!urlRes.success) {
        patchEntry(id, { status: 'error', error: labels.error })
        return
      }
      const { uploadUrl, key, publicUrl } = urlRes.data

      patchEntry(id, { status: 'uploading', progress: 0 })
      try {
        await uploadFileWithProgress(file, uploadUrl, file.type, (pct) => {
          patchEntry(id, { progress: pct })
        })
      } catch {
        patchEntry(id, { status: 'error', error: labels.error })
        return
      }

      await saveMediaRecord({
        key,
        publicUrl,
        mimeType:  file.type,
        sizeBytes: file.size,
      })

      patchEntry(id, { status: 'done', progress: 100 })
      toast.success(labels.success)
    }
  }

  async function startUpload(entry: UploadEntry, labels: UploadLabels) {
    await uploadEntry(entry, labels)
    // Show done/error state briefly so the user sees the checkmark before it disappears
    await new Promise((r) => setTimeout(r, 1800))
    setQueue((q) => q.filter((e) => e.id !== entry.id || e.status === 'error'))
    fetchPage(filter, page, perPage, search)
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
    addFilesToQueue, removeFromQueue, startUpload,
    onDragOver, onDragLeave, onDrop,
    // selection
    selectedIds, selectionMode, toggleSelect, clearSelection, selectAll,
    // refresh
    refresh: () => fetchPage(filter, page, perPage, search),
  }
}
