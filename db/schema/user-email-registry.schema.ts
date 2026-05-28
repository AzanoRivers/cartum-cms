import { pgTable, text, bigint, integer } from 'drizzle-orm/pg-core'

export const userEmailRegistry = pgTable('user_email_registry', {
  email:        text('email').primaryKey(),
  firstSeenAt:  bigint('first_seen_at',  { mode: 'number' }).notNull(),
  trialStartAt: bigint('trial_start_at', { mode: 'number' }).notNull(),
  trialDays:    integer('trial_days').notNull().default(7),
})

export type UserEmailRegistry    = typeof userEmailRegistry.$inferSelect
export type NewUserEmailRegistry = typeof userEmailRegistry.$inferInsert
