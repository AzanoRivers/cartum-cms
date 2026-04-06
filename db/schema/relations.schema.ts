import { check, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { nodes } from './nodes.schema'

export const nodeRelations = pgTable(
  'node_relations',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    sourceNodeId: uuid('source_node_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
    targetNodeId: uuid('target_node_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
    relationType: text('relation_type').notNull(),
  },
  (t) => [
    unique().on(t.sourceNodeId, t.targetNodeId),
    check('node_relations_type_check', sql`${t.relationType} IN ('1:1', '1:n', 'n:m')`),
  ],
)
