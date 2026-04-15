import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '@/db/schema'

const sql = neon(process.env.DATABASE_URL!, {
  // Prevent Next.js from caching Neon's internal fetch() calls.
  // Without this, Next.js patches fetch() and may serve stale DB results.
  fetchOptions: { cache: 'no-store' },
})
export const db = drizzle(sql, { schema })
