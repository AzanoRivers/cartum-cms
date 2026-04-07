# Part 14 — Media Pipeline

## Goal
Implement file uploads to Cloudflare R2 with a two-tier optimization pipeline:

- **Tier 1 — Always active (client-side):** The browser compresses the file using local resources (CPU/WebAssembly) before any network call. Zero server dependency. Applies to both images and videos.
- **Tier 2 — Optional (VPS):** If `MEDIA_VPS_URL` resolves to a valid endpoint, the Server Action sends the Tier-1-optimized image to Optimus for a second, heavier pass before uploading to R2. **Images only** — Optimus does not yet support video (`501`).

Videos always use Tier 1 only (ffmpeg.wasm in-browser). Tier 2 for video is planned but pending Optimus support.

No Cloudflare account credentials required client-side — presigned URLs are generated server-side.

## Prerequisites
- Part 01 (env vars: `R2_BUCKET_URL`, `R2_PUBLIC_URL`, `MEDIA_VPS_URL`, `MEDIA_VPS_KEY`)
- Part 12 (image/video fields in RecordForm)

---

## R2 Configuration

Cartum uses **public-access presigned PUT uploads** to R2. The bucket must have public read enabled (CORS + public bucket policy). Cartum stores only the final public URL.

### Required env vars
```
R2_BUCKET_URL=https://<account-id>.r2.cloudflarestorage.com/<bucket-name>
R2_PUBLIC_URL=https://media.your-domain.com
```

`R2_BUCKET_URL` is the S3-compatible endpoint used for signed operations.  
`R2_PUBLIC_URL` is the CDN/public base URL for the stored files.

No real Cloudflare credentials needed in the CMS — R2 bucket must be configured to accept public writes with a shared secret from Server Actions only.

---

## Upload Flow

```
Browser                      Server Action              R2 Bucket
  │                               │                        │
  │ 1. getUploadUrl({ filename })  │                        │
  │──────────────────────────────>│                        │
  │                               │ sign URL               │
  │ 2. return { uploadUrl, key }  │──────────────────────>│
  │<──────────────────────────────│                        │
  │                               │                        │
  │ 3. PUT file → uploadUrl       │                        │
  │──────────────────────────────────────────────────────>│
  │                               │                        │
  │ 4. saveMediaRecord({ key })   │                        │
  │──────────────────────────────>│ INSERT media record    │
```

### Step 1–2: Server Action
```ts
// lib/actions/media.actions.ts
'use server'
export async function getUploadUrl(input: GetUploadUrlInput): Promise<ActionResult<UploadUrlResult>> {
  // 1. Validate: check file extension, mime type allowlist
  // 2. Generate a unique object key (uuid + sanitized extension)
  // 3. Generate a presigned PUT URL (signed with R2/S3 SDK, expires in 5 min)
  // 4. Return { uploadUrl, key, publicUrl }
}
```

### Step 3: Browser direct PUT
```ts
// lib/media/upload.ts (client)
export async function uploadFile(file: File, uploadUrl: string): Promise<void> {
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
}
```

### Step 4: Save record
```ts
export async function saveMediaRecord(input: SaveMediaInput): Promise<ActionResult<MediaRecord>>
// Inserts into `media` table: key, publicUrl, mimeType, size, nodeId, recordId
```

---

## Internal Media Table

```
Table: media
- id          uuid PK
- key         text UNIQUE NOT NULL     (R2 object key)
- public_url  text NOT NULL            (CDN URL)
- mime_type   text NOT NULL
- size_bytes  integer
- node_id     uuid FK → nodes.id
- record_id   uuid FK → records.id (nullable — media can be unlinked temporarily)
- uploaded_by uuid FK → users.id
- created_at  timestamp default now()
```

---

## Tier 1 — Always-Active Client-Side Optimization

Runs in the browser before the upload PUT. No server required.

### Images
Library: `browser-image-compression`

```ts
// lib/media/optimize.ts (client)
import imageCompression from 'browser-image-compression'

export async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  return imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 3840,   // 4K max
    useWebWorker: true,
    fileType: file.type,      // preserve format (don't force jpeg)
  })
}
```

