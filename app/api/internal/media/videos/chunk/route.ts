import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSetting } from '@/lib/settings/get-setting'

/**
 * POST /api/internal/media/videos/chunk
 *
 * Proxy: buffers the browser's multipart/form-data body and forwards it
 * byte-for-byte to the Optimus VPS with X-API-Key injected.
 *
 * Why arrayBuffer instead of streaming (req.body + duplex:'half'):
 *   Next.js 15+ uses undici internally. When the global fetch is called from
 *   a route handler with a ReadableStream body + duplex:'half', undici throws
 *   before opening the connection (502 at the proxy level). Buffering with
 *   arrayBuffer() avoids this entirely and is acceptable for ≤90 MB chunks.
 *
 * Why arrayBuffer instead of formData() parse + reconstruct:
 *   undici's FormData parser throws on large binary parts (400 FORM_PARSE_ERROR).
 *   Buffering the raw bytes and forwarding the original Content-Type (which
 *   already contains the correct boundary) is the safest approach.
 *
 * Body fields expected (multipart/form-data, set by browser automatically):
 *   upload_id   — string UUID from /init
 *   chunk_index — integer (0-based)
 *   chunk       — binary file blob, max 90 MB
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

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  let body: ArrayBuffer
  try {
    body = await req.arrayBuffer()
  } catch (err) {
    console.error('[chunk] Failed to read request body:', err)
    return NextResponse.json({ error: 'BODY_READ_ERROR' }, { status: 400 })
  }

  // Do NOT set Content-Length — let undici derive it from the ArrayBuffer.
  // Forwarding the original Content-Type preserves the multipart boundary.
  let vpsRes: Response
  try {
    vpsRes = await fetch(`${vpsUrl}/api/v1/media/videos/upload/chunk`, {
      method:  'POST',
      headers: {
        'X-API-Key':    vpsKey,
        'Content-Type': contentType,
      },
      body,
    })
  } catch (err) {
    console.error('[chunk] VPS fetch threw:', err)
    return NextResponse.json({ error: 'VPS_UNREACHABLE' }, { status: 502 })
  }

  if (!vpsRes.ok) {
    const text = await vpsRes.text().catch(() => '')
    console.error(`[chunk] VPS returned ${vpsRes.status}:`, text)
    return NextResponse.json(
      { error: 'VPS_CHUNK_ERROR', detail: text },
      { status: vpsRes.status },
    )
  }

  const data = await vpsRes.json().catch(() => ({}))
  return NextResponse.json(data)
}
