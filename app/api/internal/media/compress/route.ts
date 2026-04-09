import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSetting } from '@/lib/settings/get-setting'
import type { VpsWarning } from '@/types/media'

// Optimus-supported input formats (AVIF/GIF not accepted by the API → skip)
const OPTIMUS_SUPPORTED = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * POST /api/internal/media/compress
 *
 * Thin proxy to the Optimus VPS compression API.
 * - Receives multipart/form-data { file, out? } from the browser
 * - Forwards to Optimus, returns optimized bytes back to the browser
 * - File bytes NEVER go through a Server Action body — only this route handler
 *   acts as a forwarding pipe. R2 upload always happens via presigned PUT from the browser.
 *
 * Response variants:
 *   • Optimized bytes  → 200 + Content-Type: image/webp
 *   • Optimus skipped  → 200 + X-Vps-Skipped: true  (not configured or unsupported format)
 *   • Optimus warning  → 200 + X-Vps-Warning: <code> (file bytes unchanged, use fallback)
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const fileEntry = formData.get('file')
  if (!fileEntry || !(fileEntry instanceof Blob)) {
    return NextResponse.json({ error: 'MISSING_FILE' }, { status: 400 })
  }

  const mimeType = fileEntry.type || 'application/octet-stream'

  // Format not supported by Optimus → return skip signal, client uses Tier 1 result
  if (!OPTIMUS_SUPPORTED.has(mimeType)) {
    return new NextResponse(null, {
      status: 200,
      headers: { 'X-Vps-Skipped': 'true' },
    })
  }

  const vpsUrl = await getSetting('media_vps_url', process.env.MEDIA_VPS_URL)
  const vpsKey = await getSetting('media_vps_key', process.env.MEDIA_VPS_KEY)

  // Optimus not configured → skip
  if (!vpsUrl || !vpsKey) {
    return new NextResponse(null, {
      status: 200,
      headers: { 'X-Vps-Skipped': 'true' },
    })
  }

  // Build Optimus multipart request
  const optimusForm = new FormData()
  optimusForm.append('files', fileEntry, 'upload')
  optimusForm.append('out', 'webp')

  let optimusRes: Response
  try {
    optimusRes = await fetch(`${vpsUrl}/api/v1/media/images/compress`, {
      method:  'POST',
      headers: { 'X-API-Key': vpsKey },
      body:    optimusForm,
    })
  } catch {
    // Network error reaching Optimus → skip, client uses Tier 1 result
    return new NextResponse(null, {
      status: 200,
      headers: { 'X-Vps-Warning': 'unreachable' satisfies VpsWarning },
    })
  }

  if (optimusRes.ok || optimusRes.status === 206) {
    const blob = await optimusRes.blob()
    const headers: Record<string, string> = { 'Content-Type': 'image/webp' }
    if (optimusRes.status === 206) {
      headers['X-Vps-Warning'] = 'partial' satisfies VpsWarning
    }
    return new NextResponse(blob, { status: 200, headers })
  }

  // Optimus error codes → return warning, client falls back to Tier 1 result
  const warningMap: Partial<Record<number, VpsWarning>> = {
    401: 'auth',
    408: 'timeout',
    422: 'validation',
  }
  const warning: VpsWarning = warningMap[optimusRes.status] ?? 'unreachable'
  return new NextResponse(null, {
    status: 200,
    headers: { 'X-Vps-Warning': warning },
  })
}