### Videos

> **Tier 2 (VPS) not available for video** — Optimus returns `501` for `/api/v1/media/videos/compress`. All video optimization is local-only (Tier 1) until VPS support is added.

Library: `ffmpeg.wasm` — runs entirely in the browser via WebAssembly.

```ts
// lib/media/video-optimize.ts (client)
export async function optimizeVideo(file: File): Promise<File> {
  // Only run if file > 20 MB (skip small videos)
  if (file.size < 20 * 1024 * 1024) return file

  const { createFFmpeg, fetchFile } = await import('@ffmpeg/ffmpeg')
  const ffmpeg = createFFmpeg({ log: false })
  await ffmpeg.load()

  ffmpeg.FS('writeFile', 'input', await fetchFile(file))
  await ffmpeg.run(
    '-i', 'input',
    '-vcodec', 'libx264',
    '-crf', '28',           // quality: 23 = lossless ... 51 = worst
    '-preset', 'fast',
    '-movflags', '+faststart',
    'output.mp4'
  )

  const data = ffmpeg.FS('readFile', 'output.mp4')
  return new File([data.buffer], file.name.replace(/\.\w+$/, '.mp4'), { type: 'video/mp4' })
}
```

**Important:** `ffmpeg.wasm` requires `SharedArrayBuffer`. Next.js must be configured with COOP/COEP headers.

```ts
// next.config.ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    ],
  }]
}
```

---

## Tier 2 — Optional VPS Processing (images only)

> **Video support: 🚧 Under construction** — Optimus `/api/v1/media/videos/compress` returns `501 Not Implemented`. Until it is available, videos skip Tier 2 entirely and are uploaded directly after Tier 1 local compression.

When `MEDIA_VPS_URL` resolves, the Server Action routes the **Tier-1-optimized image** through **Optimus** for a second compression pass **before** uploading to R2.

### API reference (Optimus)
- Endpoint: `POST /api/v1/media/images/compress`
- Auth: `X-API-Key: <MEDIA_VPS_KEY>` header
- Body: `multipart/form-data` — field name `files`, 1–10 images
- Optional params: `out` (jpg | webp | png), `size` (max px on longest side)
- Response: compressed file directly (single) or ZIP (batch)
- Limits: 10 files · 50 MB/file · 200 MB batch · 85s timeout
- Status `206` + `X-Optimus-Status: partial` if timeout mid-batch

### Revised upload flow with Tier 2

```
Browser         Server Action (compress)      Optimus VPS        R2
  │                     │                         │               │
  │  1. uploadImage()   │                         │               │
  │────────────────────>│                         │               │
  │                     │ POST /api/v1/media/      │               │
  │                     │   images/compress        │               │
  │                     │  X-API-Key + file        │               │
  │                     │────────────────────────>│               │
  │                     │  compressed file body    │               │
  │                     │<────────────────────────│               │
  │                     │ sign URL + PUT to R2     │               │
  │                     │─────────────────────────────────────── >│
  │  { publicUrl }      │                         │               │
  │<────────────────────│                         │               │
```

When Tier 2 is active the full upload is handled server-side (Server Action receives the file as `ArrayBuffer`, pipes to Optimus, then PUTs the result to R2 directly). The browser receives only the final `publicUrl`.

### Accepted output format for Tier 2

Cartum requests `out=webp` by default (best compression/quality ratio). Configurable via `app_settings` key `media_vps_out_format` (default: `webp`).

### Graceful fallback
If Tier 2 is not configured or returns an error, fall back to Tier 1 result silently. Never block the upload on a VPS failure.

---

## Upload Progress in UI

The upload field shows a progress bar. `fetch` with `ReadableStream` doesn't expose progress — use `XMLHttpRequest`:

```ts
// lib/media/upload.ts (client)
export function uploadFileWithProgress(
  file: File,
  uploadUrl: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener('load', () => xhr.status < 400 ? resolve() : reject(new Error(String(xhr.status))))
    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.send(file)
  })
}
```

---

## Allowed File Types

```ts
// types/media.ts
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024  // 50 MB raw before compression
export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB raw before compression
```

