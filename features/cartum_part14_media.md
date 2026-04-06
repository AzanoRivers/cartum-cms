# Part 14 — Media Pipeline

## Goal
Implement file uploads to Cloudflare R2 with two-tier client-side optimization. Tier 1 (always active): browser compression before upload. Tier 2 (optional): offload to a user-configured VPS API for heavier processing. No Cloudflare account credentials are required — just a bucket URL.

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

## Tier 2 — Optional VPS Processing

When `MEDIA_VPS_URL` is set, the Server Action proxies a processing request to an external API after upload.

### Env vars
```
MEDIA_VPS_URL=https://media-api.your-vps.com
MEDIA_VPS_KEY=secret_key_here
```

### Flow
```
After upload completes:
  Server Action → POST {MEDIA_VPS_URL}/process
    body: { key, publicUrl, mimeType }
    headers: { Authorization: Bearer {MEDIA_VPS_KEY} }
  
  VPS processes (transcode, resize variants, thumbnails…)
  VPS writes results back to the same R2 bucket
  Server Action updates media record with variant URLs
```

The CMS never waits for VPS processing synchronously — it fires and forgets. The VPS notifies via a webhook when done (Part 16, Settings panel configures the webhook receiver).

### Graceful fallback
If Tier 2 is not configured (`MEDIA_VPS_URL` is undefined), Tier 1 results are used as-is. No error is thrown.

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

## Acceptance Criteria

- [ ] `getUploadUrl()` returns a signed PUT URL with 5-minute expiry
- [ ] Browser uploads directly to R2 with progress visible
- [ ] Images > 2MB are automatically compressed before upload (Tier 1)
- [ ] Videos > 20MB are re-encoded client-side via ffmpeg.wasm
- [ ] `ffmpeg.wasm` only loads on demand (no bundle cost unless file is video)
- [ ] If `MEDIA_VPS_URL` is not set, Tier 2 is silently skipped
- [ ] Unsupported file types are blocked at Server Action level (before signing)
- [ ] `media` table record is created after successful upload
- [ ] COOP/COEP headers are set for ffmpeg.wasm `SharedArrayBuffer` compatibility
- [ ] Upload errors surface as user-visible alerts (Part 15)
