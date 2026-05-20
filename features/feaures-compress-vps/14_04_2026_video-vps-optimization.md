# Feature: Video VPS Optimization via Optimus

**Date:** 14/04/2026
**Status:** ✅ Implemented
**Priority:** High

---

## Context

The media gallery currently uploads videos directly to Cloudflare R2 without any compression. The Optimus VPS (`optimus.azanolabs.com`) now supports video compression via a chunked upload API. Videos can be large (up to 500 MB), so the upload must be chunked in ≤ 90 MB segments due to Cloudflare's body size limits on the VPS side.

---

## Solution

- 500 MB max per video — immediate toast error if exceeded before upload starts
- Chunked upload to VPS: max 90 MB per chunk, sent sequentially
- One video at a time: video N fully completes (VPS + R2 + DB) before video N+1 starts
- Three-phase progress (0-50 % chunking → 50-90 % VPS compression → 90-100 % finalize + R2)
- Graceful fallback: if VPS not configured, upload raw video directly to R2 (silent, no error toast)
- All labels via locale dictionaries (en + es)

---

## Architecture

### Server proxy routes (all add `X-API-Key` server-side)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/internal/media/videos/init` | POST | Init upload session on VPS |
| `/api/internal/media/videos/chunk` | POST | Forward one chunk to VPS |
| `/api/internal/media/videos/finalize` | POST | Finalize upload, start compression |
| `/api/internal/media/videos/status` | GET | Poll job status from VPS |
| `/api/internal/media/videos/complete` | POST | Download compressed video from VPS → stream to R2 → save DB record |

### Client service

`lib/media/video-vps-upload.ts` — orchestrates all phases client-side:
1. Slice `File` into ≤ 90 MB chunks
2. `init` → `upload_id`
3. Upload each chunk sequentially → progress 0–50 %
4. `finalize` → `job_id` (retry if VPS queue full)
5. Poll `status` until `done` → progress 50–90 %
6. `complete` → compressed video saved to R2 → progress 90–100 %

### Hook (`useMediaGallery`)

- `UploadEntry` gains optional `phaseLabel?: string`
- `UploadLabels` gains video phase labels
- `addFilesToQueue` accepts optional `videoSizeErrorLabel` and toasts on oversize video
- Video branch replaced with VPS pipeline (fallback to direct R2 if VPS skipped)

### Component (`UploadFileRow`)

- Gains optional `phaseLabel?: string` prop
- When provided and `status === 'uploading'`, shows `phaseLabel N%` instead of generic label

---

## VPS API Reference

All endpoints: `Authorization: X-API-Key <key>` header

```
POST /api/v1/media/videos/upload/init         → { upload_id }
POST /api/v1/media/videos/upload/chunk        → (FormData: upload_id, chunk_index, chunk)
POST /api/v1/media/videos/upload/finalize     → { job_id, status } | 503 { retry_after_seconds }
GET  /api/v1/media/videos/status/{job_id}     → { status, progress_pct, output_size? }
GET  /api/v1/media/videos/download/{job_id}   → binary (file deleted after download)
```

Status values: `queued` | `processing` | `done` | `failed`

---

## Acceptance Criteria

- [x] **AC-01** — File > 500 MB shows toast error immediately; file is NOT added to the queue
- [x] **AC-02** — File ≤ 500 MB is chunked in ≤ 90 MB segments (`VIDEO_CHUNK_MAX_BYTES`)
- [x] **AC-03** — Chunks upload sequentially (`for` loop with `await` in `video-vps-upload.ts`)
- [x] **AC-04** — Progress bar shows 0–50 % during chunk upload phase with label from `videoChunking`
- [x] **AC-05** — After finalize, progress bar shows 50–90 % during VPS compression with label from `videoProcessing`
- [x] **AC-06** — After VPS completes, progress bar shows 90–100 % during R2 save with label from `videoFinalizing`
- [x] **AC-07** — Compressed video saved to R2 + DB via `/complete` route (stream → PutObjectCommand → mediaRepository.create)
- [x] **AC-08** — `fetchPage` called in `startUpload` after upload finishes; gallery refreshes
- [x] **AC-09** — `/init` returns `{ skipped: true }` when VPS not configured; hook falls back to direct R2 silently
- [x] **AC-10** — `uploadVideoViaVps` throws on errors; hook catches and sets `status: 'error'`
- [x] **AC-11** — `startUpload` is called per-entry by the UI; queue ordering preserved
- [x] **AC-12** — 5 new keys added to both `en.ts` and `es.ts` under `mediaGallery`
- [x] **AC-13** — `Dictionary` type updated with `videoSizeError`, `videoChunking`, `videoProcessing`, `videoFinalizing`, `videoVpsSkipped`
- [x] **AC-14** — `npx tsc --noEmit` exits with zero errors
- [x] **AC-15** — Image branch in `uploadEntry` untouched; only the `else` video branch was replaced