Server-side validation of mime type must happen on the Server Action before signing the URL (never trust client-supplied mime type for the sign operation).

---

## Types

```ts
// types/media.ts
export interface MediaRecord {
  id: string
  key: string
  publicUrl: string
  mimeType: string
  sizeBytes: number | null
  nodeId: string
  recordId: string | null
  uploadedBy: string
  createdAt: Date
}

export interface GetUploadUrlInput {
  filename: string
  mimeType: string
  nodeId: string
}

export interface UploadUrlResult {
  uploadUrl: string
  key: string
  publicUrl: string
  expiresAt: Date
}

export interface SaveMediaInput {
  key: string
  publicUrl: string
  mimeType: string
  sizeBytes: number
  nodeId: string
  recordId?: string
}
```

---

## Media Library Picker

When the user clicks **"Choose from library"** in an `ImageUploadField` or `VideoUploadField`, a full-screen modal opens showing all assets already uploaded to R2, filtered by type. This replaces the need to re-upload the same asset multiple times.

---

### Component: `<MediaLibraryPicker>`

```
// components/ui/organisms/MediaLibraryPicker.tsx
// Client Component — rendered in a portal (fixed overlay)
```

**Visual layout:**
```
┌────────────────────────────────────────────────────────┐
│  Media Library                            [✕]  │
├────────────────────────────────────────────────────────┤
│  [Search filename…]          [Sort: newest ▾]  │
├────────────────────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │  scrollable
│  │img │ │img │ │img │ │img │ │img │ │img │  │  CSS grid
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘  │  area
│  ┌────┐ ┌────┐ ┌────┐                    │
│  │img │ │img │ │■■■■│←selected              │
│  └────┘ └────┘ └────┘                    │
│  ──────────── loading sentinel ───   │  (↑ IntersectionObserver)
├────────────────────────────────────────────────────────┤
│  photo-sunset.webp · 1.2 MB          [Select]  │  (shows selected asset info)
└────────────────────────────────────────────────────────┘
```

**Props:**
```ts
type MediaLibraryPickerProps = {
  open: boolean
  onClose: () => void
  onSelect: (asset: MediaRecord) => void
  filter: 'image' | 'video'       // only shows matching assets
}
```

**Behavior:**
- Opens with `<VHSTransition>` (fast, 200–300 ms)
- Grid: `grid-cols-3 sm:grid-cols-4 lg:grid-cols-6`, thumbnails `aspect-square object-cover`
- Images: `<img loading="lazy">` with `src={asset.publicUrl}`
- Videos: poster frame thumbnail (first frame). If no poster available: generic video icon card
- Hovering a card shows filename + size as overlay
- Clicking a card selects it (highlighted with `ring-2 ring-[--color-primary]`), footer bar shows asset name + size + **"Select"** button
- **"Select"** closes the picker and calls `onSelect(asset)`
- Double-clicking a card = instant select+close

---

### Infinite scroll — no pagination buttons

Loads 24 assets per page. A sentinel `<div>` at the bottom of the grid is watched by an `IntersectionObserver`. When it enters the viewport, the next page is fetched and appended. No loading spinner interrupts browsing — skeleton cards appear at the bottom while fetching.

```ts
// lib/hooks/useMediaLibrary.ts
export function useMediaLibrary(filter: 'image' | 'video') {
  // cursor-based pagination — no offset drift on new uploads
  // state: assets[], nextCursor, isLoading, hasMore
  // fetchPage(cursor?) → appends to assets[]
  // IntersectionObserver ref returned for sentinel element
}
```

**Skeleton cards:** same `aspect-square` size as real thumbnails, animated `bg-[--color-surface-2]` shimmer (`animate-pulse`). Shown only in the rows being loaded — existing assets never re-render.

---

### Server Action: `listMediaAssets()`

