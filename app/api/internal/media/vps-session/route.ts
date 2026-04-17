import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSetting } from '@/lib/settings/get-setting'

/**
 * GET /api/internal/media/vps-session
 *
 * Exchanges the master VPS API key (server-only) for a short-lived session
 * token (2 h TTL) that the browser can use to call the VPS directly.
 *
 * Flow:
 *   Browser (authenticated) → this route → VPS /api/v1/auth/session-token
 *   Browser stores { vpsUrl, token } and calls VPS directly for
 *   image compression, video chunks, finalize, and status polling.
 *   No video bytes pass through Vercel.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vpsUrl = await getSetting('media_vps_url', process.env.MEDIA_VPS_URL)
  const vpsKey = await getSetting('media_vps_key', process.env.MEDIA_VPS_KEY)

  if (!vpsUrl || !vpsKey) {
    // VPS not configured — client will fall back to Vercel proxy routes
    return NextResponse.json({ skipped: true })
  }

  try {
    const res = await fetch(`${vpsUrl}/api/v1/auth/session-token`, {
      method:  'POST',
      headers: { 'X-API-Key': vpsKey },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'VPS_AUTH_FAILED' }, { status: 502 })
    }

    const { token, expires_in } = await res.json() as { token: string; expires_in: number }
    return NextResponse.json({ vpsUrl, token, expiresIn: expires_in })
  } catch {
    return NextResponse.json({ error: 'VPS_UNREACHABLE' }, { status: 502 })
  }
}
