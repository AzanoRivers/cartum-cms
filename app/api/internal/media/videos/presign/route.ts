import { randomUUID } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { auth } from '@/auth'
import { getR2Client } from '@/lib/media/r2-client'

/**
 * GET /api/internal/media/videos/presign?filename=video.mp4
 *
 * Generates a presigned R2 PUT URL for direct VPS → R2 upload.
 * Used in direct-VPS mode: browser fetches this first, then passes
 * destination_url to the VPS init call so the VPS can push the
 * compressed file straight to R2 without routing through Vercel.
 *
 * Response: { presignedUrl, key, publicUrl }
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const filename  = req.nextUrl.searchParams.get('filename') ?? 'video.mp4'
  const ext       = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? 'mp4'
  const key       = `uploads/${randomUUID()}.${ext}`

  let r2Config: Awaited<ReturnType<typeof getR2Client>>
  try {
    r2Config = await getR2Client()
  } catch {
    return NextResponse.json({ error: 'STORAGE_NOT_CONFIGURED' }, { status: 503 })
  }

  const { client, bucket, publicUrl: r2BaseUrl } = r2Config

  const presignedUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: 'video/mp4' }),
    { expiresIn: 3600 },
  )

  return NextResponse.json({ presignedUrl, key, publicUrl: `${r2BaseUrl}/${key}` })
}
