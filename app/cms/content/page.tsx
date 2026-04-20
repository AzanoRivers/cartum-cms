import { redirect } from 'next/navigation'
import { auth }        from '@/auth'
import { db }          from '@/db'
import { project }     from '@/db/schema'
import { getDictionary } from '@/locales'
import { getStorageStatus, getStorageSettings } from '@/lib/actions/settings.actions'
import { getMediaStorageSummary } from '@/lib/actions/media.actions'
import { VHSTransition }  from '@/components/ui/transitions/VHSTransition'
import { BreadcrumbSetter } from '@/components/ui/molecules/BreadcrumbSetter'
import { MediaGalleryPage } from '@/components/ui/organisms/MediaGalleryPage'
import type { SupportedLocale } from '@/types/project'

export async function generateMetadata() {
  const [proj] = await db.select({ defaultLocale: project.defaultLocale }).from(project).limit(1)
  const locale = (proj?.defaultLocale ?? 'en') as SupportedLocale
  const d = getDictionary(locale).cms
  return { title: d.content.mediaGallery.title }
}

export default async function ContentPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [proj] = await db
    .select({ defaultLocale: project.defaultLocale })
    .from(project)
    .limit(1)

  const locale = (proj?.defaultLocale ?? 'en') as SupportedLocale
  const d      = getDictionary(locale).cms

  const [statusRes, settingsRes, summaryRes] = await Promise.all([
    getStorageStatus(),
    getStorageSettings(),
    getMediaStorageSummary(),
  ])

  const activeProvider  = statusRes.success  ? statusRes.data.activeProvider   : 'r2'
  const vpsConfigured   = settingsRes.success ? !!settingsRes.data.mediaVpsUrl  : false
  const storageSummary  = summaryRes.success  ? summaryRes.data                 : undefined

  return (
    <>
      <BreadcrumbSetter items={[{ id: 'content', name: d.content.mediaGallery.title }]} parentId={null} />
      <VHSTransition duration="full" className="h-full w-full overflow-auto">
        <MediaGalleryPage
          d={d}
          activeProvider={activeProvider}
          vpsConfigured={vpsConfigured}
          storageSummary={storageSummary}
        />
      </VHSTransition>
    </>
  )
}
