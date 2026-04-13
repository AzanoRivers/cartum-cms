'use client'

import { useState, useTransition, useRef } from 'react'
import { NodePanel } from '@/components/ui/organisms/NodePanel'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Icon } from '@/components/ui/atoms/Icon'
import { useUIStore } from '@/lib/stores/uiStore'
import { useNodeBoardStore } from '@/lib/stores/nodeBoardStore'
import { createContainerNode, createFieldNode } from '@/lib/actions/nodes.actions'
import type { FieldType } from '@/types/nodes'

const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: 'text',     label: 'Text',     icon: 'ALargeSmall' },
  { type: 'number',   label: 'Number',   icon: 'Hash' },
  { type: 'boolean',  label: 'Boolean',  icon: 'ToggleLeft' },
  { type: 'image',    label: 'Image',    icon: 'Image' },
  { type: 'video',    label: 'Video',    icon: 'Video' },
  { type: 'gallery',  label: 'Gallery',  icon: 'LayoutGrid' },
  { type: 'relation', label: 'Relation', icon: 'Link' },
]

export type NodeCreationPanelProps = {
  /** parentId null = root board; string = inside a container */
  parentId: string | null
}

type Step = 'type-select' | 'field-type-select' | 'name-input'
type NodeKind = 'container' | FieldType

// Grid constants for auto-positioning new nodes
const GRID_COLS  = 4
const GRID_GAP_X = 256   // px between nodes horizontally
const GRID_GAP_Y = 136   // px between rows

/**
 * Places new nodes near the current viewport center in canvas-space coordinates.
 * Using the canvas container's actual dimensions (tracked in the store) ensures
 * the center is accurate on both desktop and mobile (where headers/dock consume space).
 */
function calcNextPosition(parentId: string | null): { positionX: number; positionY: number } {
  const { nodes, offsetX, offsetY, scale, canvasWidth, canvasHeight } = useNodeBoardStore.getState()
  const siblings = nodes.filter((n) => n.parentId === parentId)
  const idx = siblings.length

  // With transform-origin:center, the canvas-space point at the viewport center is:
  //   center = canvasDim/2 - offset/scale
  // (derived from: screen = scale*(canvas - cx) + cx + offset  →  canvas = (screen-cx-offset)/scale + cx
  //  at screen = cx  →  canvas = -offset/scale + cx)
  const centerX = canvasWidth  / 2 - offsetX / scale
  const centerY = canvasHeight / 2 - offsetY / scale

  const col = idx % GRID_COLS
  const row = Math.floor(idx / GRID_COLS)

  return {
    positionX: centerX - GRID_GAP_X / 2 + col * GRID_GAP_X,
    positionY: centerY - GRID_GAP_Y / 2 + row * GRID_GAP_Y,
  }
}

