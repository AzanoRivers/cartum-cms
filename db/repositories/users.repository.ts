import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users, usersRoles } from '@/db/schema'

type UserRow = typeof users.$inferSelect

async function findById(id: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return rows[0] ?? null
}

async function findByEmail(email: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return rows[0] ?? null
}

async function create(input: { email: string; passwordHash: string; isSuperAdmin?: boolean }): Promise<UserRow> {
  const [row] = await db.insert(users).values(input).returning()
  return row
}

async function updatePassword(id: string, passwordHash: string): Promise<void> {
  await db.update(users).set({ passwordHash }).where(eq(users.id, id))
}

async function assignRole(userId: string, roleId: string): Promise<void> {
  await db
    .insert(usersRoles)
    .values({ userId, roleId })
    .onConflictDoNothing()
}

async function removeRole(userId: string, roleId: string): Promise<void> {
  await db
    .delete(usersRoles)
    .where(eq(usersRoles.userId, userId))
}

async function isSuperAdmin(id: string): Promise<boolean> {
  const rows = await db
    .select({ isSuperAdmin: users.isSuperAdmin })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  return rows[0]?.isSuperAdmin ?? false
}

export const usersRepository = {
  findById,
  findByEmail,
  create,
  updatePassword,
  assignRole,
  removeRole,
  isSuperAdmin,
}
