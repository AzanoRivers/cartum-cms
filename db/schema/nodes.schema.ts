import { boolean, check, jsonb, pgTable, real, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { project } from './project.schema'

// Self-referential table: parentId references nodes.id
// The callback form is required to avoid circular initializer errors.
export const nodes = pgTable(
  'nodes',
  {
    id:        uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => project.id, { onDelete: 'cascade' }).notNull(),
    name:      text('name').notNull(),
    type:      text('type').notNull(),
    slug:      text('slug'),
    parentId:  uuid('parent_id').references((): PgColumn => nodes.id, { onDelete: 'cascade' }),
    positionX: real('position_x').notNull().default(0),
    positionY: real('position_y').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    check('nodes_type_check', sql`${t.type} IN ('container', 'field')`),
    // Slugs are the public API's root-deck identifier (GET /api/v1/{slug}),
    // which is always resolved scoped to one project — so uniqueness only
    // needs to hold WITHIN a project, never across the whole instance. A
    // plain UNIQUE(slug) here blocked two unrelated projects from ever
    // having a same-named root deck (e.g. importing the same site twice
    // into two different projects).
    unique('nodes_project_slug_unique').on(t.projectId, t.slug),
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
    relationTargetId: uuid('relation_target_id').references(() => nodes.id, { onDelete: 'set null' }),
    config:           jsonb('config'),
  },
  (t) => [
    check('field_meta_type_check', sql`${t.fieldType} IN ('text', 'number', 'boolean', 'image', 'video', 'relation', 'gallery')`),
  ],
)
