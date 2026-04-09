import { boolean, pgTable, primaryKey, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { users } from './users.schema'
import { nodes } from './nodes.schema'

export const roles = pgTable('roles', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        text('name').notNull().unique(),
  description: text('description'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

export const rolePermissions = pgTable('role_permissions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  roleId:    uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  nodeId:    uuid('node_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  canRead:   boolean('can_read').notNull().default(false),
  canCreate: boolean('can_create').notNull().default(false),
  canUpdate: boolean('can_update').notNull().default(false),
  canDelete: boolean('can_delete').notNull().default(false),
}, (t) => [unique().on(t.roleId, t.nodeId)])

export const usersRoles = pgTable(
  'users_roles',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
)
