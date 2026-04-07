'use client'

import { memo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/atoms/Icon'
import { Badge } from '@/components/ui/atoms/Badge'
import { FullscreenLoader } from '@/components/ui/atoms/FullscreenLoader'
import { ConnectorPort } from '@/components/ui/molecules/ConnectorPort'
import { useUIStore } from '@/lib/stores/uiStore'
import type { AnyNode, FieldType, PortSide } from '@/types/nodes'

const FIELD_TYPE_ICON: Record<FieldType, string> = {
  text:     'ALargeSmall',
  number:   'Hash',
  boolean:  'ToggleLeft',
  image:    'Image',
  video:    'Video',
  relation: 'Link',
} as const

const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text:     'text',
  number:   'number',
  boolean:  'boolean',
  image:    'image',
  video:    'video',
  relation: 'relation',
} as const

// icon color per type
const FIELD_TYPE_ICON_CLASS: Record<FieldType, string> = {
  text:     'text-muted',
  number:   'text-muted',
  boolean:  'text-muted',
  image:    'text-accent',
  video:    'text-accent',
  relation: 'text-primary',
} as const

const PORT_SIDES: PortSide[] = ['top', 'right', 'bottom', 'left']

export type NodeCardProps = {
  node: AnyNode
  selected?: boolean
  isValidTarget?: boolean
  connectionCount?: number
  fieldCount?: number
  recordCount?: number
  onSelect?: (id: string) => void
  onPortDragStart?: (nodeId: string, side: PortSide) => void
  onEditField?: (nodeId: string) => void
}

function NodeCardInner({
  node,
  selected = false,
  isValidTarget = false,
  connectionCount = 0,
  fieldCount = 0,
  recordCount = 0,
  onSelect,
  onPortDragStart,
  onEditField,
}: NodeCardProps) {
  const router = useRouter()
  const d = useUIStore((s) => s.cmsDict)
  const [isNavigating, setIsNavigating] = useState(false)

  function handleClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-port]')) return
    onSelect?.(node.id)
    if (node.type === 'container') {
      setIsNavigating(true)
      router.push(`/cms/board/${node.id}`)
    } else {
      onEditField?.(node.id)
    }
  }

  const baseClasses =
    'group relative rounded-lg border bg-surface p-3 cursor-pointer select-none transition-all duration-150 contain-card'

  const stateClasses = isValidTarget
    ? 'border-primary shadow-[0_0_0_2px_var(--color-primary),0_0_20px_var(--color-primary-glow)]'
    : selected
      ? 'border-primary shadow-[0_0_0_1px_var(--color-primary-glow),0_0_12px_var(--color-primary-glow)]'
      : 'border-border hover:border-primary hover:shadow-[0_0_0_1px_var(--color-primary-glow)]'

  if (node.type === 'container') {
    return (
      <>
        {isNavigating && createPortal(<FullscreenLoader />, document.body)}
      <article
        onClick={handleClick}
        className={`${baseClasses} ${stateClasses} min-w-52`}
        aria-selected={selected}
      >
        {/* Connector ports — visible on group-hover */}
        {onPortDragStart && PORT_SIDES.map((side) => (
          <ConnectorPort
            key={side}
            nodeId={node.id}
            side={side}
            onDragStart={onPortDragStart}
          />
        ))}

        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="Hexagon" size="md" className="text-primary shrink-0" />
            <span className="font-mono text-sm text-text truncate">{node.name}</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {fieldCount > 0 && (
            <Badge variant="muted" size="sm">{fieldCount} {d?.nodeCard.fields ?? 'fields'}</Badge>
          )}
          {recordCount > 0 && (
            <Badge variant="muted" size="sm">{recordCount} {d?.nodeCard.records ?? 'records'}</Badge>
          )}
          {connectionCount > 0 && (
            <Badge variant="primary" size="sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent mr-1" />
              {connectionCount} {d?.nodeCard.connections ?? 'connections'}
            </Badge>
          )}
        </div>
      </article>
      </>
    )
  }

  // Field node
  const iconName     = FIELD_TYPE_ICON[node.fieldType] as Parameters<typeof Icon>[0]['name']
  const iconClass    = FIELD_TYPE_ICON_CLASS[node.fieldType]
  return (
    <article
      onClick={handleClick}
      className={`${baseClasses} ${stateClasses} min-w-44`}
      aria-selected={selected}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon name={iconName} size="md" className={`${iconClass} shrink-0`} />
        <span className="font-mono text-sm text-text truncate">{node.name}</span>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <Badge variant="muted" size="sm">{d?.nodeCard.types[node.fieldType] ?? FIELD_TYPE_LABEL[node.fieldType]}</Badge>
        {node.isRequired && <Badge variant="warning" size="sm">{d?.nodeCard.required ?? '*'}</Badge>}
      </div>
    </article>
  )
}

function areNodeCardPropsEqual(prev: NodeCardProps, next: NodeCardProps): boolean {
  return (
    prev.node.id          === next.node.id          &&
    prev.node.name        === next.node.name        &&
    prev.node.positionX   === next.node.positionX   &&
    prev.node.positionY   === next.node.positionY   &&
    prev.selected         === next.selected         &&
    prev.isValidTarget    === next.isValidTarget    &&
    prev.connectionCount  === next.connectionCount  &&
    prev.fieldCount       === next.fieldCount       &&
    prev.recordCount      === next.recordCount
  )
}

export const NodeCard = memo(NodeCardInner, areNodeCardPropsEqual)
