/**
 * Integrity types — used whenever deleting or mutating an entity that may
 * have cascading effects. Reusable across nodes, connections, fields, etc.
 */

/** A single risk factor identified during a pre-delete check */
export type RiskFactor =
  | { kind: 'connections';  count: number;  label: string }
  | { kind: 'children';     count: number;  label: string }
  | { kind: 'records';      count: number;  label: string }
  | { kind: 'relation_fields'; count: number; label: string }

/** Severity derived from the set of risk factors */
export type RiskLevel = 'safe' | 'warn' | 'danger'

/** Full result of a pre-delete integrity check */
export type DeletionRisk = {
  /** Entity being checked */
  entityId:   string
  entityName: string
  entityType: 'container' | 'field'

  /** Risk level: safe = delete freely, warn = confirm, danger = confirm with explicit acknowledgment */
  level: RiskLevel

  /** Ordered list of discovered risk factors */
  factors: RiskFactor[]

  /** True when deletion can proceed (regardless of level, after confirmation) */
  canDelete: boolean
}
