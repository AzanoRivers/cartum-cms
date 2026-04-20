import { Readable } from 'node:stream'
import { randomUUID } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/auth'
import { getSetting } from '@/lib/settings/get-setting'
import { getR2Client } from '@/lib/media/r2-client'
import { blobUpload } from '@/lib/media/blob-client'
import { getActiveProvider } from '@/lib/media/storage-router'
import { mediaRepository } from '@/db/repositories/media.repository'

/**
 * POST /api/internal/media/videos/complete
 *
 * Final step of the video VPS pipeline:
 *   1. Download the compressed video from Optimus VPS (streaming)
 *   2. Stream it directly to Cloudflare R2 via PutObjectCommand
 *   3. Insert the media_records DB row
 *   4. Return { key, publicUrl, mimeType, sizeBytes }
 *
 * Body: { job_id: string, filename: string, mime_type: string, output_size?: number }
 *
 * Note: runs server-side only. Video bytes never go through a Server Action.
 * output_size (from the status poll) is used as ContentLength for the streaming PUT.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id as string

  let body: { job_id?: string; filename?: string; mime_type?: string; output_size?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { job_id, filename, mime_type, output_size } = body

  if (!job_id || !filename || !mime_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 422 })
  }

  const vpsUrl = await getSetting('media_vps_url', process.env.MEDIA_VPS_URL)
  const vpsKey = await getSetting('media_vps_key', process.env.MEDIA_VPS_KEY)

  if (!vpsUrl || !vpsKey) {
    return NextResponse.json({ error: 'VPS_NOT_CONFIGURED' }, { status: 503 })
  }

  // ── 1. Download compressed video from VPS ─────────────────────────────────
  let vpsRes: Response
  try {
    vpsRes = await fetch(`${vpsUrl}/api/v1/media/videos/download/${encodeURIComponent(job_id)}`, {
      headers: { 'X-API-Key': vpsKey },
    })
  } catch {
    return NextResponse.json({ error: 'VPS_UNREACHABLE' }, { status: 502 })
  }

  if (!vpsRes.ok || !vpsRes.body) {
    return NextResponse.json({ error: 'VPS_DOWNLOAD_FAILED', vpsStatus: vpsRes.status }, { status: 502 })
  }

  // Determine actual size: prefer Content-Length from VPS, fall back to client hint
  const contentLengthHeader = vpsRes.headers.get('content-length')
  const sizeBytes = contentLengthHeader
    ? parseInt(contentLengthHeader, 10)
    : (output_size ?? undefined)

  // Determine mime type from VPS Content-Type if available
  const vtContentType = vpsRes.headers.get('content-type')
  const finalMime = (vtContentType && vtContentType.startsWith('video/'))
    ? vtContentType.split(';')[0].trim()
    : mime_type

  const ext      = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? 'mp4'
  const key      = `uploads/${randomUUID()}.${ext}`
  const provider = await getActiveProvider()

  // ── 2. Upload to storage (Blob or R2) ─────────────────────────────────────
  if (provider === 'blob') {
    // Blob requires buffering — no streaming put via SDK
    let videoBuffer: Buffer
    try {
      videoBuffer = Buffer.from(await vpsRes.arrayBuffer())
    } catch {
      return NextResponse.json({ error: 'VPS_BUFFER_FAILED' }, { status: 502 })
    }

    let blobResult: { publicUrl: string; key: string }
    try {
      blobResult = await blobUpload(`uploads/videos/${key}`, videoBuffer, finalMime)
    } catch {
      return NextResponse.json({ error: 'BLOB_UPLOAD_FAILED' }, { status: 500 })
    }

    try {
      await mediaRepository.create({
        key:             blobResult.key,
        publicUrl:       blobResult.publicUrl,
        mimeType:        finalMime,
        sizeBytes:       videoBuffer.byteLength,
        name:            filename,
        uploadedBy:      userId,
        storageProvider: 'blob',
      })
    } catch {
      return NextResponse.json({ error: 'DB_SAVE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({
      key:       blobResult.key,
      publicUrl: blobResult.publicUrl,
      mimeType:  finalMime,
      sizeBytes: videoBuffer.byteLength,
    })
  }

  // ── R2 path: stream directly from VPS to R2 ───────────────────────────────
  let r2Config: Awaited<ReturnType<typeof getR2Client>>
  try {
    r2Config = await getR2Client()
  } catch {
    return NextResponse.json({ error: 'STORAGE_NOT_CONFIGURED' }, { status: 503 })
  }

  const { client, bucket, publicUrl: r2BaseUrl } = r2Config

  // Convert Web ReadableStream to Node.js Readable for the AWS SDK
  const nodeReadable = Readable.fromWeb(vpsRes.body as import('stream/web').ReadableStream)

  try {
    await client.send(new PutObjectCommand({
      Bucket:        bucket,
      Key:           key,
      Body:          nodeReadable,
      ContentType:   finalMime,
      ...(sizeBytes ? { ContentLength: sizeBytes } : {}),
    }))
  } catch {
    return NextResponse.json({ error: 'R2_UPLOAD_FAILED' }, { status: 500 })
  }

  const publicUrl = `${r2BaseUrl}/${key}`

  // ── 3. Save media record ──────────────────────────────────────────────────
  try {
    await mediaRepository.create({
      key,
      publicUrl,
      mimeType:   finalMime,
      sizeBytes:  sizeBytes ?? null,
      name:       filename,
      uploadedBy: userId,
    })
  } catch {
    return NextResponse.json({ error: 'DB_SAVE_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ key, publicUrl, mimeType: finalMime, sizeBytes: sizeBytes ?? null })
}
