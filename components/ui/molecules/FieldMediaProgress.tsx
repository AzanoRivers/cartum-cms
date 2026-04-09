'use client'

export type UploadPhase = 'idle' | 'optimizing' | 'uploading'

export type FieldMediaProgressProps = {
  phase:    UploadPhase
  progress: number   // 0–100
  labels: {
    optimizing: string
    uploading:  string
  }
}

/**
 * Inline upload-progress indicator displayed inside FieldMediaContent
 * while an image or video is being optimised / uploaded.
 */
export function FieldMediaProgress({
  phase,
  progress,
  labels,
}: FieldMediaProgressProps) {
  const text =
    phase === 'optimizing'
      ? labels.optimizing
      : `${labels.uploading} ${progress}%`

  const barWidth = phase === 'optimizing' ? 20 : progress

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="h-1 w-24 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-150"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <p className="font-mono text-[10px] text-muted">{text}</p>
    </div>
  )
}
