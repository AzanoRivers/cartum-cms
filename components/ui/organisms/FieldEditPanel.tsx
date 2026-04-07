'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Icon } from '@/components/ui/atoms/Icon'
import { FieldTypePicker } from '@/components/ui/molecules/FieldTypePicker'
import { useUIStore } from '@/lib/stores/uiStore'
import { useNodeBoardStore } from '@/lib/stores/nodeBoardStore'
import { updateFieldMeta, getContainerNodes } from '@/lib/actions/nodes.actions'
import type {
  ContainerNode,
  FieldNode,
  FieldType,
  NumberFieldConfig,
  TextFieldConfig,
  BooleanFieldConfig,
  RelationFieldConfig,
} from '@/types/nodes'

export type FieldEditPanelProps = {
  isStorageConfigured: boolean
  /** When true, skips the absolute overlay wrapper (for use inside BottomSheet on mobile) */
  asSheet?: boolean
}

// ── Toggle helper ─────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 cursor-pointer group"
    >
      <span
        className={[
          'relative inline-flex h-5 w-9 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-surface-2 border border-border',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-text transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </span>
      <span className="font-mono text-xs text-muted group-hover:text-text transition-colors">
        {label}
      </span>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function FieldEditPanel({ isStorageConfigured, asSheet = false }: FieldEditPanelProps) {
  const router          = useRouter()
  const editingFieldId = useUIStore((s) => s.editingFieldId)
  const closeFieldEdit  = useUIStore((s) => s.closeFieldEdit)
  const nodes           = useNodeBoardStore((s) => s.nodes)
  const setNodes        = useNodeBoardStore((s) => s.setNodes)
  const d               = useUIStore((s) => s.cmsDict)

  const field = nodes.find((n) => n.id === editingFieldId && n.type === 'field') as
    | FieldNode
    | undefined

  // ── Form state ───────────────────────────────────────────────────────────────
  const [name, setName]           = useState('')
  const [isRequired, setRequired] = useState(false)
  const [fieldType, setFieldType] = useState<FieldType>('text')
  const [hasRecords, setHasRecords] = useState(false)

  // type-specific config
  const [multiline, setMultiline]       = useState(false)
  const [maxLength, setMaxLength]       = useState('')
  const [numSubtype, setNumSubtype]     = useState<'integer' | 'float'>('integer')
  const [numMin, setNumMin]             = useState('')
  const [numMax, setNumMax]             = useState('')
  const [boolDefault, setBoolDefault]   = useState(false)
  const [trueLabel, setTrueLabel]       = useState('')
  const [falseLabel, setFalseLabel]     = useState('')
  const [relTarget, setRelTarget]       = useState('')
  const [relationType, setRelationType] = useState<'1:1' | '1:n' | 'n:m'>('1:n')

  const [allContainers, setAllContainers] = useState<ContainerNode[]>([])
  const [errors, setErrors]               = useState<Record<string, string>>({})
  const [pending, startTransition]        = useTransition()

  // ── Pre-fill form when field changes ─────────────────────────────────────────
  useEffect(() => {
    if (!field) return
    setName(field.name)
    setRequired(field.isRequired)
    setFieldType(field.fieldType)
    setErrors({})

    const cfg = field.config ?? {}

    if (field.fieldType === 'text') {
      const c = cfg as TextFieldConfig
      setMultiline(c.multiline ?? false)
      setMaxLength(c.maxLength != null ? String(c.maxLength) : '')
    } else if (field.fieldType === 'number') {
      const c = cfg as NumberFieldConfig
      setNumSubtype(c.subtype ?? 'integer')
      setNumMin(c.min != null ? String(c.min) : '')
      setNumMax(c.max != null ? String(c.max) : '')
    } else if (field.fieldType === 'boolean') {
      const c = cfg as BooleanFieldConfig
      setBoolDefault(c.defaultValue ?? false)
      setTrueLabel(c.trueLabel ?? '')
      setFalseLabel(c.falseLabel ?? '')
    } else if (field.fieldType === 'relation') {
      const c = cfg as RelationFieldConfig
      setRelTarget(c.relationTargetId ?? field.relationTargetId ?? '')
      setRelationType(c.relationType ?? '1:n')
    }
  }, [field?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load containers for relation dropdown ─────────────────────────────────────
  useEffect(() => {
    if (!editingFieldId) return
    getContainerNodes().then((res) => {
      if (res.success) setAllContainers(res.data)
    })
  }, [editingFieldId])

  if (!editingFieldId || !field) return null

  // ── Validation ────────────────────────────────────────────────────────────────
  function validate(): boolean {
    if (!field) return false
    const errs: Record<string, string> = {}
    const trimmed = name.trim()

    if (!trimmed) {
      errs.name = d?.fieldEdit.errors.nameRequired ?? 'Name is required.'
    } else if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
      errs.name = d?.fieldEdit.errors.nameInvalid ?? 'Name contains invalid characters.'
    } else {
      const taken = nodes.some(
        (n) => n.name.toLowerCase() === trimmed.toLowerCase() &&
               n.parentId === field.parentId &&
               n.id !== field.id,
      )
      if (taken) errs.name = d?.fieldEdit.errors.nameTaken ?? 'A node with this name already exists here.'
    }

    if (fieldType === 'number') {
      const minVal = numMin !== '' ? Number(numMin) : null
      const maxVal = numMax !== '' ? Number(numMax) : null
      if (minVal !== null && maxVal !== null && minVal > maxVal) {
        errs.numRange = d?.fieldEdit.number.rangeError ?? 'Min must be less than or equal to Max.'
      }
    }

    if (fieldType === 'relation' && !relTarget) {
      errs.relTarget = d?.fieldEdit.errors.relTargetRequired ?? 'Please select a relation target.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Build config payload ──────────────────────────────────────────────────────
  function buildConfig() {
    if (fieldType === 'text') {
      return {
        multiline,
        ...(maxLength !== '' ? { maxLength: Number(maxLength) } : {}),
      } satisfies TextFieldConfig
    }
    if (fieldType === 'number') {
      return {
        subtype: numSubtype,
        ...(numMin !== '' ? { min: Number(numMin) } : {}),
        ...(numMax !== '' ? { max: Number(numMax) } : {}),
      } satisfies NumberFieldConfig
    }
    if (fieldType === 'boolean') {
      return {
        defaultValue: boolDefault,
        ...(trueLabel  ? { trueLabel }  : {}),
        ...(falseLabel ? { falseLabel } : {}),
      } satisfies BooleanFieldConfig
    }
    if (fieldType === 'relation') {
      return {
        relationTargetId: relTarget,
        relationType,
      } satisfies RelationFieldConfig
    }
    return {}
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!field) return
    if (!validate()) return

    const config = buildConfig()
    const relationTargetId =
      fieldType === 'relation' ? relTarget || null : null

    startTransition(async () => {
      const result = await updateFieldMeta({
        nodeId:           field.id,
        name:             name.trim(),
        isRequired,
        fieldType,
        config,
        relationTargetId,
      })

      if (!result.success) {
        const msg = result.error
        if (msg === 'FIELD_TYPE_CHANGE_BLOCKED') {
          setHasRecords(true)
          setFieldType(field.fieldType)
          setErrors({ fieldType: d?.fieldEdit.typeChangeBlocked ?? 'This field has existing records. Delete all records first to change the type.' })
        } else if (msg === 'NODE_NAME_TAKEN') {
          setErrors({ name: d?.fieldEdit.errors.nameTaken ?? 'A node with this name already exists here.' })
        } else {
          setErrors({ global: msg ?? (d?.fieldEdit.errors.unknown ?? 'Unknown error.') })
        }
        return
      }

      // Optimistic update
      const updated = result.data
      setNodes(nodes.map((n) => (n.id === updated.id ? updated : n)))
      closeFieldEdit()
    })
  }

  // ── Type-specific config section ──────────────────────────────────────────────
  function renderTypeConfig() {
    if (fieldType === 'text') {
      return (
        <div className="flex flex-col gap-3">
          <Toggle checked={multiline} onChange={setMultiline} label={d?.fieldEdit.text.multiline ?? 'Multiline (textarea)'} />
          <Input
            label={d?.fieldEdit.text.maxLength ?? 'Max length (optional)'}
            type="number"
            min={1}
            size="sm"
            placeholder={d?.fieldEdit.text.maxLengthPlaceholder ?? 'e.g. 255'}
            value={maxLength}
            onChange={(e) => setMaxLength(e.target.value)}
          />
        </div>
      )
    }

    if (fieldType === 'number') {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-muted">{d?.fieldEdit.number.subtype ?? 'Subtype'}</span>
            <div className="flex gap-2">
              {(['integer', 'float'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNumSubtype(s)}
                  className={[
                    'flex-1 rounded-md border py-1.5 font-mono text-xs transition-all cursor-pointer',
                    numSubtype === s
                      ? 'border-primary bg-surface text-primary'
                      : 'border-border bg-surface-2 text-muted hover:border-primary',
                  ].join(' ')}
                >
                  {s === 'integer' ? (d?.fieldEdit.number.subtypeInt ?? s) : (d?.fieldEdit.number.subtypeFloat ?? s)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              label={d?.fieldEdit.number.min ?? 'Min'}
              type="number"
              size="sm"
              placeholder={d?.fieldEdit.number.minPlaceholder ?? '—'}
              value={numMin}
              onChange={(e) => setNumMin(e.target.value)}
            />
            <Input
              label={d?.fieldEdit.number.max ?? 'Max'}
              type="number"
              size="sm"
              placeholder={d?.fieldEdit.number.maxPlaceholder ?? '—'}
              value={numMax}
              onChange={(e) => setNumMax(e.target.value)}
            />
          </div>
          {errors.numRange && (
            <p className="text-xs text-danger">{errors.numRange}</p>
          )}
        </div>
      )
    }

    if (fieldType === 'boolean') {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-muted">{d?.fieldEdit.boolean.defaultValue ?? 'Default value'}</span>
            <div className="flex gap-2">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setBoolDefault(v)}
                  className={[
                    'flex-1 rounded-md border py-1.5 font-mono text-xs transition-all cursor-pointer',
                    boolDefault === v
                      ? 'border-primary bg-surface text-primary'
                      : 'border-border bg-surface-2 text-muted hover:border-primary',
                  ].join(' ')}
                >
                  {v ? 'true' : 'false'}
                </button>
              ))}
            </div>
          </div>
          <Input
            label={d?.fieldEdit.boolean.trueLabel ?? 'True label (optional)'}
            size="sm"
            placeholder={d?.fieldEdit.boolean.truePlaceholder ?? 'e.g. Active'}
            value={trueLabel}
            onChange={(e) => setTrueLabel(e.target.value)}
          />
          <Input
            label={d?.fieldEdit.boolean.falseLabel ?? 'False label (optional)'}
            size="sm"
            placeholder={d?.fieldEdit.boolean.falsePlaceholder ?? 'e.g. Inactive'}
            value={falseLabel}
            onChange={(e) => setFalseLabel(e.target.value)}
          />
        </div>
      )
    }

    if (fieldType === 'image' || fieldType === 'video') {
      const isImg    = fieldType === 'image'
      const parentId = field?.parentId
      return (
        <div className="flex flex-col gap-3">
          {/* Storage status */}
          {isStorageConfigured ? (
            <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2.5">
              <CheckCircle2 size={14} className="text-success mt-0.5 shrink-0" />
              <p className="font-mono text-xs text-success leading-relaxed">
                {isImg
                  ? (d?.fieldEdit.storage.configuredImages ?? 'Storage configured. Images will be uploaded and optimized automatically in records.')
                  : (d?.fieldEdit.storage.configuredVideos ?? 'Storage configured. Videos will be uploaded and optimized automatically in records.')}
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5">
              <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
              <p className="font-mono text-xs text-warning leading-relaxed">
                {isImg
                  ? (d?.fieldEdit.storage.notConfiguredImages ?? 'Storage is not configured. Images can be added in Settings → Storage.')
                  : (d?.fieldEdit.storage.notConfiguredVideos ?? 'Storage is not configured. Videos can be added in Settings → Storage.')}
              </p>
            </div>
          )}
          {/* Accepted formats */}
          <p className="font-mono text-xs text-muted">
            {isImg
              ? (d?.fieldEdit.storage.imageFormats ?? 'Accepted formats: WebP, JPEG (auto-optimized)')
              : (d?.fieldEdit.storage.videoFormats ?? 'Accepted formats: MP4, WebM (auto-optimized)')}
          </p>
          {/* Quick link to content records */}
          {isStorageConfigured && parentId && (
            <button
              type="button"
              onClick={() => { closeFieldEdit(); router.push(`/cms/content/${parentId}/new`) }}
              className="flex items-center gap-1.5 self-start font-mono text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              <ArrowRight size={12} />
              {d?.fieldEdit.storage.goToContent ?? `Upload ${isImg ? 'images' : 'videos'} in a new record`}
            </button>
          )}
        </div>
      )
    }

    if (fieldType === 'relation') {
      const parentId = field?.parentId ?? null
      const validContainers = allContainers.filter(
        (c) => c.id !== parentId,
      )
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs text-muted" htmlFor="rel-target">
              {d?.fieldEdit.relation.targetLabel ?? 'Target container'}
            </label>
            <select
              id="rel-target"
              value={relTarget}
              onChange={(e) => setRelTarget(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface-2 px-3 font-mono text-xs text-text outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="">{d?.fieldEdit.relation.targetPlaceholder ?? '— Select a container —'}</option>
              {validContainers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.relTarget && (
              <p className="text-xs text-danger">{errors.relTarget}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-muted">{d?.fieldEdit.relation.relationType ?? 'Relation type'}</span>
            <div className="flex gap-2">
              {(['1:1', '1:n', 'n:m'] as const).map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => setRelationType(rt)}
                  className={[
                    'flex-1 rounded-md border py-1.5 font-mono text-xs transition-all cursor-pointer',
                    relationType === rt
                      ? 'border-primary bg-surface text-primary'
                      : 'border-border bg-surface-2 text-muted hover:border-primary',
                  ].join(' ')}
                >
                  {rt}
                </button>
              ))}
            </div>
          </div>
          {relTarget && (
            <p className="font-mono text-xs text-accent">
              → {allContainers.find((c) => c.id === relTarget)?.name ?? relTarget}
            </p>
          )}
        </div>
      )
    }

    return null
  }

  const innerContent = (
    <div className="flex flex-col gap-4 p-4">
      {/* Header — only shown in sheet (bottom drawer) mode; overlay mode has its own sticky header */}
      {asSheet && (
        <div className="flex items-center justify-between border-b border-border pb-3 -mt-1">
          <span className="font-mono text-sm text-text">{d?.fieldEdit.title ?? 'Edit field'}</span>
          <button
            onClick={closeFieldEdit}
            className="text-muted hover:text-text transition-colors cursor-pointer"
            aria-label="Close"
          >
            <Icon name="X" size="sm" />
          </button>
        </div>
      )}
    <div className="flex flex-col gap-4">
            {/* Name */}
            <Input
              label={d?.fieldEdit.name ?? 'Name'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              placeholder="field_name"
            />

            {/* Required toggle */}
            <Toggle
              checked={isRequired}
              onChange={setRequired}
              label={d?.fieldEdit.requiredToggle ?? 'Required field'}
            />

            {/* Field type picker */}
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-xs text-muted">{d?.fieldEdit.fieldType ?? 'Field type'}</span>
              <FieldTypePicker
                value={fieldType}
                onChange={(t) => {
                  setFieldType(t)
                  setHasRecords(false)
                  setErrors((prev) => ({ ...prev, fieldType: '' }))
                }}
                disabled={hasRecords}
                disabledReason={
                  hasRecords
                    ? (d?.fieldEdit.typeChangeBlocked ?? 'This field has existing records. Delete all records first to change the type.')
                    : errors.fieldType || undefined
                }
              />
              {!hasRecords && errors.fieldType && (
                <p className="text-xs text-danger">{errors.fieldType}</p>
              )}
            </div>

            {/* Type-specific config */}
            <div className="border-t border-border pt-3">
              {renderTypeConfig()}
            </div>

            {/* Global error */}
            {errors.global && (
              <p className="text-xs text-danger">{errors.global}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={closeFieldEdit}
                disabled={pending}
              >
                {d?.fieldEdit.cancel ?? 'Cancel'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={handleSubmit}
                disabled={pending}
              >
                {pending ? (d?.fieldEdit.saving ?? 'Saving…') : (d?.fieldEdit.save ?? 'Save')}
              </Button>
            </div>
    </div>
    </div>
  )

  if (asSheet) {
    return <VHSTransition duration="fast">{innerContent}</VHSTransition>
  }

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={d?.fieldEdit.ariaLabel ?? 'Edit field'}
      onClick={(e) => { if (e.target === e.currentTarget) closeFieldEdit() }}
    >
      <VHSTransition duration="fast">
        <div className="w-80 rounded-xl border border-border bg-surface shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sticky top-0 bg-surface z-10">
            <span className="font-mono text-sm text-text">{d?.fieldEdit.title ?? 'Edit field'}</span>
            <button
              onClick={closeFieldEdit}
              className="text-muted hover:text-text transition-colors cursor-pointer"
              aria-label="Close"
            >
              <Icon name="X" size="sm" />
            </button>
          </div>
          {innerContent}
        </div>
      </VHSTransition>
    </div>
  )
}
