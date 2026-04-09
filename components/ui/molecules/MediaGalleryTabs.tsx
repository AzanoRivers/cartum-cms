'use client'

import { cva } from 'class-variance-authority'

export type MediaGalleryFilter = 'image' | 'video'

export type MediaGalleryTabsProps = {
  value:    MediaGalleryFilter
  onChange: (v: MediaGalleryFilter) => void
  imageLabel: string
  videoLabel: string
}

const tab = cva(
  'px-4 py-1.5 rounded-md font-mono text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
  {
    variants: {
      active: {
        true:  'bg-primary/15 text-primary',
        false: 'text-muted hover:text-text hover:bg-surface-2',
      },
    },
  },
)

export function MediaGalleryTabs({ value, onChange, imageLabel, videoLabel }: MediaGalleryTabsProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
      <button
        type="button"
        className={tab({ active: value === 'image' })}
        onClick={() => onChange('image')}
      >
        {imageLabel}
      </button>
      <button
        type="button"
        className={tab({ active: value === 'video' })}
        onClick={() => onChange('video')}
      >
        {videoLabel}
      </button>
    </div>
  )
}
