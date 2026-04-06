import { connectionsRepository } from '@/db/repositories/connections.repository'
import { nodesRepository } from '@/db/repositories/nodes.repository'
import type { NodeConnection, RelationType } from '@/types/nodes'

export const connectionsService = {

  async create(
    sourceId: string,
    targetId: string,
    relationType: RelationType,
  ): Promise<NodeConnection> {
    // No self-connections
    if (sourceId === targetId) throw new Error('SELF_CONNECTION_NOT_ALLOWED')

    // Both nodes must be containers
    const [source, target] = await Promise.all([
      nodesRepository.findById(sourceId),
      nodesRepository.findById(targetId),
    ])
    if (!source) throw new Error('SOURCE_NOT_FOUND')
    if (!target) throw new Error('TARGET_NOT_FOUND')
    if (source.type !== 'container') throw new Error('SOURCE_MUST_BE_CONTAINER')
    if (target.type !== 'container') throw new Error('TARGET_MUST_BE_CONTAINER')

    // No duplicate connections
    const existing = await connectionsRepository.findDuplicate(sourceId, targetId)
    if (existing) throw new Error('DUPLICATE_CONNECTION')

    return connectionsRepository.create(sourceId, targetId, relationType)
  },

  async delete(connectionId: string): Promise<void> {
    const connection = await connectionsRepository.findById(connectionId)
    if (!connection) throw new Error('CONNECTION_NOT_FOUND')
    await connectionsRepository.delete(connectionId)
  },

  async getForNode(nodeId: string): Promise<NodeConnection[]> {
    return connectionsRepository.findBySourceOrTarget(nodeId)
  },

}
