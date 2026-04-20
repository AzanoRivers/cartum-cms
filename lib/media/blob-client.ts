import { put, del } from '@vercel/blob'
import { getSetting } from '@/lib/settings/get-setting'
export { BLOB_VIDEO_MAX_BYTES } from '@/types/media'

async function getBlobToken(): Promise<string> {
  const token = await getSetting('blob_token', process.env.BLOB_READ_WRITE_TOKEN)
  if (!token) throw new Error('BLOB_NOT_CONFIGURED')
  return token
}

export async function blobUpload(
  pathname: string,
  data:     ArrayBuffer | Blob | Buffer,
  mimeType: string,
): Promise<{ publicUrl: string; key: string }> {
  const token  = await getBlobToken()
  const result = await put(pathname, data, {
    access:      'public',
    token,
    contentType: mimeType,
  })
  return { publicUrl: result.url, key: result.pathname }
}

export async function blobDelete(publicUrl: string): Promise<void> {
  const token = await getBlobToken()
  await del(publicUrl, { token })
}

export async function isBlobConfigured(): Promise<boolean> {
  const token = await getSetting('blob_token', process.env.BLOB_READ_WRITE_TOKEN)
  return Boolean(token)
}
