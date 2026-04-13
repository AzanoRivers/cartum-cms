'use client'

/**
 * SortableGalleryGrid — wrapper sobre @dnd-kit para reordenar tiles de galería.
 *
 * Reglas de arquitectura:
 * - Todo @dnd-kit pasa por /components/external/dnd/
 * - Este componente es un wrapper puro: no tiene lógica de negocio
 * - El estado vive en el padre (FieldGalleryContent)
 */

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

export { arrayMove }

// ── SortableItem ──────────────────────────────────────────────────────────────

export type SortableItemProps = {
  id:       string
  children: (props: { isDragging: boolean; listeners: ReturnType<typeof useSortable>['listeners']; attributes: ReturnType<typeof useSortable>['attributes'] }) => ReactNode
}

export function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ isDragging, listeners, attributes })}
    </div>
  )
}

// ── SortableGalleryGrid ───────────────────────────────────────────────────────

export type SortableGalleryGridProps = {
  ids:      string[]
  onReorder: (newIds: string[]) => void
  children: ReactNode
}

export function SortableGalleryGrid({ ids, onReorder, children }: SortableGalleryGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}
