import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSetting } from '@/lib/settings/get-setting'

/**
 * POST /api/internal/media/videos/init
 *
 * Initialises a chunked video upload session on the Optimus VPS.
 * Adds X-API-Key server-side so the key never reaches the browser.
 *
 * Body: { filename: string, total_size: number, total_chunks: number }
 * Response:
 *   { upload_id: string }              — VPS session created
 *   { skipped: true }                  — VPS not configured → client falls back to direct R2
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

  let vpsRes: Response
  try {
    vpsRes = await fetch(`${vpsUrl}/api/v1/media/videos/upload/init`, {
      method:  'POST',
      headers: {
        'X-API-Key':    vpsKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename:     body.filename     ?? 'video.mp4',
        total_size:   body.total_size   ?? 0,
        total_chunks: body.total_chunks ?? 1,
      }),
    })
  } catch {
    return NextResponse.json({ error: 'VPS_UNREACHABLE' }, { status: 502 })
  }

  if (!vpsRes.ok) {
    return NextResponse.json({ error: 'VPS_ERROR', status: vpsRes.status }, { status: vpsRes.status })
  }

  const data = await vpsRes.json()
  return NextResponse.json(data)
}
