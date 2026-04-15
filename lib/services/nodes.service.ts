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

  async getBoard(parentId: string | null): Promise<AnyNode[]> {
    if (parentId === null) {
      // Root level: only container nodes with no parent
      return nodesRepository.findByParentId(null)
    }
    return nodesRepository.findChildren(parentId)
  },

  async getBreadcrumb(nodeId: string): Promise<BreadcrumbItem[]> {
    return nodesRepository.findAncestors(nodeId)
  },

  async getFullTree(): Promise<NodeTree[]> {
    const all = await nodesRepository.findAll()
    return resolveNodeTree(all)
  },

  async getAllContainers(): Promise<ContainerNode[]> {
    return nodesRepository.findFullTree()
  },

  async findBySlug(slug: string): Promise<ContainerNode | null> {
    return nodesRepository.findBySlug(slug)
  },

  // ── Create ──────────────────────────────────────────────────────────────────

  async createContainer(input: CreateContainerInput): Promise<ContainerNode> {
    // Validate uniqueness within the same parent level
    const sibling = await nodesRepository.findSiblingByName(input.name, input.parentId ?? null)
    if (sibling) {
      throw new Error('NODE_NAME_TAKEN')
    }

    return nodesRepository.create({
      name:      input.name,
      parentId:  input.parentId ?? null,
      positionX: input.positionX ?? 0,
      positionY: input.positionY ?? 0,
    })
  },

  async createField(input: CreateFieldInput): Promise<FieldNode> {
    // Validate field rules
    const validation = validateFieldMeta(input)
    if (!validation.valid) throw new Error(validation.error)

    // Validate parent exists and is a container
    const parent = await nodesRepository.findById(input.parentId)
    if (!parent) throw new Error('PARENT_NOT_FOUND')
    if (parent.type !== 'container') throw new Error('PARENT_MUST_BE_CONTAINER')

    // Validate relation target if provided
    if (input.fieldType === 'relation' && input.relationTargetId) {
      const target = await nodesRepository.findById(input.relationTargetId)
      if (!target) throw new Error('RELATION_TARGET_NOT_FOUND')
      if (target.type !== 'container') throw new Error('RELATION_TARGET_MUST_BE_CONTAINER')
    }

    // Validate uniqueness within parent
    const sibling = await nodesRepository.findSiblingByName(input.name, input.parentId)
    if (sibling) throw new Error('NODE_NAME_TAKEN')

    return nodesRepository.createField({
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

  async updatePosition(id: string, x: number, y: number): Promise<void> {
    await nodesRepository.updatePosition(id, x, y)
  },

  async rename(id: string, name: string): Promise<AnyNode> {
    const node = await nodesRepository.findById(id)
    if (!node) throw new Error('NODE_NOT_FOUND')

    // Validate uniqueness within same parent
    const sibling = await nodesRepository.findSiblingByName(name, node.parentId)
    if (sibling && sibling.id !== id) throw new Error('NODE_NAME_TAKEN')

    await nodesRepository.updateName(id, name, node.parentId)
    return { ...node, name }
  },

  async updateFieldMeta(nodeId: string, input: UpdateFieldMetaInput): Promise<FieldNode> {
    const current = await nodesRepository.findById(nodeId)
    if (!current || current.type !== 'field') throw new Error('FIELD_NOT_FOUND')

    // Block field type change if parent container has records
    if (input.fieldType && input.fieldType !== current.fieldType) {
      if (current.parentId) {
        const recordCount = await recordsRepository.countByNodeId(current.parentId)
        if (recordCount > 0) throw new Error('FIELD_TYPE_CHANGE_BLOCKED')
      }
    }

    // Validate name uniqueness
    if (input.name && input.name !== current.name) {
      const sibling = await nodesRepository.findSiblingByName(input.name, current.parentId)
      if (sibling && sibling.id !== nodeId) throw new Error('NODE_NAME_TAKEN')
    }

    // Validate relation target
    const relTargetId = input.relationTargetId
    if (relTargetId) {
      const target = await nodesRepository.findById(relTargetId)
      if (!target) throw new Error('RELATION_TARGET_NOT_FOUND')
      if (target.type !== 'container') throw new Error('RELATION_TARGET_MUST_BE_CONTAINER')
    }

    return nodesRepository.updateFieldMeta(nodeId, {
      name:             input.name,
      fieldType:        input.fieldType,
      isRequired:       input.isRequired,
      defaultValue:     input.defaultValue,
      config:           input.config ?? null,
      relationTargetId: input.relationTargetId,
    })
  },

  // ── Delete ──────────────────────────────────────────────────────────────────

  async delete(id: string, confirmed = false): Promise<void> {
    const node = await nodesRepository.findById(id)
    if (!node) throw new Error('NODE_NOT_FOUND')

    if (!confirmed) {
      // Gate: check any blocking dependencies before allowing unconfirmed deletion
      if (node.type === 'container') {
        const [childCount, connectionCount] = await Promise.all([
          nodesRepository.countChildren(id),
          connectionsRepository.countByNodeId(id),
        ])
        if (childCount > 0)     throw new Error(`NODE_HAS_CHILDREN:${childCount}`)
        if (connectionCount > 0) throw new Error(`NODE_HAS_CONNECTIONS:${connectionCount}`)
      }
    }

    await nodesRepository.delete(id)
  },

}