```ts
// lib/actions/media.actions.ts
export async function listMediaAssets(
  input: ListMediaAssetsInput
): Promise<ActionResult<MediaAssetsPage>>

// types/media.ts
export interface ListMediaAssetsInput {
  filter: 'image' | 'video'
  cursor?: string   // last asset's createdAt ISO string (DESC order)
  limit?: number    // default 24, max 48
  search?: string   // matches against `key` (filename substring)
}

export interface MediaAssetsPage {
  assets: MediaRecord[]
  nextCursor: string | null   // null = no more pages
}
```

Query logic:
- `WHERE mime_type LIKE 'image/%'` or `'video/%'` depending on filter
- `ORDER BY created_at DESC`
- Cursor: `WHERE created_at < :cursor` (keyset pagination — stable under concurrent uploads)
- Optional: `AND key ILIKE '%:search%'`

---

### Updated field component interface

Both `ImageUploadField` and `VideoUploadField` now show two entry points side by side:

```
┌───────────────────────────────────────────┐
│  ┌───────────────────┐  ┌─────────────────┐  │
│  │  🖼️ Choose from    │  │  ↑ Upload new    │  │
│  │  library        │  │                │  │
│  └───────────────────┘  └─────────────────┘  │
└───────────────────────────────────────────┘
```

After an asset is selected or uploaded, the field switches to **preview mode**:
```
┌───────────────────────────────────────────┐
│  [thumbnail / video player]   [✕ Remove]  │
│  photo-sunset.webp · 1.2 MB              │
└───────────────────────────────────────────┘
```
"Remove" clears the field value (does **not** delete the asset from R2).

---

### Media table: `node_id` column adjustment

The existing `media.node_id` FK ties assets to specific nodes, which would prevent showing cross-node assets in the library. Change semantics:

- `node_id` → **nullable**, represents "where this asset was first uploaded from" (informational only)
- Library picker queries **all** assets of the matching type regardless of `node_id`
- This is a non-breaking change — existing rows keep their `node_id`, new uploads may set it or leave it null

---

### Locale keys to add

```ts
media: {
  // ...existing keys...
  chooseFromLibrary:  'Choose from library',
  uploadNew:          'Upload new',
  mediaLibraryTitle:  'Media Library',
  searchPlaceholder:  'Search by filename…',
  sortNewest:         'Newest first',
  sortOldest:         'Oldest first',
  emptyLibrary:       'No assets uploaded yet.',
  emptySearch:        'No assets match your search.',
  selectAsset:        'Select',
  removeAsset:        'Remove',
  loadingMore:        'Loading more…',
}
```

---

### Acceptance Criteria — Media Library Picker

- [x] `ImageUploadField` and `VideoUploadField` show two buttons: "Choose from library" / "Upload new"
- [x] "Choose from library" opens `<MediaLibraryPicker>` filtered to the correct type
- [x] Picker loads assets in pages of 24 via `listMediaAssets()` (cursor-based)
- [x] IntersectionObserver triggers next page when sentinel enters viewport
- [x] Skeleton cards appear during page fetch — existing assets don't re-render
- [x] Selecting an asset closes picker and sets field value to `asset.publicUrl`
- [x] Double-click on a card = instant select
- [x] Field shows preview + Remove button after any selection (library or upload)
- [x] Remove clears field value; does NOT delete R2 object
- [x] Search input filters results via `search` param on the Server Action
- [x] Video cards show generic icon if poster is unavailable
- [x] `<VHSTransition>` wraps picker content on open

---

## Error Handling & UX Feedback

All user-facing messages use **Sonner** (`toast` / `useToast()`) following the Part 16 architecture. The upload field uses `toast.promise()` for the main flow; individual pipeline failures emit targeted toasts.

### Toast map — all states

