import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { project } from './project.schema'
import { users } from './users.schema'

export const projectSettings = pgTable(
  'project_settings',
  {
    projectId:  uuid('project_id').references(() => project.id, { onDelete: 'cascade' }).notNull(),
    key:        text('key').notNull(),
    value:      text('value').notNull(),
    updatedAt:  timestamp('updated_at').defaultNow().notNull(),
    updatedBy:  uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.key] })],
)

export type ProjectSetting    = typeof projectSettings.$inferSelect
export type NewProjectSetting = typeof projectSettings.$inferInsert
