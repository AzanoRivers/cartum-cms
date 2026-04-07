import type { OptimizeResult } from '@/types/media'

/**
 * Tier 1 client-side video optimization via ffmpeg.wasm.
 * Loaded on-demand — no bundle cost unless a video field is used.
 * Only processes files > 20 MB. Smaller files are skipped (not a failure).
 * Always resolves — returns original file + tier1Failed=true on error.
 */
export async function optimizeVideo(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<OptimizeResult> {
  if (file.size < 20 * 1024 * 1024) return { file, tier1Failed: false }

  try {
    const { FFmpeg }   = await import('@ffmpeg/ffmpeg')
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util')

    const ffmpeg = new FFmpeg()

    ffmpeg.on('progress', ({ progress }) => {
      onProgress?.(Math.round(progress * 100))
    })

    // Load ffmpeg core from CDN (required for SharedArrayBuffer + COOP/COEP)
    await ffmpeg.load({
      coreURL:   await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.9/dist/umd/ffmpeg-core.js', 'text/javascript'),
      wasmURL:   await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.9/dist/umd/ffmpeg-core.wasm', 'application/wasm'),
      workerURL: await toBlobURL('https://unpkg.com/@ffmpeg/core-mt@0.12.9/dist/umd/ffmpeg-core.worker.js', 'text/javascript'),
    })

    await ffmpeg.writeFile('input', await fetchFile(file))
    await ffmpeg.exec([
      '-i',    'input',
      '-vcodec', 'libx264',
      '-crf',    '28',
      '-preset', 'fast',
      '-movflags', '+faststart',
      'output.mp4',
    ])

    const data    = await ffmpeg.readFile('output.mp4') as Uint8Array
    const outName = file.name.replace(/\.\w+$/, '.mp4')
    return { file: new File([data.buffer as ArrayBuffer], outName, { type: 'video/mp4' }), tier1Failed: false }
  } catch {
    return { file, tier1Failed: true }
  }
}
