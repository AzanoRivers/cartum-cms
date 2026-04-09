import { boolean, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import { roles } from './roles.schema'

export const SECTION_KEYS = [
  'project',
  'appearance',
  'account',
  'email',
  'storage',
  'users',
  'roles',
  'api',
  'db',
  'info',
] as const

export const roleSectionPermissions = pgTable(
  'role_section_permissions',
  {
    roleId:    uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    section:   text('section').notNull(),
    canAccess: boolean('can_access').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.section] })],
)
