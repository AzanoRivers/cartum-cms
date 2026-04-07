import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { appSettings } from '@/db/schema'
import type { ThemeId } from '@/types/theme'

const VALID_THEMES: ThemeId[] = ['dark', 'cyber-soft', 'light']

/**
 * Resolves a runtime setting.
 * Priority: DB (app_settings) → env var fallback → undefined
 * Server-only — never import this from client code.
 */
export async function getSetting(
  key: string,
  envFallback?: string,
): Promise<string | undefined> {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1)
  return row?.value ?? envFallback ?? undefined
}

/**
 * Upsert a setting. Pass undefined/empty string to delete (reverts to env fallback).
 */
export async function setSetting(
  key: string,
  value: string | undefined,
  updatedBy: string,
): Promise<void> {
  if (!value) {
    await db.delete(appSettings).where(eq(appSettings.key, key))
    return
  }
  try {
    await db
      .insert(appSettings)
      .values({ key, value, updatedBy })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedBy, updatedAt: new Date() },
      })
  } catch (err) {
    // FK violation: updatedBy user no longer exists (stale session after DB reset).
    // Retry without the user reference — the column is nullable.
    const isFK = err instanceof Error && err.message.includes('foreign key')
    if (isFK) {
      await db
        .insert(appSettings)
        .values({ key, value, updatedBy: null })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value, updatedBy: null, updatedAt: new Date() },
        })
    } else {
      throw err
    }
  }
}

/**
 * Returns the active theme ID from DB — falls back to 'dark'.
 * Server-only.
 */
export async function getTheme(): Promise<ThemeId> {
  const stored = await getSetting('theme')
  if (stored && (VALID_THEMES as string[]).includes(stored)) {
    return stored as ThemeId
  }
  return 'dark'
}
