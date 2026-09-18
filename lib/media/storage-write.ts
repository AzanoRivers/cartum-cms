import { randomUUID } from 'node:crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client } from './r2-client'
import { blobUpload } from './blob-client'
import type { StorageProvider } from '@/types/settings'

export type RestoredMediaFile = {
  key:             string
  publicUrl:       string
  storageProvider: StorageProvider
}

/**
 * Checks whether a media URL still resolves — used to decide whether a
 * restore actually needs to re-upload a file, or can just keep reusing the
 * exact bucket URL already stored in the DB (the normal case: same
 * instance, same bucket, files never touched).
 *
 * Deliberately permissive: only a 404 or a network-level failure (DNS,
 * connection refused, timeout) counts as "dead". Anything else the server
 * answers with (200, a redirect, even 403 from a bucket that blocks HEAD
 * but serves GET) is treated as "still there" — the goal is to avoid
 * needless re-uploads, not to be a strict health check.
 */
export async function isMediaUrlReachable(url: string): Promise<boolean> {
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), 5_000)
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal })
    return res.status !== 404
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Fallback path only — call this for a media entry AFTER `isMediaUrlReachable`
 * on its original `publicUrl` came back false. Re-uploads the file (its
 * bytes extracted from a "Super export with media" .zip) to this project's
 * currently configured storage, since the original bucket/Blob account is
 * confirmed gone or unreachable.
 *
 * Tries `preferredProvider` first (the provider the file was originally
 * stored under, so it keeps using the same one when both are configured),
 * then falls back to the other provider if the preferred one isn't
 * configured for this project. Returns null if neither is configured or
 * both uploads fail — the caller decides what to do with the original
 * (now confirmed-dead) reference in that case.
 */
export async function restoreMediaFile(
  projectId:         string,
  bytes:             ArrayBuffer,
  mimeType:          string,
  preferredProvider: StorageProvider,
  originalFilename:  string,
): Promise<RestoredMediaFile | null> {
  const order: StorageProvider[] = preferredProvider === 'blob' ? ['blob', 'r2'] : ['r2', 'blob']
  const ext = originalFilename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'

  for (const provider of order) {
    try {
      if (provider === 'r2') {
        const { client, bucket, publicUrl: base } = await getR2Client(projectId)
        const key = `uploads/${projectId}/${randomUUID()}.${ext}`
        await client.send(new PutObjectCommand({
          Bucket:      bucket,
          Key:         key,
          Body:        new Uint8Array(bytes),
          ContentType: mimeType,
        }))
        return { key, publicUrl: `${base}/${key}`, storageProvider: 'r2' }
      } else {
        const pathname = `uploads/${projectId}/${randomUUID()}.${ext}`
        const { publicUrl, key } = await blobUpload(pathname, bytes, mimeType)
        return { key, publicUrl, storageProvider: 'blob' }
      }
    } catch {
      continue // this provider isn't configured or the upload failed — try the next one
    }
  }

  return null
}
