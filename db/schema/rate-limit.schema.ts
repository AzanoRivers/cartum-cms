import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Rate limiting for forgot-password requests.
 * Stores the last request time per email (hashed), regardless of whether
 * the email is registered. Prevents bot flooding without revealing user existence.
 */
export const passwordResetRateLimits = pgTable('password_reset_rate_limits', {
  emailHash:   text('email_hash').primaryKey(),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull(),
})
