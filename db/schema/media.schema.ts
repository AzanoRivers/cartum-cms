import { integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './users.schema'
import { nodes } from './nodes.schema'
import { records } from './records.schema'

export const media = pgTable('media', {
  id:          uuid('id').primaryKey().defaultRandom(),
  key:         text('key').notNull().unique(),
  publicUrl:   text('public_url').notNull(),
  mimeType:    text('mime_type').notNull(),
  sizeBytes:   integer('size_bytes'),
  name:        text('name'),
  // nullable — informational only (node where asset was first uploaded from)
  nodeId:      uuid('node_id').references(() => nodes.id, { onDelete: 'set null' }),
  recordId:    uuid('record_id').references(() => records.id, { onDelete: 'set null' }),
  uploadedBy:      uuid('uploaded_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  storageProvider: varchar('storage_provider', { length: 10 }).notNull().default('r2'),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
})
