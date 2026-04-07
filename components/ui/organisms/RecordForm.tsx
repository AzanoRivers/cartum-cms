'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/lib/stores/uiStore'
import { createRecord, updateRecord } from '@/lib/actions/records.actions'
import { Input } from '@/components/ui/atoms/Input'
import { Button } from '@/components/ui/atoms/Button'
import { ImageUploadField } from '@/components/ui/molecules/ImageUploadField'
import { VideoUploadField } from '@/components/ui/molecules/VideoUploadField'
import { RelationSelectField } from '@/components/ui/molecules/RelationSelectField'
import type { FieldNode, NumberFieldConfig, BooleanFieldConfig } from '@/types/nodes'
import type { ContentRecord, RecordValue } from '@/types/records'

export type RecordFormProps = {
  nodeId:              string
  fields:              FieldNode[]
  isStorageConfigured: boolean
  initial?:            ContentRecord
  canUpdate?:          boolean
}

function buildInitialData(fields: FieldNode[], initial?: ContentRecord): Record<string, RecordValue> {
  const data: Record<string, RecordValue> = {}
  for (const f of fields) {
    const existing = initial?.data[f.name]
    if (existing !== undefined) {
      data[f.name] = existing
    } else if (f.defaultValue !== null) {
      data[f.name] = f.defaultValue
    } else {
      data[f.name] = null
    }
  }
  return data
}

export function RecordForm({
  nodeId,
  fields,
  isStorageConfigured,
  initial,
  canUpdate = true,
}: RecordFormProps) {
  const d      = useUIStore((s) => s.cmsDict)
  const router = useRouter()

  const sortedFields = [...fields].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const [data, setData]     = useState<Record<string, RecordValue>>(() => buildInitialData(sortedFields, initial))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  function setValue(name: string, value: RecordValue) {
    setData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}

    for (const f of sortedFields) {
      const v = data[f.name]

      if (f.isRequired && (v === null || v === undefined || v === '')) {
        errs[f.name] = d?.content.form.errors.required ?? 'This field is required.'
        continue
      }

      if (f.fieldType === 'number' && v !== null && v !== '') {
        const num = Number(v)
        if (isNaN(num)) {
          errs[f.name] = d?.content.form.errors.invalidNumber ?? 'Must be a valid number.'
          continue
        }
        const cfg = f.config as NumberFieldConfig | null
        if (cfg) {
          if (cfg.min !== undefined && num < cfg.min) {
            errs[f.name] = d?.content.form.errors.numberRange ?? 'Number out of range.'
            continue
          }
          if (cfg.max !== undefined && num > cfg.max) {
            errs[f.name] = d?.content.form.errors.numberRange ?? 'Number out of range.'
            continue
          }
        }
      }

      if (f.fieldType === 'relation' && f.isRequired && !v) {
        errs[f.name] = d?.content.form.errors.relRequired ?? 'Please select a related record.'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    startTransition(async () => {
      const result = initial
        ? await updateRecord(nodeId, initial.id, { data })
        : await createRecord(nodeId, { data })

      if (result.success) {
        router.push(`/cms/content/${nodeId}`)
      } else {
        setErrors({ _form: result.error ?? (d?.content.form.errors.unknown ?? 'An error occurred.') })
      }
    })
  }

  function renderField(field: FieldNode) {
    const val = data[field.name]
    const err = errors[field.name]

    switch (field.fieldType) {
      case 'text': {
        const isMultiline = (field.config as { multiline?: boolean } | null)?.multiline
        if (isMultiline) {
          return (
            <div key={field.id} className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-muted">{field.name}</label>
              <textarea
                value={(val as string) ?? ''}
                onChange={(e) => setValue(field.name, e.target.value)}
                rows={4}
                className="rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-text outline-none focus:border-primary transition-colors resize-y"
              />
              {err && <p className="text-xs text-danger">{err}</p>}
            </div>
          )
        }
        return (
          <Input
            key={field.id}
            label={field.name}
            size="sm"
            value={(val as string) ?? ''}
            onChange={(e) => setValue(field.name, e.target.value)}
            error={err}
          />
        )
      }

      case 'number': {
        const cfg = field.config as NumberFieldConfig | null
        return (
          <Input
            key={field.id}
            label={field.name}
            size="sm"
            type="number"
            step={cfg?.subtype === 'float' ? 'any' : '1'}
            min={cfg?.min}
            max={cfg?.max}
            value={(val as number | '') ?? ''}
            onChange={(e) => setValue(field.name, e.target.value === '' ? null : Number(e.target.value))}
            error={err}
          />
        )
      }

      case 'boolean': {
        const cfg    = field.config as BooleanFieldConfig | null
        const isOn   = val === true || val === 'true'
        const onLbl  = cfg?.trueLabel  ?? 'Yes'
        const offLbl = cfg?.falseLabel ?? 'No'
        return (
          <div key={field.id} className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-muted">{field.name}</label>
            <button
              type="button"
              role="switch"
              aria-checked={isOn}
              onClick={() => setValue(field.name, !isOn)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isOn ? 'bg-primary' : 'bg-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isOn ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              <span className="sr-only">{isOn ? onLbl : offLbl}</span>
            </button>
            <span className="font-mono text-[10px] text-muted">{isOn ? onLbl : offLbl}</span>
            {err && <p className="text-xs text-danger">{err}</p>}
          </div>
        )
      }

      case 'image':
        return (
          <ImageUploadField
            key={field.id}
            label={field.name}
            value={(val as string | null) ?? null}
            onChange={(url) => setValue(field.name, url)}
            isStorageConfigured={isStorageConfigured}
            error={err}
          />
        )

      case 'video':
        return (
          <VideoUploadField
            key={field.id}
            label={field.name}
            value={(val as string | null) ?? null}
            onChange={(url) => setValue(field.name, url)}
            isStorageConfigured={isStorageConfigured}
            error={err}
          />
        )

      case 'relation':
        return (
          <RelationSelectField
            key={field.id}
            label={field.name}
            targetNodeId={field.relationTargetId!}
            value={(val as string | null) ?? null}
            onChange={(id) => setValue(field.name, id)}
            error={err}
          />
        )

      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">
      {sortedFields.map((f) => renderField(f))}

      {errors._form && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-4 py-2 font-mono text-xs text-danger">
          {errors._form}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!canUpdate}
          loading={isPending}
        >
          {isPending
            ? (d?.content.form.saving ?? 'Saving…')
            : (d?.content.form.save ?? 'Save')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => router.push(`/cms/content/${nodeId}`)}
        >
          {d?.content.form.discard ?? 'Discard'}
        </Button>
      </div>
    </form>
  )
}
