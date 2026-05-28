import { nodesRepository } from '@/db/repositories/nodes.repository'
import { connectionsRepository } from '@/db/repositories/connections.repository'
import { recordsRepository } from '@/db/repositories/records.repository'
import type { DeletionRisk, RiskFactor, RiskLevel } from '@/types/integrity'

export const integrityService = {

  async checkNodeDeletion(nodeId: string, projectId: string): Promise<DeletionRisk> {
    const node = await nodesRepository.findById(nodeId, projectId)
    if (!node) {
      return {
        entityId:   nodeId,
        entityName: '',
        entityType: 'container',
        level:      'safe',
        factors:    [],
        canDelete:  false,
      }
    }

    const factors: RiskFactor[] = []

    if (node.type === 'container') {
      const [childCount, connectionCount, recordCount, relationRefCount] = await Promise.all([
        nodesRepository.countChildren(nodeId, projectId),
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

function deriveLevel(factors: RiskFactor[]): RiskLevel {
  if (factors.length === 0) return 'safe'
  const hasDangerousFactors = factors.some(
    (f) => f.kind === 'records' || f.kind === 'relation_fields',
  )
  return hasDangerousFactors ? 'danger' : 'warn'
}
