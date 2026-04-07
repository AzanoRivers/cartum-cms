'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, AlertCircle, Trash2, X, FolderOpen, Link2, FileStack, ArrowLeftRight } from 'lucide-react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { DeletionRisk, RiskFactor } from '@/types/integrity'

export type DeleteDialogDict = {
  title:                  string
  warnMessage:            string
  dangerMessage:          string
  cancel:                 string
  confirm:                string
  confirmDanger:          string
  deleting:               string
  factorChildren:         string
  factorConnections:      string
  factorRecordsContainer: string
  factorRecordsField:     string
  factorRelations:        string
}

export type DeleteConfirmDialogProps = {
  risk:       DeletionRisk
  onConfirm:  () => void
  onCancel:   () => void
  isPending?: boolean
  d?:         DeleteDialogDict
}

const FALLBACK: DeleteDialogDict = {
  title:                  'Delete "{name}"?',
  warnMessage:            'This will remove related data and cannot be undone.',
  dangerMessage:          'This has dangerous consequences and cannot be undone.',
  cancel:                 'Cancel',
  confirm:                'Confirm delete',
  confirmDanger:          'Yes, delete anyway',
  deleting:               'Deleting…',
  factorChildren:         '{count} field(s) inside this node',
  factorConnections:      '{count} connection(s) to other nodes',
  factorRecordsContainer: '{count} record(s) stored in this node',
  factorRecordsField:     '{count} record(s) in parent node will lose this field',
  factorRelations:        '{count} relation field(s) pointing here',
}

const FACTOR_ICONS: Record<RiskFactor['kind'], React.ReactNode> = {
  children:       <FolderOpen     size={13} strokeWidth={1.8} />,
  connections:    <Link2          size={13} strokeWidth={1.8} />,
  records:        <FileStack      size={13} strokeWidth={1.8} />,
  relation_fields:<ArrowLeftRight size={13} strokeWidth={1.8} />,
}

function getFactorLabel(
  factor: RiskFactor,
  entityType: 'container' | 'field',
  d: DeleteDialogDict,
): string {
  const c = String(factor.count)
  switch (factor.kind) {
    case 'children':        return d.factorChildren.replace('{count}', c)
    case 'connections':     return d.factorConnections.replace('{count}', c)
    case 'records':         return (entityType === 'field'
      ? d.factorRecordsField
      : d.factorRecordsContainer
    ).replace('{count}', c)
    case 'relation_fields': return d.factorRelations.replace('{count}', c)
  }
}

export function DeleteConfirmDialog({
  risk,
  onConfirm,
  onCancel,
  isPending = false,
  d: dict,
}: DeleteConfirmDialogProps) {
  const d = dict ?? FALLBACK
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { cancelRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const isDanger = risk.level === 'danger'
  const title    = d.title.replace('{name}', risk.entityName)

  // Theme-aware accent colours based on risk level
  const accentBar   = isDanger ? 'bg-danger'             : 'bg-amber-500'
  const iconBg      = isDanger ? 'bg-danger/10'          : 'bg-amber-500/10'
  const iconColor   = isDanger ? 'text-danger'           : 'text-amber-400'
  const pillBorder  = isDanger ? 'border-danger/20'      : 'border-amber-500/20'
  const pillBg      = isDanger ? 'bg-danger/5'           : 'bg-amber-500/5'
  const pillText    = isDanger ? 'text-danger/80'        : 'text-amber-400/90'
  const confirmBtn  = 'bg-danger hover:bg-danger/85 text-white border border-danger/60'

  return (
    <>
      {/* Invisible click-away — no dark backdrop */}
      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={onCancel} />

      {/* Floating panel — same presentation as Settings / Help */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <VHSTransition duration="fast" className="w-full max-w-sm mx-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="pointer-events-auto relative w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Risk-level accent bar */}
            <div className={`h-0.5 w-full ${accentBar}`} />

            {/* Header */}
            <div className="flex items-start gap-3 px-5 pt-5 pb-0">
              {/* Icon badge */}
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
                {isDanger
                  ? <AlertCircle   size={18} strokeWidth={2} />
                  : <AlertTriangle size={18} strokeWidth={2} />
                }
              </span>

              <div className="flex-1 min-w-0 pt-0.5">
                <h2
                  id="delete-dialog-title"
                  className="font-mono text-sm font-semibold text-text leading-snug"
                >
                  {title}
                </h2>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                  {isDanger ? d.dangerMessage : d.warnMessage}
                </p>
              </div>

              <button
                onClick={onCancel}
                className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer font-mono text-xs"
                aria-label={d.cancel}
              >
                ✕
              </button>
            </div>

            {/* Risk factors */}
            {risk.factors.length > 0 && (
              <div className={`mx-5 mt-4 rounded-lg border ${pillBorder} ${pillBg} divide-y divide-border/30 overflow-hidden`}>
                {risk.factors.map((factor) => (
                  <div key={factor.kind} className="flex items-center gap-2.5 px-3 py-2.5">
                    <span className={`shrink-0 ${pillText}`}>{FACTOR_ICONS[factor.kind]}</span>
                    <span className={`font-mono text-[11px] leading-relaxed ${pillText}`}>
                      {getFactorLabel(factor, risk.entityType, d)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="mx-5 mt-4 border-t border-border/40" />

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-4">
              <button
                ref={cancelRef}
                onClick={onCancel}
                disabled={isPending}
                className="rounded-lg border border-border bg-surface-2 px-4 py-1.5 font-mono text-xs text-text hover:bg-surface hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-50"
              >
                {d.cancel}
              </button>
              <button
                onClick={onConfirm}
                disabled={isPending}
                className={[
                  'flex items-center gap-1.5 rounded-lg px-4 py-1.5 font-mono text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50',
                  confirmBtn,
                ].join(' ')}
              >
                <Trash2 size={11} strokeWidth={2.5} />
                {isPending ? d.deleting : isDanger ? d.confirmDanger : d.confirm}
              </button>
            </div>
          </div>
        </VHSTransition>
      </div>
    </>
  )
}
