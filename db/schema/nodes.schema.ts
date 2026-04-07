import { boolean, check, jsonb, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

// Self-referential table: parentId references nodes.id
// The callback form is required to avoid circular initializer errors.
export const nodes = pgTable(
  'nodes',
  {
    id:        uuid('id').primaryKey().defaultRandom(),
    name:      text('name').notNull(),
    type:      text('type').notNull(),
    slug:      text('slug').unique(),
    parentId:  uuid('parent_id').references((): PgColumn => nodes.id, { onDelete: 'cascade' }),
    positionX: real('position_x').notNull().default(0),
    positionY: real('position_y').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    check('nodes_type_check', sql`${t.type} IN ('container', 'field')`),
  ],
)

export const fieldMeta = pgTable(
  'field_meta',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    nodeId:           uuid('node_id').notNull().unique().references(() => nodes.id, { onDelete: 'cascade' }),
    fieldType:        text('field_type').notNull(),
    isRequired:       boolean('is_required').notNull().default(false),
    defaultValue:     text('default_value'),
    relationTargetId: uuid('relation_target_id').references(() => nodes.id),
    config:           jsonb('config'),
  },
  (t) => [
    check('field_meta_type_check', sql`${t.fieldType} IN ('text', 'number', 'boolean', 'image', 'video', 'relation')`),
  ],
)
