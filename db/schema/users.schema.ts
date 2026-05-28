import { bigint, boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  email:                text('email').notNull().unique(),
  passwordHash:         text('password_hash').notNull(),
  isSuperAdmin:         boolean('is_super_admin').notNull().default(false),
  cartumSuscriptor:     boolean('cartum_suscriptor').notNull().default(true),
  cartumSuscriptorTime: bigint('cartum_suscriptor_time', { mode: 'number' }).notNull().default(0),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
})
