import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users.schema'

export const project = pgTable('project', {
  id:            uuid('id').primaryKey().defaultRandom(),
  name:          text('name').notNull(),
  description:   text('description'),
  defaultLocale: text('default_locale').notNull().default('en'),
  ownerId:       uuid('owner_id').references(() => users.id, { onDelete: 'restrict' }),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
})
