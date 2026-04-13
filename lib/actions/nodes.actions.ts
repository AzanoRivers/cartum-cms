'use server'

import { auth } from '@/auth'
import { nodeService } from '@/lib/services/nodes.service'
import { connectionsService } from '@/lib/services/connections.service'
import {
  CreateContainerSchema,
  CreateConnectionSchema,
  CreateFieldSchema,
  DeleteConnectionSchema,
  UpdateConnectionSchema,
  UpdateFieldMetaSchema,
  DeleteNodeSchema,
  RenameNodeSchema,
  UpdatePositionSchema,
} from './nodes.schemas'
import type { ActionResult } from '@/types/actions'
import type { AnyNode, ContainerNode, FieldConfig, FieldNode, NodeConnection } from '@/types/nodes'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireSession(): Promise<void> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
}

// ── Node actions ──────────────────────────────────────────────────────────────

export async function createContainerNode(
  input: unknown,
): Promise<ActionResult<ContainerNode>> {
  try {
    await requireSession()
    const parsed = CreateContainerSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error.' }
    const node = await nodeService.createContainer(parsed.data)
    return { success: true, data: node }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function createFieldNode(
  input: unknown,
): Promise<ActionResult<FieldNode>> {
  try {
    await requireSession()
    const parsed = CreateFieldSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error.' }
    const node = await nodeService.createField(parsed.data)
    return { success: true, data: node }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function updateNodePosition(
  input: unknown,
): Promise<ActionResult<void>> {
  try {
    await requireSession()
    const parsed = UpdatePositionSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error.' }
    await nodeService.updatePosition(parsed.data.id, parsed.data.x, parsed.data.y)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function renameNode(
  input: unknown,
): Promise<ActionResult<AnyNode>> {
  try {
    await requireSession()
    const parsed = RenameNodeSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error.' }
    const node = await nodeService.rename(parsed.data.id, parsed.data.name)
    return { success: true, data: node } as ActionResult<AnyNode>
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function deleteNode(
  input: unknown,
): Promise<ActionResult<void>> {
  try {
    await requireSession()
    const parsed = DeleteNodeSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error.' }
    await nodeService.delete(parsed.data.id, parsed.data.confirmed)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

// ── Connection actions ────────────────────────────────────────────────────────

export async function createConnection(
  input: unknown,
): Promise<ActionResult<NodeConnection>> {
  try {
    await requireSession()
    const parsed = CreateConnectionSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error.' }
    const connection = await connectionsService.create(
      parsed.data.sourceId,
      parsed.data.targetId,
      parsed.data.relationType,
    )
    return { success: true, data: connection }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function deleteConnection(
  input: unknown,
): Promise<ActionResult<void>> {
  try {
    await requireSession()
    const parsed = DeleteConnectionSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error.' }
    await connectionsService.delete(parsed.data.connectionId)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function updateConnection(
  input: unknown,
): Promise<ActionResult<NodeConnection>> {
  try {
    await requireSession()
    const parsed = UpdateConnectionSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error.' }
    const conn = await connectionsService.updateType(parsed.data.connectionId, parsed.data.relationType)
    return { success: true, data: conn }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

// ── Field meta actions ────────────────────────────────────────────────────────

export async function updateFieldMeta(
  input: unknown,
): Promise<ActionResult<FieldNode>> {
  try {
    await requireSession()
    const parsed = UpdateFieldMetaSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error.' }
    const node = await nodeService.updateFieldMeta(parsed.data.nodeId, {
      name:             parsed.data.name,
      isRequired:       parsed.data.isRequired,
      fieldType:        parsed.data.fieldType,
      defaultValue:     parsed.data.defaultValue,
      config:           parsed.data.config as FieldConfig | undefined,
      relationTargetId: parsed.data.relationTargetId,
    })
    return { success: true, data: node }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function getContainerNodes(): Promise<ActionResult<ContainerNode[]>> {
  try {
    await requireSession()
    const containers = await nodeService.getAllContainers()
    return { success: true, data: containers }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}
