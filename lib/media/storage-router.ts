import { getSetting } from '@/lib/settings/get-setting'
import type { StorageProvider } from '@/types/settings'

export async function getActiveProvider(): Promise<StorageProvider> {
  const raw = await getSetting('storage_provider', 'r2')
  return raw === 'blob' ? 'blob' : 'r2'
}
