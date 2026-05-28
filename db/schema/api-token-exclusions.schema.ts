import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core'
import { apiTokens } from './api-tokens.schema'
import { nodes } from './nodes.schema'

export const apiTokenExclusions = pgTable('api_token_exclusions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tokenId:   uuid('token_id').notNull().references(() => apiTokens.id, { onDelete: 'cascade' }),
  nodeId:    uuid('node_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