| Event | Toast type | Duration | Message key |
|---|---|---|---|
| Full upload starts | `promise` → loading | — | `media.uploading` |
| Upload complete | `promise` → success | auto | `media.uploadSuccess` |
| Upload to R2 failed | `promise` → error | 8 s | `media.uploadError` |
| File type not allowed | `error` | 6 s | `media.invalidType` |
| File exceeds size limit | `error` | 6 s | `media.fileTooLarge` |
| Tier 1 image compress failed | `warning` | 5 s | `media.tier1ImageWarn` |
| Tier 1 video compress failed | `warning` | 5 s | `media.tier1VideoWarn` |
| Tier 2 VPS unreachable / network error | `warning` | 5 s | `media.vpsUnreachable` |
| Tier 2 VPS → `401 Unauthorized` | `error` (persistent) | `Infinity` | `media.vpsAuthError` |
| Tier 2 VPS → `422 Validation error` | `warning` | 5 s | `media.vpsValidationWarn` |
| Tier 2 VPS → `408 Timeout` (0 images) | `warning` | 5 s | `media.vpsTimeout` |
| Tier 2 VPS → `206 Partial` | `warning` | 6 s | `media.vpsPartial` |
| Tier 2 VPS → `501` (video — expected) | *silent* | — | — |
| Video ffmpeg.wasm loading | `promise` → loading | — | `media.videoProcessing` |

**Rules:**
- `401` from VPS is **persistent** (`duration: Infinity`) — it requires the admin to fix the API key in Settings. Add a description: `media.vpsAuthErrorDesc` with a link hint.
- `206 Partial` includes the count via description: *"X of Y images processed"* (`X-Optimus-Processed` / `X-Optimus-Total` response headers).
- Tier 1 failures (browser compression errors) fall back to the **original file** and emit a `warning` — upload is never blocked.
- Tier 2 failures (any non-200/206) fall back to the **Tier 1 result** — upload is never blocked.
- Video `501` from Optimus is **expected and silent** — never shown to the user.

### Upload flow with toast.promise()

```ts
// In ImageUploadField / VideoUploadField (client component)
import { toast } from 'sonner'
import { useDictionary } from '@/components/ui/providers/DictionaryProvider'

async function handleUpload(file: File) {
  const dict = useDictionary()

  // 1. Validate type/size before starting — show error immediately
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    toast.error(dict.media.invalidType)
    return
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    toast.error(dict.media.fileTooLarge)
    return
  }

  // 2. Wrap the whole pipeline in toast.promise()
  toast.promise(
    runUploadPipeline(file, { nodeId, onProgress }),
    {
      loading: dict.media.uploading,
      success: dict.media.uploadSuccess,
      error: (err) => err.message ?? dict.media.uploadError,
    }
  )
}
```

### `runUploadPipeline()` — where per-stage warnings fire

```ts
// lib/media/upload-pipeline.ts (client)
export async function runUploadPipeline(
  file: File,
  ctx: { nodeId: string; onProgress: (pct: number) => void }
): Promise<MediaRecord> {

  // Tier 1 — local compression
  let optimized = file
  try {
    optimized = file.type.startsWith('image/')
      ? await optimizeImage(file)
      : await optimizeVideo(file)   // ffmpeg.wasm toast.promise handled internally
  } catch {
    toast.warning(
      file.type.startsWith('image/') ? dict.media.tier1ImageWarn : dict.media.tier1VideoWarn
    )
    // fall back to original
  }

  // Tier 2 — VPS (images only, if configured)
  // VPS call happens server-side inside uploadViaServer()
  // The Server Action returns { result, vpsWarning? } to surface warnings here
  const { publicUrl, vpsWarning } = await uploadViaServer(optimized, ctx)

  if (vpsWarning) {
    // vpsWarning values: 'unreachable' | 'auth' | 'validation' | 'timeout' | 'partial' | null
    emitVpsWarningToast(vpsWarning, dict)
  }

  return publicUrl
}
```

### `emitVpsWarningToast()` helper

```ts
// lib/media/vps-toast.ts (client)
import { toast } from 'sonner'

type VpsWarning = 'unreachable' | 'auth' | 'validation' | 'timeout' | 'partial'

export function emitVpsWarningToast(
  warning: VpsWarning,
  dict: MediaDictionary,
  meta?: { processed?: number; total?: number }
) {
  switch (warning) {
    case 'auth':
      toast.error(dict.media.vpsAuthError, {
        duration: Infinity,
        description: dict.media.vpsAuthErrorDesc,  // "Update your VPS API key in Settings → Storage"
        closeButton: true,
      })
      break
    case 'partial':
      toast.warning(dict.media.vpsPartial, {
        description: `${meta?.processed ?? '?'} / ${meta?.total ?? '?'} processed`,
      })
      break
    case 'timeout':
      toast.warning(dict.media.vpsTimeout)
      break
    case 'validation':
      toast.warning(dict.media.vpsValidationWarn)
      break
    case 'unreachable':
      toast.warning(dict.media.vpsUnreachable)
      break
  }
}
```

