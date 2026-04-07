import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { roles } from './roles.schema'

export const apiTokens = pgTable('api_tokens', {
  id:         uuid('id').primaryKey().defaultRandom(),
  name:       text('name').notNull(),
  tokenHash:  text('token_hash').unique().notNull(),
  roleId:     uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt:  timestamp('expires_at'),
  revokedAt:  timestamp('revoked_at'),
})
