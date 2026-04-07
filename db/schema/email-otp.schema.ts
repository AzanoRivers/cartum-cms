import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users.schema'

export const emailOtpCodes = pgTable('email_otp_codes', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash:     text('code_hash').notNull(),
  pendingEmail: text('pending_email').notNull(),
  expiresAt:    timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt:       timestamp('used_at', { withTimezone: true }),
})
