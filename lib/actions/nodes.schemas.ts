import { z } from 'zod'

export const CreateContainerSchema = z.object({
  name:      z.string().min(1).max(64).regex(/^[a-zA-Z0-9 _-]+$/, 'Name contains invalid characters.'),
  // Omitted, or explicit null, both mean "create at the root of the table".
  parentId:  z.string().uuid().nullable().optional().transform((v) => v ?? null),
  // v1 API only: identify the parent deck by simpleName instead of parentId.
  // Ignored if parentId is also given. Resolved to a real parentId by the
  // route handler before nodeService.createContainer ever sees it.
  parentSimpleName: z.string().min(1).optional(),
  positionX: z.number().optional().default(0),
  positionY: z.number().optional().default(0),
})

export const CreateFieldSchema = z.object({
  name:             z.string().min(1).max(64).regex(/^[a-zA-Z0-9 _-]+$/, 'Name contains invalid characters.'),
  parentId:         z.string().uuid(),
  fieldType:        z.enum(['text', 'number', 'boolean', 'image', 'video', 'relation', 'gallery']),
  isRequired:       z.boolean().optional().default(false),
  defaultValue:     z.string().optional(),
  relationTargetId: z.string().uuid().optional(),
  positionX:        z.number().optional().default(0),
  positionY:        z.number().optional().default(0),
  // v1 API only: type-specific config at creation time (shape depends on
  // fieldType — validated and resolved by lib/api/card-config.ts, not here,
  // same reasoning as UpdateFieldMetaSchema.config below).
  config:           z.record(z.string(), z.unknown()).optional(),
})

export const UpdatePositionSchema = z.object({
  id: z.string().uuid(),
  x:  z.number(),
  y:  z.number(),
})

export const RenameNodeSchema = z.object({
  id:   z.string().uuid(),
  name: z.string().min(1).max(64).regex(/^[a-zA-Z0-9 _-]+$/),
})

export const DeleteNodeSchema = z.object({
  id:        z.string().uuid(),
  confirmed: z.boolean().optional().default(false),
})

export const CreateConnectionSchema = z.object({
  sourceId:     z.string().uuid(),
  targetId:     z.string().uuid(),
  relationType: z.enum(['1:1', '1:n', 'n:m']),
})

export const DeleteConnectionSchema = z.object({
  connectionId: z.string().uuid(),
})

export const UpdateConnectionSchema = z.object({
  connectionId: z.string().uuid(),
  relationType: z.enum(['1:1', '1:n', 'n:m']),
})

export const UpdateFieldMetaSchema = z.object({
  nodeId:           z.string().uuid(),
  name:             z.string().min(1).max(64).regex(/^[a-zA-Z0-9 _-]+$/, 'Name contains invalid characters.').optional(),
  isRequired:       z.boolean().optional(),
  fieldType:        z.enum(['text', 'number', 'boolean', 'image', 'video', 'relation', 'gallery']).optional(),
  defaultValue:     z.string().nullable().optional(),
  config:           z.record(z.string(), z.unknown()).optional(),
  relationTargetId: z.string().uuid().nullable().optional(),
})

export const DeleteNodesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
})

export const ForceChangeFieldTypeSchema = z.object({
  nodeId:           z.string().uuid(),
  name:             z.string().min(1).max(64).regex(/^[a-zA-Z0-9 _-]+$/, 'Name contains invalid characters.').optional(),
  isRequired:       z.boolean().optional(),
  fieldType:        z.enum(['text', 'number', 'boolean', 'image', 'video', 'relation', 'gallery']),
  defaultValue:     z.string().nullable().optional(),
  config:           z.record(z.string(), z.unknown()).optional(),
  relationTargetId: z.string().uuid().nullable().optional(),
})
