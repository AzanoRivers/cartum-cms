import { nodesRepository } from '@/db/repositories/nodes.repository'
import { recordsRepository } from '@/db/repositories/records.repository'
import { connectionsRepository } from '@/db/repositories/connections.repository'
import { validateFieldMeta } from '@/nodes/validator'
import { resolveNodeTree } from '@/nodes/resolver'
import type {
  AnyNode,
  BreadcrumbItem,
  ContainerNode,
  CreateContainerInput,
  CreateFieldInput,
  FieldNode,
  NodeTree,
  UpdateFieldMetaInput,
} from '@/types/nodes'

export const nodeService = {

  // ── Read ────────────────────────────────────────────────────────────────────

  async getBoard(parentId: string | null, projectId: string): Promise<AnyNode[]> {
    if (parentId === null) {
      return nodesRepository.findByParentId(null, projectId)
    }
    return nodesRepository.findChildren(parentId, projectId)
  },

  async getBreadcrumb(nodeId: string): Promise<BreadcrumbItem[]> {
    return nodesRepository.findAncestors(nodeId)
  },

  async getFullTree(projectId: string): Promise<NodeTree[]> {
    const all = await nodesRepository.findAll(projectId)
    return resolveNodeTree(all)
  },

  async getAllContainers(projectId: string): Promise<ContainerNode[]> {
    return nodesRepository.findFullTree(projectId)
  },

  async findBySlug(slug: string, projectId: string): Promise<ContainerNode | null> {
    return nodesRepository.findBySlug(slug, projectId)
  },

  // ── Create ──────────────────────────────────────────────────────────────────

  async createContainer(input: CreateContainerInput, projectId: string): Promise<ContainerNode> {
    const sibling = await nodesRepository.findSiblingByName(input.name, input.parentId ?? null, projectId)
    if (sibling) throw new Error('NODE_NAME_TAKEN')

    return nodesRepository.create({
      projectId,
      name:      input.name,
      parentId:  input.parentId ?? null,
      positionX: input.positionX ?? 0,
      positionY: input.positionY ?? 0,
    })
  },

  async createField(input: CreateFieldInput, projectId: string): Promise<FieldNode> {
    const validation = validateFieldMeta(input)
    if (!validation.valid) throw new Error(validation.error)

    const parent = await nodesRepository.findById(input.parentId, projectId)
    if (!parent) throw new Error('PARENT_NOT_FOUND')
    if (parent.type !== 'container') throw new Error('PARENT_MUST_BE_CONTAINER')

    if (input.fieldType === 'relation' && input.relationTargetId) {
      const target = await nodesRepository.findById(input.relationTargetId, projectId)
      if (!target) throw new Error('RELATION_TARGET_NOT_FOUND')
      if (target.type !== 'container') throw new Error('RELATION_TARGET_MUST_BE_CONTAINER')
    }

    const sibling = await nodesRepository.findSiblingByName(input.name, input.parentId, projectId)
    if (sibling) throw new Error('NODE_NAME_TAKEN')

    return nodesRepository.createField({
      projectId,
      name:             input.name,
      parentId:         input.parentId,
      positionX:        input.positionX ?? 0,
      positionY:        input.positionY ?? 0,
      fieldType:        input.fieldType,
      isRequired:       input.isRequired ?? false,
      defaultValue:     input.defaultValue ?? null,
      relationTargetId: input.relationTargetId ?? null,
    })
  },

  // ── Update ──────────────────────────────────────────────────────────────────

  async updatePosition(id: string, x: number, y: number, projectId: string): Promise<void> {
    await nodesRepository.updatePosition(id, x, y, projectId)
  },

  async rename(id: string, name: string, projectId: string): Promise<AnyNode> {
    const node = await nodesRepository.findById(id, projectId)
    if (!node) throw new Error('NODE_NOT_FOUND')

    const sibling = await nodesRepository.findSiblingByName(name, node.parentId, projectId)
    if (sibling && sibling.id !== id) throw new Error('NODE_NAME_TAKEN')

    await nodesRepository.updateName(id, name, node.parentId, projectId)
    return { ...node, name }
  },

  async updateFieldMeta(nodeId: string, input: UpdateFieldMetaInput, projectId: string): Promise<FieldNode> {
    const current = await nodesRepository.findById(nodeId, projectId)
    if (!current || current.type !== 'field') throw new Error('FIELD_NOT_FOUND')

    if (input.fieldType && input.fieldType !== current.fieldType) {
      if (current.parentId) {
        const recordCount = await recordsRepository.countByNodeId(current.parentId)
        if (recordCount > 0) throw new Error('FIELD_TYPE_CHANGE_BLOCKED')
      }
    }

    if (input.name && input.name !== current.name) {
      const sibling = await nodesRepository.findSiblingByName(input.name, current.parentId, projectId)
      if (sibling && sibling.id !== nodeId) throw new Error('NODE_NAME_TAKEN')
    }

    const relTargetId = input.relationTargetId
    if (relTargetId) {
      const target = await nodesRepository.findById(relTargetId, projectId)
      if (!target) throw new Error('RELATION_TARGET_NOT_FOUND')
      if (target.type !== 'container') throw new Error('RELATION_TARGET_MUST_BE_CONTAINER')
    }

    return nodesRepository.updateFieldMeta(nodeId, projectId, {
      name:             input.name,
      fieldType:        input.fieldType,
      isRequired:       input.isRequired,
      defaultValue:     input.defaultValue,
      config:           input.config ?? null,
      relationTargetId: input.relationTargetId,
    })
  },

  async forceChangeFieldType(nodeId: string, input: UpdateFieldMetaInput, projectId: string): Promise<FieldNode> {
    const current = await nodesRepository.findById(nodeId, projectId)
    if (!current || current.type !== 'field') throw new Error('FIELD_NOT_FOUND')

    if (input.name && input.name !== current.name) {
      const sibling = await nodesRepository.findSiblingByName(input.name, current.parentId, projectId)
      if (sibling && sibling.id !== nodeId) throw new Error('NODE_NAME_TAKEN')
    }

    if (current.parentId) {
      await recordsRepository.clearFieldData(current.parentId, current.name)
    }

    return nodesRepository.updateFieldMeta(nodeId, projectId, {
      name:             input.name,
      fieldType:        input.fieldType,
      isRequired:       input.isRequired,
      defaultValue:     input.defaultValue ?? null,
      config:           input.config ?? null,
      relationTargetId: input.relationTargetId,
    })
  },

  // ── Delete ──────────────────────────────────────────────────────────────────

  async delete(id: string, projectId: string, confirmed = false): Promise<void> {
    const node = await nodesRepository.findById(id, projectId)
    if (!node) throw new Error('NODE_NOT_FOUND')

    if (!confirmed) {
      if (node.type === 'container') {
        const [childCount, connectionCount] = await Promise.all([
          nodesRepository.countChildren(id, projectId),
          connectionsRepository.countByNodeId(id),
        ])
        if (childCount > 0)      throw new Error(`NODE_HAS_CHILDREN:${childCount}`)
        if (connectionCount > 0) throw new Error(`NODE_HAS_CONNECTIONS:${connectionCount}`)
      }
    }

    await nodesRepository.delete(id, projectId)
  },

}
