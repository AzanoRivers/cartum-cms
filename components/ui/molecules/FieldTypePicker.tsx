'use client'

import { Icon } from '@/components/ui/atoms/Icon'
import { useUIStore } from '@/lib/stores/uiStore'
import type { FieldType } from '@/types/nodes'

const FIELD_TYPE_OPTIONS: { type: FieldType; label: string; icon: string }[] = [
  { type: 'text',     label: 'Text',     icon: 'ALargeSmall' },
  { type: 'number',   label: 'Number',   icon: 'Hash' },
  { type: 'boolean',  label: 'Boolean',  icon: 'ToggleLeft' },
  { type: 'image',    label: 'Image',    icon: 'Image' },
  { type: 'video',    label: 'Video',    icon: 'Video' },
  { type: 'relation', label: 'Relation', icon: 'Link' },
]

export type FieldTypePickerProps = {
  value: FieldType
  onChange: (type: FieldType) => void
  disabled?: boolean
  disabledReason?: string
}

export function FieldTypePicker({
  value,
  onChange,
  disabled = false,
  disabledReason,
}: FieldTypePickerProps) {
  const d = useUIStore((s) => s.cmsDict)
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        {FIELD_TYPE_OPTIONS.map(({ type, label, icon }) => {
          const isActive = value === type
          return (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(type)}
              className={[
                'flex flex-col items-center gap-1.5 rounded-lg border py-2.5 transition-all',
                disabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'cursor-pointer hover:border-accent hover:bg-surface',
                isActive
                  ? 'border-primary bg-surface shadow-[0_0_0_1px_var(--color-primary-glow)]'
                  : 'border-border bg-surface-2',
              ].join(' ')}
              aria-pressed={isActive}
            >
              <Icon
                name={icon as Parameters<typeof Icon>[0]['name']}
                size="sm"
                className={isActive ? 'text-primary' : 'text-muted'}
              />
              <span className="font-mono text-[10px] text-text leading-none">{d?.fieldTypePicker[type] ?? label}</span>
            </button>
          )
        })}
      </div>
      {disabled && disabledReason && (
        <p className="text-xs text-warning leading-tight">{disabledReason}</p>
      )}
    </div>
  )
}
