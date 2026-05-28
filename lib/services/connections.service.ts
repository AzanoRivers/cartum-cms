import { connectionsRepository } from '@/db/repositories/connections.repository'
import { nodesRepository } from '@/db/repositories/nodes.repository'
import type { NodeConnection, RelationType } from '@/types/nodes'

export const connectionsService = {

  async create(
    sourceId:    string,
    targetId:    string,
    relationType: RelationType,
    projectId:   string,
  ): Promise<NodeConnection> {
    if (sourceId === targetId) throw new Error('SELF_CONNECTION_NOT_ALLOWED')

    const [source, target] = await Promise.all([
      nodesRepository.findById(sourceId, projectId),
      nodesRepository.findById(targetId, projectId),
    ])
    if (!source) throw new Error('SOURCE_NOT_FOUND')
    if (!target) throw new Error('TARGET_NOT_FOUND')
    if (source.type !== 'container') throw new Error('SOURCE_MUST_BE_CONTAINER')
    if (target.type !== 'container') throw new Error('TARGET_MUST_BE_CONTAINER')

    const existing = await connectionsRepository.findDuplicate(sourceId, targetId)
    if (existing) throw new Error('DUPLICATE_CONNECTION')

    return connectionsRepository.create(sourceId, targetId, relationType)
  },

  async delete(connectionId: string, projectId: string): Promise<void> {
    const connection = await connectionsRepository.findById(connectionId)
    if (!connection) throw new Error('CONNECTION_NOT_FOUND')
    const sourceNode = await nodesRepository.findById(connection.sourceNodeId, projectId)
    if (!sourceNode) throw new Error('FORBIDDEN')
    await connectionsRepository.delete(connectionId)
  },

  async getForNode(nodeId: string): Promise<NodeConnection[]> {
    return connectionsRepository.findBySourceOrTarget(nodeId)
  },

  async getForBoard(parentId: string | null, projectId: string): Promise<NodeConnection[]> {
    const boardNodes = await nodesRepository.findByParentId(parentId, projectId)
    if (boardNodes.length < 2) return []
    const ids = boardNodes.map((n) => n.id)
    return connectionsRepository.findBetweenNodes(ids)
  },

  async updateType(connectionId: string, relationType: RelationType, projectId: string): Promise<NodeConnection> {
    const conn = await connectionsRepository.findById(connectionId)
    if (!conn) throw new Error('CONNECTION_NOT_FOUND')
    const sourceNode = await nodesRepository.findById(conn.sourceNodeId, projectId)
    if (!sourceNode) throw new Error('FORBIDDEN')
    return connectionsRepository.updateRelationType(connectionId, relationType)
  },

}
