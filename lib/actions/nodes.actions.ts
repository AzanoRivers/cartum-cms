'use server'

import { revalidatePath } from 'next/cache'
import { nodeService } from '@/lib/services/nodes.service'
import { connectionsService } from '@/lib/services/connections.service'
import { requireProjectId, assertProjectAccess } from '@/lib/auth/get-project-id'
import {
  CreateContainerSchema,
  CreateConnectionSchema,
  CreateFieldSchema,
  DeleteConnectionSchema,
  UpdateConnectionSchema,
  UpdateFieldMetaSchema,
  ForceChangeFieldTypeSchema,
  DeleteNodeSchema,
  DeleteNodesSchema,
  RenameNodeSchema,
  UpdatePositionSchema,
} from './nodes.schemas'
import type { ActionResult } from '@/types/actions'
import type { AnyNode, ContainerNode, FieldConfig, FieldNode, NodeConnection } from '@/types/nodes'

// ── Node actions ──────────────────────────────────────────────────────────────

export async function createContainerNode(
  input: unknown,
): Promise<ActionResult<ContainerNode>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const parsed = CreateContainerSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error.' }
    const node = await nodeService.createContainer(parsed.data, projectId)
    revalidatePath('/cms/board', 'layout')
    return { success: true, data: node }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function createFieldNode(
  input: unknown,
): Promise<ActionResult<FieldNode>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const parsed = CreateFieldSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error.' }
    const node = await nodeService.createField(parsed.data, projectId)
    revalidatePath('/cms/board', 'layout')
    return { success: true, data: node }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function updateNodePosition(
  input: unknown,
): Promise<ActionResult<void>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const parsed = UpdatePositionSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error.' }
    await nodeService.updatePosition(parsed.data.id, parsed.data.x, parsed.data.y, projectId)
    revalidatePath('/cms/board', 'layout')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function renameNode(
  input: unknown,
): Promise<ActionResult<AnyNode>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const parsed = RenameNodeSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error.' }
    const node = await nodeService.rename(parsed.data.id, parsed.data.name, projectId)
    revalidatePath('/cms/board', 'layout')
    return { success: true, data: node } as ActionResult<AnyNode>
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function deleteNode(
  input: unknown,
): Promise<ActionResult<void>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const parsed = DeleteNodeSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error.' }
    await nodeService.delete(parsed.data.id, projectId, parsed.data.confirmed)
    revalidatePath('/cms/board', 'layout')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function deleteNodes(
  input: unknown,
): Promise<ActionResult<void>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const parsed = DeleteNodesSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error.' }
    for (const id of parsed.data.ids) {
      await nodeService.delete(id, projectId, true)
    }
    revalidatePath('/cms/board', 'layout')
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
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const parsed = CreateConnectionSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error.' }
    const connection = await connectionsService.create(
      parsed.data.sourceId,
      parsed.data.targetId,
      parsed.data.relationType,
      projectId,
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
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const parsed = DeleteConnectionSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error.' }
    await connectionsService.delete(parsed.data.connectionId, projectId)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function updateConnection(
  input: unknown,
): Promise<ActionResult<NodeConnection>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const parsed = UpdateConnectionSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error.' }
    const conn = await connectionsService.updateType(parsed.data.connectionId, parsed.data.relationType, projectId)
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
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const parsed = UpdateFieldMetaSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error.' }
    const node = await nodeService.updateFieldMeta(parsed.data.nodeId, {
      name:             parsed.data.name,
      isRequired:       parsed.data.isRequired,
      fieldType:        parsed.data.fieldType,
      defaultValue:     parsed.data.defaultValue,
      config:           parsed.data.config as FieldConfig | undefined,
      relationTargetId: parsed.data.relationTargetId,
    }, projectId)
    return { success: true, data: node }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function forceChangeFieldType(
  input: unknown,
): Promise<ActionResult<FieldNode>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const parsed = ForceChangeFieldTypeSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error.' }
    const node = await nodeService.forceChangeFieldType(parsed.data.nodeId, {
      name:             parsed.data.name,
      isRequired:       parsed.data.isRequired,
      fieldType:        parsed.data.fieldType,
      defaultValue:     parsed.data.defaultValue,
      config:           parsed.data.config as FieldConfig | undefined,
      relationTargetId: parsed.data.relationTargetId,
    }, projectId)
    return { success: true, data: node }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

export async function getContainerNodes(): Promise<ActionResult<ContainerNode[]>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const containers = await nodeService.getAllContainers(projectId)
    return { success: true, data: containers }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}
