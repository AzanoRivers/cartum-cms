import { getSetting } from '@/lib/settings/get-setting'
import type { StorageProvider } from '@/types/settings'

export async function getActiveProvider(projectId?: string | null): Promise<StorageProvider> {
  // Priority: project-specific → global legacy key → CMS default → hardcoded fallback
  const projectSetting  = projectId ? await getSetting(`storage_provider:${projectId}`) : null
  const globalSetting   = await getSetting('storage_provider')
  const defaultSetting  = await getSetting('default_storage_provider')
  const raw = projectSetting ?? globalSetting ?? defaultSetting ?? 'r2'
  return raw === 'blob' ? 'blob' : 'r2'
}
