'use server'

import { randomUUID } from 'node:crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { auth } from '@/auth'
import { getR2Client } from '@/lib/media/r2-client'
import { getSetting } from '@/lib/settings/get-setting'
import { mediaRepository } from '@/db/repositories/media.repository'
import type { ActionResult } from '@/types/actions'
import type {
  UploadUrlResult,
  GetUploadUrlInput,
  SaveMediaInput,
  MediaRecord,
  MediaMeta,
  UploadViaServerInput,
  UploadViaServerResult,
  ListMediaAssetsInput,
  MediaAssetsPage,
  ListMediaAssetsPagedInput,
  MediaAssetsPagedResult,
  VpsWarning,
} from '@/types/media'
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from '@/types/media'

const ALLOWED = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES] as string[]

function sanitizeExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin'
  return ext.replace(/[^a-z0-9]/g, '')
}

async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')
  return session.user.id as string
}

// -----------------------------------------------------------------------
// getUploadUrl — generates a presigned PUT URL for direct browser upload
// -----------------------------------------------------------------------
export async function getUploadUrl(
  input: GetUploadUrlInput,
): Promise<ActionResult<UploadUrlResult>> {
  try {
    await requireSession()

    // Server-side mime type validation — never trust client
    if (!ALLOWED.includes(input.mimeType)) {
      return { success: false, error: 'FILE_TYPE_NOT_ALLOWED' }
    }

    const { client, bucket, publicUrl } = await getR2Client()
    const ext       = sanitizeExtension(input.filename)
    const key       = `uploads/${randomUUID()}.${ext}`
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    const url = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket:      bucket,
        Key:         key,
        ContentType: input.mimeType,
      }),
      { expiresIn: 300 },
    )

    return {
      success: true,
      data: {
        uploadUrl: url,
        key,
        publicUrl: `${publicUrl}/${key}`,
        expiresAt,
      },
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'R2_NOT_CONFIGURED') {
      return { success: false, error: 'STORAGE_NOT_CONFIGURED' }
    }
    return { success: false, error: 'Failed to generate upload URL.' }
  }
}

// -----------------------------------------------------------------------
// saveMediaRecord — insert media row after successful R2 upload
// -----------------------------------------------------------------------
export async function saveMediaRecord(
  input: SaveMediaInput,
): Promise<ActionResult<MediaRecord>> {
  try {
    const userId = await requireSession()
    const record  = await mediaRepository.create({ ...input, uploadedBy: userId })
    return { success: true, data: record }
  } catch {
    return { success: false, error: 'Failed to save media record.' }
  }
}

// -----------------------------------------------------------------------
// uploadViaServer — Tier 2 path: receive file, call Optimus, PUT to R2
// Used by image fields when MEDIA_VPS_URL is configured.
// -----------------------------------------------------------------------
export async function uploadViaServer(
  input: UploadViaServerInput,
): Promise<ActionResult<UploadViaServerResult>> {
  try {
    const userId = await requireSession()

    if (!ALLOWED.includes(input.mimeType)) {
      return { success: false, error: 'FILE_TYPE_NOT_ALLOWED' }
    }

    const { client, bucket, publicUrl: baseUrl } = await getR2Client()
    const vpsUrl = await getSetting('media_vps_url', process.env.MEDIA_VPS_URL)
    const vpsKey = await getSetting('media_vps_key', process.env.MEDIA_VPS_KEY)

    let fileBuffer   = input.file
    let vpsWarning:  VpsWarning | null = null
    let vpsPartialMeta: { processed: number; total: number } | undefined

    const isImage = input.mimeType.startsWith('image/')

    // Optimus only supports jpeg/png/webp — skip for gif/avif (upload as original without warning)
    const OPTIMUS_SUPPORTED = ['image/jpeg', 'image/png', 'image/webp']
    const isOptimizable = isImage && OPTIMUS_SUPPORTED.includes(input.mimeType)

    // Tier 2 — only for Optimus-supported image formats when VPS is configured
    if (isOptimizable && vpsUrl && vpsKey) {
      try {
        const formData = new FormData()
        formData.append('files', new Blob([fileBuffer], { type: input.mimeType }), 'upload')
        formData.append('out', 'webp')

        const res = await fetch(`${vpsUrl}/api/v1/media/images/compress`, {
          method:  'POST',
          headers: { 'X-API-Key': vpsKey },
          body:    formData,
        })

        if (res.ok || res.status === 206) {
          fileBuffer = await res.arrayBuffer()

          if (res.status === 206) {
            const processed = parseInt(res.headers.get('X-Optimus-Processed') ?? '0', 10)
            const total     = parseInt(res.headers.get('X-Optimus-Total')     ?? '0', 10)
            vpsWarning      = 'partial'
            vpsPartialMeta  = { processed, total }
          }
        } else if (res.status === 401) {
          vpsWarning = 'auth'
        } else if (res.status === 408) {
          vpsWarning = 'timeout'
        } else if (res.status === 422) {
          vpsWarning = 'validation'
        }
        // 501 (video) never reaches here — images only above
      } catch {
        vpsWarning = 'unreachable'
      }
    }

    // PUT to R2
    // Use webp extension/mime only when Optimus actually ran and succeeded
    const optimized = isOptimizable && !vpsWarning
    const ext = optimized ? 'webp' : (input.mimeType.split('/')[1] ?? 'bin')
    const key  = `uploads/${randomUUID()}.${ext}`

    const { PutObjectCommand: Put } = await import('@aws-sdk/client-s3')
    await client.send(new Put({
      Bucket:      bucket,
      Key:         key,
      Body:        new Uint8Array(fileBuffer),
      ContentType: optimized ? 'image/webp' : input.mimeType,
    }))

    const finalPublicUrl = `${baseUrl}/${key}`

    // Save media record
    await mediaRepository.create({
      key,
      publicUrl:  finalPublicUrl,
      mimeType:   optimized ? 'image/webp' : input.mimeType,
      sizeBytes:  fileBuffer.byteLength,
      name:       input.filename ?? undefined,
      nodeId:     input.nodeId,
      uploadedBy: userId,
    })

    return {
      success: true,
      data: { publicUrl: finalPublicUrl, key, vpsWarning, vpsPartialMeta },
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'R2_NOT_CONFIGURED') {
      return { success: false, error: 'STORAGE_NOT_CONFIGURED' }
    }
    return { success: false, error: 'Upload failed.' }
  }
}

