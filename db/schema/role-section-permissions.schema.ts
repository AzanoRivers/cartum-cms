import { boolean, check, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { roles } from './roles.schema'
import { SECTION_KEYS } from '@/types/roles'

// Built from SECTION_KEYS (types/roles.ts) so the DB constraint can never
// silently drift from the app's own section list again — that array is the
// single source of truth, edit it there, never here directly.
const sectionValuesSql = sql.raw(SECTION_KEYS.map((s) => `'${s}'`).join(', '))

export const roleSectionPermissions = pgTable(
  'role_section_permissions',
  {
    roleId:     uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    section:    text('section').notNull(),
    canAccess:  boolean('can_access').notNull().default(false),
    canActions: boolean('can_actions').notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.section] }),
    check('role_section_permissions_section_check', sql`${t.section} IN (${sectionValuesSql})`),
  ],
)
