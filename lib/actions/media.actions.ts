'use server'

import { randomUUID } from 'node:crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2Client } from '@/lib/media/r2-client'
import { blobUpload, BLOB_VIDEO_MAX_BYTES } from '@/lib/media/blob-client'
import { getActiveProvider } from '@/lib/media/storage-router'
import { getSetting } from '@/lib/settings/get-setting'
import { mediaRepository } from '@/db/repositories/media.repository'
import { requireProjectId, assertProjectAccess } from '@/lib/auth/get-project-id'
import { auth } from '@/auth'
import { assertTier2Access } from '@/lib/subscription'
import type { ActionResult } from '@/types/actions'
import type {
  UploadUrlResult,
  GetUploadUrlInput,
  SaveMediaInput,
  MediaRecord,
  MediaMeta,
  MediaStorageSummary,
  UploadViaServerInput,
  UploadViaServerResult,
  ListMediaAssetsInput,
  MediaAssetsPage,
  ListMediaAssetsPagedInput,
  MediaAssetsPagedResult,
  VpsWarning,
} from '@/types/media'
import type { StorageProvider } from '@/types/settings'
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from '@/types/media'

const ALLOWED = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES] as string[]

function sanitizeExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin'
  return ext.replace(/[^a-z0-9]/g, '')
}

async function requireSessionUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')
  return session.user.id as string
}

// -----------------------------------------------------------------------
// getUploadUrl — generates a presigned PUT URL for direct browser upload (R2)
// -----------------------------------------------------------------------
export async function getUploadUrl(
  input: GetUploadUrlInput,
): Promise<ActionResult<UploadUrlResult>> {
  try {
    await requireSessionUserId()

    if (!ALLOWED.includes(input.mimeType)) {
      return { success: false, error: 'FILE_TYPE_NOT_ALLOWED' }
    }

    const provider = await getActiveProvider()
    if (provider === 'blob') {
      return { success: false, error: 'USE_SERVER_UPLOAD' }
    }

    const projectId = await requireProjectId()
    const { client, bucket, publicUrl } = await getR2Client()
    const ext       = sanitizeExtension(input.filename)
    const key       = `uploads/${projectId}/${randomUUID()}.${ext}`
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
    const [userId, projectId] = await Promise.all([requireSessionUserId(), requireProjectId()])
    const record = await mediaRepository.create({ ...input, uploadedBy: userId, projectId })
    return { success: true, data: record }
  } catch {
    return { success: false, error: 'Failed to save media record.' }
  }
}