### Server Action response contract

The Server Action must communicate VPS issues back to the client without throwing — failures are recoverable:

```ts
// lib/actions/media.actions.ts
export async function uploadViaServer(
  file: ArrayBuffer,
  ctx: UploadContext
): Promise<ActionResult<{ publicUrl: string; vpsWarning: VpsWarning | null }>> {
  let fileToUpload = file

  if (vpsConfigured && isImage) {
    const vpsResult = await callOptimus(file)
    if (vpsResult.ok) {
      fileToUpload = vpsResult.data
    } else {
      // Return warning type — never throw, never block upload
      return { success: true, data: { publicUrl: await putToR2(file), vpsWarning: vpsResult.warning } }
    }
  }

  const publicUrl = await putToR2(fileToUpload)
  return { success: true, data: { publicUrl, vpsWarning: null } }
}
```

### Locale keys to add (`locales/en.ts` + `locales/es.ts`)

```ts
media: {
  uploading:          'Uploading…',
  uploadSuccess:      'File uploaded.',
  uploadError:        'Upload failed. Try again.',
  invalidType:        'File type not supported.',
  fileTooLarge:       'File exceeds the size limit.',
  tier1ImageWarn:     'Image compression failed. Uploading original.',
  tier1VideoWarn:     'Video compression failed. Uploading original.',
  vpsUnreachable:     'Media server unreachable. Using local compression.',
  vpsAuthError:       'Media server rejected the API key.',
  vpsAuthErrorDesc:   'Update your VPS API key in Settings → Storage. See API docs: optimus.azanolabs.com/guide',
  vpsValidationWarn:  'Media server could not process this file. Using local compression.',
  vpsTimeout:         'Media server timed out. Using local compression.',
  vpsPartial:         'Media server partially processed the batch.',
  videoProcessing:    'Optimizing video…',
}
```

---

## Acceptance Criteria

- [x] `getUploadUrl()` returns a signed PUT URL with 5-minute expiry
- [x] Browser uploads directly to R2 with progress visible
- [x] Images > 2MB are automatically compressed before upload (Tier 1)
- [x] Videos > 20MB are re-encoded client-side via ffmpeg.wasm (Tier 1 only — VPS video pending)
- [x] `ffmpeg.wasm` only loads on demand (no bundle cost unless file is video)
- [x] Images pass through Tier 1 (browser compress) → Tier 2 (Optimus) when VPS configured
- [x] Videos skip Tier 2 entirely regardless of VPS config (Optimus 501)
- [x] If `MEDIA_VPS_URL` is not set or resolves empty, Tier 2 is silently skipped
- [x] Unsupported file types are blocked at Server Action level (before signing)
- [x] `media` table record is created after successful upload
- [x] COOP/COEP headers are set for ffmpeg.wasm `SharedArrayBuffer` compatibility
- [x] Every upload stage has a corresponding toast state (see toast map above)
- [x] VPS `401` emits a persistent toast with description pointing to Settings → Storage
- [x] VPS `206 Partial` toast shows processed/total count from response headers
- [x] Tier 1 and Tier 2 failures fall back silently — upload is never blocked by optimization errors
- [x] `501` from Optimus (video) emits no toast — expected behavior, handled silently
- [x] `media.*` locale keys present in both `en.ts` and `es.ts`
- [x] Upload errors surface as user-visible alerts (Sonner toasts, Part 16)

---

## Addendum — Runtime-configurable Storage & VPS settings

> Env vars act as seed/fallback. Values set via Settings UI (Part 17 — Storage section) take precedence at runtime, stored in the `app_settings` table.

### Priority chain
```
DB (app_settings) → env var → undefined/disabled
```

### `app_settings` table

