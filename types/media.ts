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
  sizeBytes: number
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

export type VpsWarning = 'unreachable' | 'auth' | 'validation' | 'timeout' | 'partial'

export interface UploadViaServerInput {
  file:     ArrayBuffer
  mimeType: string
  nodeId?:  string
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

export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024   // 50 MB
export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024  // 500 MB
