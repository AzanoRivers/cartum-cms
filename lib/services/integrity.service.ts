import { nodesRepository } from '@/db/repositories/nodes.repository'
import { connectionsRepository } from '@/db/repositories/connections.repository'
import { recordsRepository } from '@/db/repositories/records.repository'
import type { DeletionRisk, RiskFactor, RiskLevel } from '@/types/integrity'

/**
 * Integrity Service
 *
 * Reusable service for checking whether an entity is safe to delete.
 * Runs all checks in parallel and returns a structured `DeletionRisk` result.
 *
 * Usage:
 *   const risk = await integrityService.checkNodeDeletion(nodeId)
 *   if (risk.level !== 'safe') { // prompt user }
 *   await nodeService.delete(nodeId, true)
 */
export const integrityService = {

  async checkNodeDeletion(nodeId: string): Promise<DeletionRisk> {
    const node = await nodesRepository.findById(nodeId)
    if (!node) {
      return {
        entityId:   nodeId,
        entityName: '',
        entityType: 'container',
        level:      'safe',
        factors:    [],
        canDelete:  false, // node doesn't exist — nothing to delete
      }
    }

    const factors: RiskFactor[] = []

    if (node.type === 'container') {
      // Run all checks in parallel
      const [childCount, connectionCount, recordCount, relationRefCount] = await Promise.all([
        nodesRepository.countChildren(nodeId),
        connectionsRepository.countByNodeId(nodeId),
        recordsRepository.countByNodeId(nodeId),
        nodesRepository.countRelationReferences(nodeId),
      ])

      if (childCount > 0) {
        factors.push({
          kind:  'children',
          count: childCount,
          label: `${childCount} field${childCount === 1 ? '' : 's'} defined inside this node`,
        })
      }
      if (connectionCount > 0) {
        factors.push({
          kind:  'connections',
          count: connectionCount,
          label: `${connectionCount} connection${connectionCount === 1 ? '' : 's'} linking to other nodes`,
        })
      }
      if (recordCount > 0) {
        factors.push({
          kind:  'records',
          count: recordCount,
          label: `${recordCount} record${recordCount === 1 ? '' : 's'} stored in this node`,
        })
      }
      if (relationRefCount > 0) {
        factors.push({
          kind:  'relation_fields',
          count: relationRefCount,
          label: `${relationRefCount} relation field${relationRefCount === 1 ? '' : 's'} in other nodes pointing here`,
        })
      }
    } else {
      // Field node — check if any records would be affected via parent
      if (node.parentId) {
        const recordCount = await recordsRepository.countByNodeId(node.parentId)
        if (recordCount > 0) {
          factors.push({
            kind:  'records',
            count: recordCount,
            label: `${recordCount} record${recordCount === 1 ? '' : 's'} in parent node will lose this field's data`,
          })
        }
      }
    }

    const level = deriveLevel(factors)

    return {
      entityId:   nodeId,
      entityName: node.name,
      entityType: node.type,
      level,
      factors,
      canDelete:  true,
    }
  },

}

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveLevel(factors: RiskFactor[]): RiskLevel {
  if (factors.length === 0) return 'safe'
  const hasDangerousFactors = factors.some(
    (f) => f.kind === 'records' || f.kind === 'relation_fields',
  )
  return hasDangerousFactors ? 'danger' : 'warn'
}
