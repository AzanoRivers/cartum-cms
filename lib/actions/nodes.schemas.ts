import { z } from 'zod'

export const CreateContainerSchema = z.object({
  name:      z.string().min(1).max(64).regex(/^[a-zA-Z0-9 _-]+$/, 'Name contains invalid characters.'),
  parentId:  z.string().uuid().nullable(),
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
  config:           z.record(z.unknown()).optional(),
  relationTargetId: z.string().uuid().nullable().optional(),
})
