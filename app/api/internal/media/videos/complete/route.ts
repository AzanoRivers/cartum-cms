import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { HeadObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/auth'
import { getR2Client } from '@/lib/media/r2-client'
import { mediaRepository } from '@/db/repositories/media.repository'
import { ACTIVE_PROJECT_COOKIE } from '@/lib/auth/constants'

/**
 * POST /api/internal/media/videos/complete
 *
 * Fast path only: VPS uploaded the compressed video directly to R2 via destination_url.
 * Verifies the object exists in R2 (HeadObject) then saves the DB record.
 *
 * Body: { key, publicUrl, filename, mime_type, sizeBytes? }
 *
 * The legacy path where Vercel downloaded from VPS and re-uploaded to storage has been
 * removed — bytes must never transit Vercel. If VPS cannot push to R2 directly, the
 * upload is retried as a direct presigned-URL upload without VPS optimization.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId      = session.user.id as string
  const cookieStore = await cookies()
  const projectId   = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? session.user.currentProjectId
  if (!projectId) {
    return NextResponse.json({ error: 'No project context' }, { status: 403 })
  }

  let body: {
    key?:       string
    publicUrl?: string
    sizeBytes?: number
    filename?:  string
    mime_type?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { key, publicUrl, filename, mime_type, sizeBytes } = body

  if (!key || !publicUrl || !filename || !mime_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 422 })
  }

  let r2Config: Awaited<ReturnType<typeof getR2Client>>
  try {
    r2Config = await getR2Client()
  } catch {
    return NextResponse.json({ error: 'STORAGE_NOT_CONFIGURED' }, { status: 503 })
  }

  try {
    await r2Config.client.send(new HeadObjectCommand({ Bucket: r2Config.bucket, Key: key }))
  } catch {
    return NextResponse.json({ error: 'R2_OBJECT_NOT_FOUND' }, { status: 404 })
  }

  try {
    await mediaRepository.create({
      key,
      publicUrl,
      mimeType:        mime_type,
      sizeBytes:       sizeBytes ?? null,
      name:            filename,
      uploadedBy:      userId,
      storageProvider: 'r2',
      projectId,
    })
  } catch {
    return NextResponse.json({ error: 'DB_SAVE_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ key, publicUrl, mimeType: mime_type, sizeBytes: sizeBytes ?? null })
}
