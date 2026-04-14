import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSetting } from '@/lib/settings/get-setting'

/**
 * POST /api/internal/media/videos/finalize
 *
 * Tells the Optimus VPS that all chunks have been uploaded and to start
 * compression. Forwards the retry hint when the VPS queue is full (503).
 *
 * Body: { upload_id: string }
 *
 * Success response: { job_id: string, status: string }
 * Queue-full response: 503 { retry_after_seconds: number }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vpsUrl = await getSetting('media_vps_url', process.env.MEDIA_VPS_URL)
  const vpsKey = await getSetting('media_vps_key', process.env.MEDIA_VPS_KEY)

  if (!vpsUrl || !vpsKey) {
    return NextResponse.json({ error: 'VPS_NOT_CONFIGURED' }, { status: 503 })
  }

  let body: { upload_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.upload_id) {
    return NextResponse.json({ error: 'Missing upload_id' }, { status: 422 })
  }

  let vpsRes: Response
  try {
    vpsRes = await fetch(`${vpsUrl}/api/v1/media/videos/upload/finalize`, {
      method:  'POST',
      headers: {
        'X-API-Key':    vpsKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ upload_id: body.upload_id }),
    })
  } catch {
    return NextResponse.json({ error: 'VPS_UNREACHABLE' }, { status: 502 })
  }

  // Forward the response as-is (including 503 with retry hint)
  const data = await vpsRes.json().catch(() => ({}))
  return NextResponse.json(data, { status: vpsRes.status })
}
