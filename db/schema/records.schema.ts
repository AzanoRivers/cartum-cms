import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { nodes } from './nodes.schema'

export const records = pgTable('records', {
  id:        uuid('id').primaryKey().defaultRandom(),
  nodeId:    uuid('node_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  data:      jsonb('data').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