export function NodeCreationPanel({ parentId }: NodeCreationPanelProps) {
  const closeCreationPanel = useUIStore((s) => s.closeCreationPanel)
  const anchorEl           = useUIStore((s) => s.creationPanelAnchorEl)
  const addNode = useNodeBoardStore((s) => s.addNode)
  const d = useUIStore((s) => s.cmsDict)

  // Wrap the stored anchor element in a stable ref so NodePanel (desktop) can
  // position the panel anchored to the DockBar "+ Create" button.
  const anchorRef = useRef<HTMLElement | null>(null)
  anchorRef.current = anchorEl

  const [step, setStep] = useState<Step>('type-select')
  const [selectedKind, setSelectedKind] = useState<NodeKind | null>(null)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const isInsideContainer = parentId !== null

  function handleClose() {
    closeCreationPanel()
    setStep('type-select')
    setSelectedKind(null)
    setName('')
    setNameError(null)
  }

  function handleSelectContainer() {
    setSelectedKind('container')
    setStep('name-input')
  }

  function handleSelectFieldType(type: FieldType) {
    setSelectedKind(type)
    setStep('name-input')
  }

  function validateName(value: string) {
    const trimmed = value.trim()
    if (!trimmed) {
      setNameError(d?.creation.errors.nameRequired ?? 'Name is required.')
      return false
    }
    // Always read from store directly — avoids stale closure
    const taken = useNodeBoardStore.getState().nodes.some(
      (n) => n.name.toLowerCase() === trimmed.toLowerCase() && n.parentId === parentId
    )
    if (taken) {
      setNameError(d?.creation.errors.nameTaken ?? 'A node with this name already exists here.')
      return false
    }
    setNameError(null)
    return true
  }

  function handleNameBlur() {
    validateName(name)
  }

  function handleSubmit() {
    if (!validateName(name)) return
    const trimmed = name.trim()

    startTransition(async () => {
      if (selectedKind === 'container') {
        const pos = calcNextPosition(parentId)
        const result = await createContainerNode({ name: trimmed, parentId, ...pos })
        if (!result.success) {
          setNameError(result.error)
          return
        }
        addNode(result.data)
      } else if (selectedKind) {
        if (!parentId) return
        const pos = calcNextPosition(parentId)
        const result = await createFieldNode({
          name: trimmed,
          parentId,
          fieldType: selectedKind as FieldType,
          ...pos,
        })
        if (!result.success) {
          setNameError(result.error)
          return
        }
        addNode(result.data)
      }
      handleClose()
    })
  }

  const stepTitle =
    step === 'type-select'       ? (d?.creation.titleTypeSelect ?? 'Create node') :
    step === 'field-type-select' ? (d?.creation.titleFieldType  ?? 'Select field type') :
                                   (d?.creation.titleName       ?? 'Name your node')

  return (
    <NodePanel
      open
      onClose={handleClose}
      anchorRef={anchorRef}
      title={stepTitle}
      width={320}
    >
      <div className="p-4">
        {/* Step 1: type select */}
        {step === 'type-select' && (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSelectContainer}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-3 text-left hover:border-primary hover:bg-surface transition-all cursor-pointer"
            >
              <Icon name="Hexagon" size="md" className="text-primary" />
              <div>
                <div className="font-mono text-sm text-text">{d?.creation.containerLabel ?? 'Container'}</div>
                <div className="text-xs text-muted">{d?.creation.containerDesc ?? 'Database table / model'}</div>
              </div>
            </button>

            {isInsideContainer && (
              <button
                onClick={() => setStep('field-type-select')}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-3 text-left hover:border-accent hover:bg-surface transition-all cursor-pointer"
              >
                <Icon name="Columns3" size="md" className="text-accent" />
                <div>
                  <div className="font-mono text-sm text-text">{d?.creation.fieldLabel ?? 'Field'}</div>
                  <div className="text-xs text-muted">{d?.creation.fieldDesc ?? 'Column / attribute'}</div>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Step 2: field type select */}
        {step === 'field-type-select' && (
          <div className="grid grid-cols-2 gap-2">
            {FIELD_TYPES.map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => handleSelectFieldType(type)}
                className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface-2 py-3 hover:border-accent hover:bg-surface transition-all cursor-pointer"
              >
                <Icon name={icon as Parameters<typeof Icon>[0]['name']} size="md" className="text-accent" />
                <span className="font-mono text-xs text-text">{d?.fieldTypePicker[type] ?? label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: name input */}
        {step === 'name-input' && (
          <div className="flex flex-col gap-4">
            <Input
              label={d?.creation.nodeName ?? 'Node name'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              placeholder={d?.creation.placeholder ?? 'e.g. blog_posts'}
              error={nameError ?? undefined}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(selectedKind === 'container' ? 'type-select' : 'field-type-select')}
                className="flex-1"
              >
                {d?.creation.back ?? 'Back'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                loading={pending}
                disabled={!name.trim() || pending}
                className="flex-1"
              >
                {d?.creation.create ?? 'Create'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </NodePanel>
  )
}

