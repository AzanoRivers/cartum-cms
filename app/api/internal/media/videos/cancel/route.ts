import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSetting } from '@/lib/settings/get-setting'

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { upload_id } = body as { upload_id?: string }

  if (!upload_id) {
    return NextResponse.json({ error: 'MISSING_UPLOAD_ID' }, { status: 400 })
  }

  const vpsUrl = await getSetting('media_vps_url', process.env.MEDIA_VPS_URL)
  const vpsKey = await getSetting('media_vps_key', process.env.MEDIA_VPS_KEY)

  if (!vpsUrl || !vpsKey) {
    return NextResponse.json({ error: 'VPS_NOT_CONFIGURED' }, { status: 503 })
  }

  const vpsRes = await fetch(
    `${vpsUrl}/api/v1/media/videos/upload/${encodeURIComponent(upload_id)}`,
    { method: 'DELETE', headers: { 'X-API-Key': vpsKey } },
  ).catch(() => null)

  if (!vpsRes?.ok) {
    // 404 means already cleaned up — treat as success from client's perspective
    if (vpsRes?.status === 404) {
      return NextResponse.json({ cancelled: true, already_gone: true })
    }
    return NextResponse.json({ error: 'CANCEL_FAILED' }, { status: vpsRes?.status ?? 502 })
  }

  return NextResponse.json(await vpsRes.json())
}
