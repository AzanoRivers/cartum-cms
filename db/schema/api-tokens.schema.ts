import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { roles } from './roles.schema'
import { project } from './project.schema'

export const apiTokens = pgTable('api_tokens', {
  id:         uuid('id').primaryKey().defaultRandom(),
  name:       text('name').notNull(),
  tokenHash:  text('token_hash').unique().notNull(),
  roleId:     uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  projectId:  uuid('project_id').notNull().references(() => project.id, { onDelete: 'cascade' }),
  // Allowed operations: 'read' | 'write' | 'update' | 'delete'
  scope:      text('scope').array().notNull().default(sql`ARRAY['read']::text[]`),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt:  timestamp('expires_at'),
  revokedAt:  timestamp('revoked_at'),
})
