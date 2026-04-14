import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSetting } from '@/lib/settings/get-setting'

/**
 * GET /api/internal/media/videos/status?job_id=<id>
 *
 * Polls the Optimus VPS for the current compression job status.
 * Called repeatedly by the client until status === 'done' | 'failed'.
 *
 * Response: { status: 'queued'|'processing'|'done'|'failed', progress_pct: number, output_size?: number }
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobId = req.nextUrl.searchParams.get('job_id')
  if (!jobId) {
    return NextResponse.json({ error: 'Missing job_id' }, { status: 422 })
  }

  const vpsUrl = await getSetting('media_vps_url', process.env.MEDIA_VPS_URL)
  const vpsKey = await getSetting('media_vps_key', process.env.MEDIA_VPS_KEY)

  if (!vpsUrl || !vpsKey) {
    return NextResponse.json({ error: 'VPS_NOT_CONFIGURED' }, { status: 503 })
  }

  let vpsRes: Response
  try {
    vpsRes = await fetch(`${vpsUrl}/api/v1/media/videos/status/${encodeURIComponent(jobId)}`, {
      headers: { 'X-API-Key': vpsKey },
    })
  } catch {
    return NextResponse.json({ error: 'VPS_UNREACHABLE' }, { status: 502 })
  }

  if (!vpsRes.ok) {
    return NextResponse.json({ error: 'VPS_STATUS_ERROR', vpsStatus: vpsRes.status }, { status: vpsRes.status })
  }

  const data = await vpsRes.json()
  return NextResponse.json(data)
}
