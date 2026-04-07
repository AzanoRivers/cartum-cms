'use client'

/**
 * PUT a file to a presigned R2 URL with upload progress reporting.
 * Uses XMLHttpRequest because fetch() does not expose upload progress.
 */
export function uploadFileWithProgress(
  file:       File | Blob,
  uploadUrl:  string,
  mimeType:   string,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', mimeType)
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status < 400) resolve()
      else reject(new Error(`R2 upload failed: ${xhr.status}`))
    })
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.send(file)
  })
}