// -----------------------------------------------------------------------
// listMediaAssets — cursor-based pager for MediaLibraryPicker
// -----------------------------------------------------------------------
export async function listMediaAssets(
  input: ListMediaAssetsInput,
): Promise<ActionResult<MediaAssetsPage>> {
  try {
    await requireSession()
    const page = await mediaRepository.listPaginated(input)
    return { success: true, data: page }
  } catch {
    return { success: false, error: 'Failed to load media assets.' }
  }
}

// -----------------------------------------------------------------------
// listMediaAssetsPaged — offset-based pager for the Media Gallery page
// getMediaFileNames — returns all existing filenames (lowercase) for duplicate checking
// -----------------------------------------------------------------------
export async function getMediaFileNames(): Promise<ActionResult<string[]>> {
  try {
    await requireSession()
    const names = await mediaRepository.getAllFileNames()
    return { success: true, data: names }
  } catch {
    return { success: false, error: 'Failed to load media names.' }
  }
}

// -----------------------------------------------------------------------
export async function listMediaAssetsPaged(
  input: ListMediaAssetsPagedInput,
): Promise<ActionResult<MediaAssetsPagedResult>> {
  try {
    await requireSession()
    const result = await mediaRepository.listPaginatedOffset(input)
    return { success: true, data: result }
  } catch {
    return { success: false, error: 'Failed to load media assets.' }
  }
}

// -----------------------------------------------------------------------
// getMediaById — fetch a single asset's metadata by id
// -----------------------------------------------------------------------
export async function getMediaById(
  id: string,
): Promise<ActionResult<MediaMeta>> {
  try {
    await requireSession()
    const record = await mediaRepository.findById(id)
    if (!record) return { success: false, error: 'NOT_FOUND' }
    const name = record.key.split('/').pop() ?? record.key
    return {
      success: true,
      data: {
        id:        record.id,
        name,
        sizeBytes: record.sizeBytes,
        mimeType:  record.mimeType,
        createdAt: record.createdAt,
      },
    }
  } catch {
    return { success: false, error: 'Failed to fetch media record.' }
  }
}

// -----------------------------------------------------------------------
// deleteMediaRecord — removes from R2 + DB
// -----------------------------------------------------------------------
export async function deleteMediaRecord(
  id: string,
): Promise<ActionResult<void>> {
  try {
    await requireSession()
    await mediaRepository.delete(id)
    return { success: true }
  } catch (err) {
    if (err instanceof Error && err.message === 'MEDIA_NOT_FOUND') {
      return { success: false, error: 'NOT_FOUND' }
    }
    return { success: false, error: 'Failed to delete media record.' }
  }
}

// -----------------------------------------------------------------------
// bulkDeleteMediaRecords — removes multiple records from R2 + DB
// -----------------------------------------------------------------------
export async function bulkDeleteMediaRecords(
  ids: string[],
): Promise<ActionResult<{ deleted: number; failed: number }>> {
  try {
    await requireSession()
    let deleted = 0
    let failed  = 0
    for (const id of ids) {
      try {
        await mediaRepository.delete(id)
        deleted++
      } catch {
        failed++
      }
    }
    return { success: true, data: { deleted, failed } }
  } catch {
    return { success: false, error: 'Failed to bulk delete media records.' }
  }
}