```
Table: app_settings
- key        text PRIMARY KEY         (e.g. 'r2_bucket_name', 'media_vps_key')
- value      text                     (plaintext — keys masked in UI only)
- updated_at timestamp default now()
- updated_by uuid FK → users.id
```

A single utility resolves any setting at runtime:

```ts
// lib/settings/get-setting.ts  (server-only)
export async function getSetting(key: string, envFallback?: string): Promise<string | undefined> {
  const row = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1)
  return row[0]?.value ?? envFallback ?? undefined
}
```

### Settings surfaced in Storage UI (Part 17)

| UI Field | `app_settings` key | Env fallback |
|---|---|---|
| Bucket name | `r2_bucket_name` | `R2_BUCKET_NAME` |
| Public URL | `r2_public_url` | `R2_PUBLIC_URL` |
| VPS endpoint | `media_vps_url` | `MEDIA_VPS_URL` |
| VPS API key | `media_vps_key` | `MEDIA_VPS_KEY` |
| Resend API key | `resend_api_key` | `RESEND_API_KEY` |

- `media_vps_key` renders as a **password input** (masked). Focus reveals it with a show/hide toggle.
- The VPS section header includes a small **"API Docs ↗"** link (`https://optimus.azanolabs.com/guide`) that opens in a new tab. Rendered as a `<a>` next to the section label, styled as `text-xs text-[--color-text-muted] hover:text-[--color-accent]`.
- On load, the Settings form reads from DB first; if null, it shows the env var value as a placeholder (not pre-filled) so the user knows a fallback is active.
- Saving an empty field **deletes** the DB row (reverts to env var fallback).

### Server Action
```ts
// lib/actions/settings.actions.ts (extends Part 17)
export async function updateStorageSettings(input: UpdateStorageInput): Promise<ActionResult>
// superAdmin only — upserts each key into app_settings
// empty string → deletes the row (reverts to env fallback)
```

### Acceptance Criteria

- [x] `app_settings` table schema defined
- [x] `getSetting()` utility reads DB first, falls back to env var
- [x] `resend_api_key` surfaced via `getSetting` — DB overrides env at runtime
- [x] Boot E009 check consults DB via `getSetting` (falls back to env if DB unreachable)
- [x] `forgot-password/page.tsx` resolves `hasResend` via `getSetting` (not bare env)
- [ ] ~~Storage section in Settings shows `r2_bucket_name`, `r2_public_url`, `media_vps_url`, `media_vps_key`~~ → moved to Part 17
- [ ] ~~VPS key field is masked; has show/hide toggle~~ → moved to Part 17
- [ ] ~~VPS section shows an "API Docs ↗" link to `https://optimus.azanolabs.com/guide`~~ → moved to Part 17
- [ ] ~~Saving empty value removes DB row (env fallback resumes)~~ → moved to Part 17
- [ ] ~~Only `super_admin` can modify storage settings~~ → moved to Part 17
- [x] `MEDIA_VPS_KEY` env var (renamed from `API_KEY`) used as fallback for VPS key

---

## Addendum — Brand Footer

A floating brand signature was added to all layouts as part of this part's UI polish pass.

### Component: `<BrandFooter>`

```
// components/ui/atoms/BrandFooter.tsx
// Fixed bottom-center pill. pointer-events: none on wrapper so it never blocks interaction.
```

**Visual:**
```
        by  AzanoRivers  ·  AzanoLabs
```

- Pill with `backdrop-blur` + `bg-background/60` + subtle `border-border/40`
- **AzanoRivers** → cyan neon glow (`--color-accent`) on hover, links to `https://azanorivers.com`
- **AzanoLabs** → indigo neon glow (`--color-primary`) on hover, links to `https://azanolabs.com`
- Both links open in new tab with `rel="noopener noreferrer"`
- At rest: `opacity: 0.35` + very faint `text-shadow` — nearly invisible
- Glow ramps up only on hover via `.brand-glow` / `.brand-glow-primary` CSS classes in `globals.css`
- All colors via CSS variables — no hardcoded values

**Injected in:**
- `DesktopLayout.tsx`
- `MobileLayout.tsx`
- `SetupLayout.tsx`
