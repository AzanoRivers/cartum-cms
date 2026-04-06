import { nodesRepository } from '@/db/repositories/nodes.repository'
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

    await nodesRepository.updateName(id, name)
    return { ...node, name }
  },

  // ── Delete ──────────────────────────────────────────────────────────────────

  async delete(id: string, confirmed = false): Promise<void> {
    const node = await nodesRepository.findById(id)
    if (!node) throw new Error('NODE_NOT_FOUND')

    if (node.type === 'container' && !confirmed) {
      const childCount = await nodesRepository.countChildren(id)
      if (childCount > 0) {
        throw new Error(`NODE_HAS_CHILDREN:${childCount}`)
      }
    }

    await nodesRepository.delete(id)
  },

}
