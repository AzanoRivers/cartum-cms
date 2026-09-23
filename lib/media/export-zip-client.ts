// Client-side only: builds a backup .zip (database.json + media files) by
// fetching each media file's publicUrl directly from the browser (Cloudflare
// R2 / Vercel Blob), never through a Vercel function. A file that fails to
// fetch (dead link, CORS, network) is skipped, but callers get a `failed`
// count back instead of a silently-incomplete zip — a wrong bucket CORS
// config or a custom domain that doesn't forward CORS headers used to
// disappear entire batches of files with zero indication to the admin.

export type BackupMediaItem = {
  publicUrl: string
  mimeType:  string
  key:       string
  id:        string
}

export type MediaZipResult = {
  blob:   Blob
  total:  number
  failed: number
}

const CONCURRENCY      = 6
const FETCH_TIMEOUT_MS = 30_000

export async function buildBackupZip(databaseJson: string, mediaList: BackupMediaItem[]): Promise<MediaZipResult> {
  const { zipSync, strToU8 } = await import('fflate')
  const files: Record<string, Uint8Array> = {
    'database.json': strToU8(databaseJson),
  }

  let failed = 0
  for (let i = 0; i < mediaList.length; i += CONCURRENCY) {
    await Promise.all(
      mediaList.slice(i, i + CONCURRENCY).map(async (m) => {
        try {
          const r = await fetch(m.publicUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
          if (!r.ok) { failed++; return }
          const buf      = await r.arrayBuffer()
          const folder   = m.mimeType?.startsWith('video/') ? 'videos' : 'images'
          const filename = m.key.split('/').pop() || m.id
          files[`${folder}/${filename}`] = new Uint8Array(buf)
        } catch (err) {
          failed++
          console.warn(`[buildBackupZip] Could not fetch media "${m.key}" from ${m.publicUrl}:`, err)
        }
      }),
    )
  }

  const zipped = zipSync(files, { level: 0 })
  return {
    blob:  new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' }),
    total: mediaList.length,
    failed,
  }
}
