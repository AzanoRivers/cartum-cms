import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const project = pgTable('project', {
  id:            uuid('id').primaryKey().defaultRandom(),
  name:          text('name').notNull(),
  description:   text('description'),
  defaultLocale: text('default_locale').notNull().default('en'),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
})
