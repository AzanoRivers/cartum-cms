import imageCompression from 'browser-image-compression'
import type { OptimizeResult } from '@/types/media'

/**
 * Tier 1 client-side image compression.
 * Always resolves — returns original file + tier1Failed=true on error.
 */
export async function optimizeImage(file: File): Promise<OptimizeResult> {
  if (!file.type.startsWith('image/')) return { file, tier1Failed: false }
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB:        2,
      maxWidthOrHeight: 3840,
      // useWebWorker: false — avoids hanging under COEP:credentialless headers
      useWebWorker:     false,
      // Always output WebP — highest compression, always required by the CMS
      fileType:         'image/webp',
    })
    return { file: compressed, tier1Failed: false }
  } catch {
    return { file, tier1Failed: true }
  }
}
