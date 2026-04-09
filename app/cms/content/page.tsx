import { redirect } from 'next/navigation'
import { auth }        from '@/auth'
import { db }          from '@/db'
import { project }     from '@/db/schema'
import { getDictionary } from '@/locales'
import { VHSTransition }  from '@/components/ui/transitions/VHSTransition'
import { BreadcrumbSetter } from '@/components/ui/molecules/BreadcrumbSetter'
import { MediaGalleryPage } from '@/components/ui/organisms/MediaGalleryPage'
import type { SupportedLocale } from '@/types/project'

export const metadata = { title: 'Media Gallery' }

export default async function ContentPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [proj] = await db
    .select({ defaultLocale: project.defaultLocale })
    .from(project)
    .limit(1)

  const locale = (proj?.defaultLocale ?? 'en') as SupportedLocale
  const d      = getDictionary(locale).cms

  return (
    <>
      <BreadcrumbSetter items={[{ id: 'content', name: d.content.mediaGallery.title }]} parentId={null} />
      <VHSTransition duration="full" className="h-full w-full overflow-auto">
        <MediaGalleryPage d={d} />
      </VHSTransition>
    </>
  )
}