// -----------------------------------------------------------------------
// uploadViaServer — Tier 2 path: receive file, call Optimus, PUT to R2
// -----------------------------------------------------------------------
export async function uploadViaServer(
  input: UploadViaServerInput,
): Promise<ActionResult<UploadViaServerResult>> {
  try {
    await assertTier2Access()
    const [userId, projectId] = await Promise.all([requireSessionUserId(), requireProjectId()])

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
    const OPTIMUS_SUPPORTED = ['image/jpeg', 'image/png', 'image/webp']
    const isOptimizable = isImage && OPTIMUS_SUPPORTED.includes(input.mimeType)

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
      } catch {
        vpsWarning = 'unreachable'
      }
    }

    const optimized = isOptimizable && !vpsWarning
    const ext = optimized ? 'webp' : (input.mimeType.split('/')[1] ?? 'bin')
    const key = `uploads/${projectId}/${randomUUID()}.${ext}`

    const { PutObjectCommand: Put } = await import('@aws-sdk/client-s3')
    await client.send(new Put({
      Bucket:      bucket,
      Key:         key,
      Body:        new Uint8Array(fileBuffer),
      ContentType: optimized ? 'image/webp' : input.mimeType,
    }))

    const finalPublicUrl = `${baseUrl}/${key}`

    await mediaRepository.create({
      projectId,
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
// uploadBlobDirect — server-side Blob upload (Vercel Blob has no presigned URLs)
// -----------------------------------------------------------------------
export async function uploadBlobDirect(
  input: UploadViaServerInput,
): Promise<ActionResult<{ publicUrl: string; key: string }>> {
  try {
    const [userId, projectId] = await Promise.all([requireSessionUserId(), requireProjectId()])

    if (!ALLOWED.includes(input.mimeType)) {
      return { success: false, error: 'FILE_TYPE_NOT_ALLOWED' }
    }

    const ext      = input.filename ? sanitizeExtension(input.filename) : (input.mimeType.split('/')[1] ?? 'bin')
    const pathname = `uploads/${projectId}/${randomUUID()}.${ext}`

    const { publicUrl, key } = await blobUpload(pathname, input.file, input.mimeType)

    await mediaRepository.create({
      projectId,
      key,
      publicUrl,
      mimeType:        input.mimeType,
      sizeBytes:       input.file.byteLength,
      name:            input.filename ?? undefined,
      nodeId:          input.nodeId,
      uploadedBy:      userId,
      storageProvider: 'blob',
    })

    return { success: true, data: { publicUrl, key } }
  } catch (err) {
    if (err instanceof Error && err.message === 'BLOB_NOT_CONFIGURED') {
      return { success: false, error: 'STORAGE_NOT_CONFIGURED' }
    }
    return { success: false, error: 'Upload failed.' }
  }
}

// -----------------------------------------------------------------------
// uploadVideoBlobDirect — server-side Blob upload for videos
// -----------------------------------------------------------------------
export async function uploadVideoBlobDirect(
  input: UploadViaServerInput,
): Promise<ActionResult<{ publicUrl: string; key: string }>> {
  try {
    const [userId, projectId] = await Promise.all([requireSessionUserId(), requireProjectId()])

    if (input.file.byteLength > BLOB_VIDEO_MAX_BYTES) {
      return { success: false, error: 'VIDEO_TOO_LARGE_FOR_BLOB' }
    }

    const ext      = input.filename ? sanitizeExtension(input.filename) : 'mp4'
    const pathname = `uploads/${projectId}/videos/${randomUUID()}.${ext}`

    const { publicUrl, key } = await blobUpload(pathname, input.file, input.mimeType)

    await mediaRepository.create({
      projectId,
      key,
      publicUrl,
      mimeType:        input.mimeType,
      sizeBytes:       input.file.byteLength,
      name:            input.filename ?? undefined,
      nodeId:          input.nodeId,
      uploadedBy:      userId,
      storageProvider: 'blob',
    })

    return { success: true, data: { publicUrl, key } }
  } catch (err) {
    if (err instanceof Error && err.message === 'BLOB_NOT_CONFIGURED') {
      return { success: false, error: 'STORAGE_NOT_CONFIGURED' }
    }
    return { success: false, error: 'Upload failed.' }
  }
}

// -----------------------------------------------------------------------
// getActiveStorageProvider — expose active provider to client hooks
// -----------------------------------------------------------------------
export async function getActiveStorageProvider(): Promise<ActionResult<StorageProvider>> {
  try {
    const provider = await getActiveProvider()
    return { success: true, data: provider }
  } catch {
    return { success: false, error: 'PROVIDER_UNKNOWN' }
  }
}

// -----------------------------------------------------------------------
// getMediaStorageSummary
// -----------------------------------------------------------------------
export async function getMediaStorageSummary(): Promise<ActionResult<MediaStorageSummary>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const summary = await mediaRepository.getStorageSummary(projectId)
    return { success: true, data: summary }
  } catch {
    return { success: false, error: 'Failed to load storage summary.' }
  }
}

// -----------------------------------------------------------------------
// listMediaAssets — cursor-based pager for MediaLibraryPicker
// -----------------------------------------------------------------------
export async function listMediaAssets(
  input: ListMediaAssetsInput,
): Promise<ActionResult<MediaAssetsPage>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const page = await mediaRepository.listPaginated({ ...input, projectId })
    return { success: true, data: page }
  } catch {
    return { success: false, error: 'Failed to load media assets.' }
  }
}

// -----------------------------------------------------------------------
// getMediaFileNames
// -----------------------------------------------------------------------
export async function getMediaFileNames(): Promise<ActionResult<string[]>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const names = await mediaRepository.getAllFileNames(projectId)
    return { success: true, data: names }
  } catch {
    return { success: false, error: 'Failed to load media names.' }
  }
}

// -----------------------------------------------------------------------
// listMediaAssetsPaged — offset-based pager for the Media Gallery page
// -----------------------------------------------------------------------
export async function listMediaAssetsPaged(
  input: ListMediaAssetsPagedInput,
): Promise<ActionResult<MediaAssetsPagedResult>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const result = await mediaRepository.listPaginatedOffset({ ...input, projectId })
    return { success: true, data: result }
  } catch {
    return { success: false, error: 'Failed to load media assets.' }
  }
}

// -----------------------------------------------------------------------
// getMediaById
// -----------------------------------------------------------------------
export async function getMediaById(
  id: string,
): Promise<ActionResult<MediaMeta>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const record = await mediaRepository.findById(id, projectId)
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
// deleteMediaRecord — removes from storage + DB
// -----------------------------------------------------------------------
export async function deleteMediaRecord(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    await mediaRepository.delete(id, projectId)
    return { success: true }
  } catch (err) {
    if (err instanceof Error && err.message === 'MEDIA_NOT_FOUND') {
      return { success: false, error: 'NOT_FOUND' }
    }
    return { success: false, error: 'Failed to delete media record.' }
  }
}

// -----------------------------------------------------------------------
// bulkDeleteMediaRecords — removes multiple records from storage + DB
// -----------------------------------------------------------------------
export async function bulkDeleteMediaRecords(
  ids: string[],
): Promise<ActionResult<{ deleted: number; failed: number }>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    let deleted = 0
    let failed  = 0
    for (const id of ids) {
      try {
        await mediaRepository.delete(id, projectId)
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
