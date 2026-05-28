import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { project } from './project.schema'
import { roles } from './roles.schema'
import { users } from './users.schema'

export const projectInvitations = pgTable('project_invitations', {
  id:           uuid('id').primaryKey().defaultRandom(),
  projectId:    uuid('project_id').references(() => project.id, { onDelete: 'cascade' }).notNull(),
  invitedEmail: text('invited_email').notNull(),
  roleId:       uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  invitedBy:    uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
  tokenHash:    text('token_hash').notNull().unique(),
  expiresAt:    timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt:   timestamp('accepted_at', { withTimezone: true }),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})

export type ProjectInvitation    = typeof projectInvitations.$inferSelect
export type NewProjectInvitation = typeof projectInvitations.$inferInsert
