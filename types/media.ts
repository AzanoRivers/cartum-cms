/** Returned by optimizeImage / optimizeVideo. tier1Failed=true means
 *  compression threw and the original file was returned as fallback.
 */
export interface OptimizeResult {
  file:        File
  tier1Failed: boolean
}

export interface MediaRecord {
  id:         string
  key:        string
  publicUrl:  string
  mimeType:   string
  sizeBytes:  number | null
  name:       string | null
  nodeId:     string | null
  recordId:   string | null
  uploadedBy: string
  createdAt:  Date
}

export interface GetUploadUrlInput {
  filename: string
  mimeType: string
  nodeId?:  string
}

export interface UploadUrlResult {
  uploadUrl: string
  key:       string
  publicUrl: string
  expiresAt: Date
}

export interface SaveMediaInput {
  key:       string
  publicUrl: string
  mimeType:  string
  sizeBytes: number | null
  name?:     string
  nodeId?:   string
  recordId?: string
}

export interface ListMediaAssetsInput {
  filter:   'image' | 'video'
  cursor?:  string   // ISO string of last createdAt (keyset pagination)
  limit?:   number   // default 24, max 48
  search?:  string   // substring match on key
}

export interface MediaAssetsPage {
  assets:     MediaRecord[]
  nextCursor: string | null
}

// Offset-based pagination for the Media Gallery page
export interface ListMediaAssetsPagedInput {
  filter:   'image' | 'video'
  page:     number   // 1-indexed
  perPage:  number   // 10 | 20 | 40
  search?:  string
}

export interface MediaAssetsPagedResult {
  assets:     MediaRecord[]
  total:      number
  page:       number
  totalPages: number
}

// Minimal metadata for displaying an asset's info without the full record
export interface MediaMeta {
  id:        string
  name:      string   // filename derived from key
  sizeBytes: number | null
  mimeType:  string
  createdAt: Date
}

export type VpsWarning = 'unreachable' | 'auth' | 'validation' | 'timeout' | 'partial'

export interface UploadViaServerInput {
  file:      ArrayBuffer
  mimeType:  string
  filename?: string
  nodeId?:   string
}

export interface UploadViaServerResult {
  publicUrl:   string
  key:         string
  vpsWarning:  VpsWarning | null
  vpsPartialMeta?: { processed: number; total: number }
}

// Allowed types (also validated server-side)
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
] as const

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/webm', 'video/quicktime',
] as const

export const MAX_IMAGE_SIZE_BYTES          = 80  * 1024 * 1024  //  80 MB
export const MAX_VIDEO_SIZE_BYTES          = 500 * 1024 * 1024  // 500 MB
export const VIDEO_CHUNK_MAX_BYTES         = 90  * 1024 * 1024  //  90 MB (Cloudflare R2 limit on VPS side)
export const VIDEO_FALLBACK_WARNING_BYTES  = 100 * 1024 * 1024  // 100 MB — threshold for unoptimized upload warning

/** Phase labels shown in the upload row during VPS video compression. */
export type VideoUploadPhase = 'chunking' | 'processing' | 'finalizing'

/** Shape returned by GET /api/v1/media/videos/status/{job_id} */
export interface VideoJobStatusResponse {
  status:       'queued' | 'processing' | 'done' | 'failed'
  progress_pct: number
  output_size?: number
}
