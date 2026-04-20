import { randomUUID } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { auth } from '@/auth'
import { getSetting } from '@/lib/settings/get-setting'
import { getR2Client } from '@/lib/media/r2-client'
import { getActiveProvider } from '@/lib/media/storage-router'

/**
 * POST /api/internal/media/videos/init
 *
 * Initialises a chunked video upload session on the Optimus VPS.
 * When R2 is the active provider, also generates a presigned PUT URL and
 * passes it as destination_url so the VPS can push the compressed file
 * directly to R2 without routing bytes through Vercel.
 *
 * Body: { filename: string, total_size: number, total_chunks: number }
 * Response:
 *   { upload_id, key?, publicUrl? }  — VPS session created; key/publicUrl present when R2 presign succeeded
 *   { skipped: true }                — VPS not configured → client falls back to direct R2
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vpsUrl = await getSetting('media_vps_url', process.env.MEDIA_VPS_URL)
  const vpsKey = await getSetting('media_vps_key', process.env.MEDIA_VPS_KEY)

  if (!vpsUrl || !vpsKey) {
    return NextResponse.json({ skipped: true })
  }

  let body: { filename?: string; total_size?: number; total_chunks?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Generate a presigned R2 PUT URL so VPS can upload the compressed file directly
  let r2Key: string | undefined
  let r2PublicUrl: string | undefined
  let destinationUrl: string | undefined

  try {
    const provider = await getActiveProvider()
    if (provider === 'r2') {
      const r2Config  = await getR2Client()
      const filename  = body.filename ?? 'video.mp4'
      const ext       = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? 'mp4'
      r2Key           = `uploads/${randomUUID()}.${ext}`
      destinationUrl  = await getSignedUrl(
        r2Config.client,
        new PutObjectCommand({ Bucket: r2Config.bucket, Key: r2Key, ContentType: 'video/mp4' }),
        { expiresIn: 3600 },
      )
      r2PublicUrl = `${r2Config.publicUrl}/${r2Key}`
    }
  } catch {
    // R2 not configured or presign failed — proceed without destination_url;
    // VPS keeps the file and Vercel's legacy download path is used as fallback.
  }

  let vpsRes: Response
  try {
    vpsRes = await fetch(`${vpsUrl}/api/v1/media/videos/upload/init`, {
      method:  'POST',
      headers: {
        'X-API-Key':    vpsKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename:        body.filename     ?? 'video.mp4',
        total_size:      body.total_size   ?? 0,
        total_chunks:    body.total_chunks ?? 1,
        ...(destinationUrl ? { destination_url: destinationUrl } : {}),
      }),
    })
  } catch {
    return NextResponse.json({ error: 'VPS_UNREACHABLE' }, { status: 502 })
  }

  if (!vpsRes.ok) {
    return NextResponse.json({ error: 'VPS_ERROR', status: vpsRes.status }, { status: vpsRes.status })
  }

  const data = await vpsRes.json()
  return NextResponse.json({
    ...data,
    ...(r2Key ? { key: r2Key, publicUrl: r2PublicUrl } : {}),
  })
}
