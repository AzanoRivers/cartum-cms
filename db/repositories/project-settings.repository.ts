import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { appSettings, projectSettings } from '@/db/schema'

/**
 * Get a setting for a project following the priority chain:
 * project_settings → app_settings → process.env[envKey] → undefined
 */
async function get(projectId: string, key: string, envKey?: string): Promise<string | undefined> {
  const [projectRow] = await db
    .select()
    .from(projectSettings)
    .where(and(eq(projectSettings.projectId, projectId), eq(projectSettings.key, key)))
    .limit(1)
  if (projectRow) return projectRow.value

  const [globalRow] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1)
  if (globalRow) return globalRow.value

  return envKey ? (process.env[envKey] ?? undefined) : undefined
}

async function set(
  projectId: string,
  key: string,
  value: string | undefined,
  updatedBy: string,
): Promise<void> {
  if (!value) {
    await db
      .delete(projectSettings)
      .where(and(eq(projectSettings.projectId, projectId), eq(projectSettings.key, key)))
    return
  }
  await db
    .insert(projectSettings)
    .values({ projectId, key, value, updatedBy })
    .onConflictDoUpdate({
      target: [projectSettings.projectId, projectSettings.key],
      set:    { value, updatedAt: new Date(), updatedBy },
    })
}

async function getAll(projectId: string): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(projectSettings)
    .where(eq(projectSettings.projectId, projectId))
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export const projectSettingsRepository = {
  get,
  set,
  getAll,
}
