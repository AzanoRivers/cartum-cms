import { type NextRequest, NextResponse } from 'next/server'
import { zip } from 'fflate'
import { auth } from '@/auth'
import { mediaRepository } from '@/db/repositories/media.repository'

const MAX_FILES     = 50
const FETCH_TIMEOUT = 30_000 // 30s per file

/**
 * POST /api/internal/media/bulk-download
 *
 * Fetches the requested media files from their public R2 URLs (server-side,
 * no CORS restrictions), packages them into a ZIP using fflate (level 0 =
 * store-only, since WebP/JPEG/MP4 are already compressed), and streams the
 * ZIP back to the browser as a single download.
 *
 * Body: { ids: string[] }  — max 50 IDs
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let ids: string[]
  try {
    const body = await request.json()
    ids = Array.isArray(body?.ids) ? (body.ids as string[]) : []
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: 'No IDs provided' }, { status: 422 })
  }
  if (ids.length > MAX_FILES) {
    return NextResponse.json({ error: `Maximum ${MAX_FILES} files per download` }, { status: 422 })
  }

  // ── Resolve records from DB ────────────────────────────────────────────────
  const records = await mediaRepository.findByIds(ids)
  if (records.length === 0) {
    return NextResponse.json({ error: 'No records found' }, { status: 404 })
  }

  // ── Fetch file bytes from R2 public URLs ──────────────────────────────────
  // Server-to-R2: no CORS restriction. Run in parallel.
  const fileEntries = await Promise.all(
    records.map(async (record) => {
      try {
        const res = await fetch(record.publicUrl, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        })
        if (!res.ok) return null
        const buf = await res.arrayBuffer()
        const basename = record.key.split('/').pop() ?? `file_${record.id}`
        return { basename, buf }
      } catch {
        return null
      }
    }),
  )

  // ── Build ZIP file map, deduplicating filenames ────────────────────────────
  const files: Record<string, Uint8Array> = {}
  const seen  = new Map<string, number>()

  for (const entry of fileEntries) {
    if (!entry) continue
    let { basename } = entry

    if (seen.has(basename)) {
      const n    = seen.get(basename)! + 1
      seen.set(basename, n)
      const dot  = basename.lastIndexOf('.')
      const base = dot >= 0 ? basename.slice(0, dot) : basename
      const ext  = dot >= 0 ? basename.slice(dot)    : ''
      basename   = `${base}_${n}${ext}`
    } else {
      seen.set(basename, 0)
    }

    files[basename] = new Uint8Array(entry.buf)
  }

  if (Object.keys(files).length === 0) {
    return NextResponse.json({ error: 'Could not fetch any files' }, { status: 502 })
  }

  // ── Create ZIP (level 0 = store, already-compressed media) ────────────────
  const zipBuffer = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 0 }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  const count = Object.keys(files).length
  const name  = count === 1
    ? Object.keys(files)[0]
    : `media_${count}_files.zip`

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length':      String(zipBuffer.byteLength),
    },
  })
}
