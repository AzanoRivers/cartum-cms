import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core'
import { project } from './project.schema'
import { users } from './users.schema'
import { roles } from './roles.schema'

export const projectMemberships = pgTable(
  'project_memberships',
  {
    userId:    uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    projectId: uuid('project_id').references(() => project.id, { onDelete: 'cascade' }).notNull(),
    roleId:    uuid('role_id').references(() => roles.id, { onDelete: 'restrict' }).notNull(),
    joinedAt:  timestamp('joined_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.projectId] })],
)

export type ProjectMembership    = typeof projectMemberships.$inferSelect
export type NewProjectMembership = typeof projectMemberships.$inferInsert
