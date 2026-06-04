import { redirect } from 'next/navigation'
import { auth }        from '@/auth'
import { cookies }      from 'next/headers'
import { getDictionary } from '@/locales'
import { getCurrentLocale } from '@/lib/utils/get-current-locale'
import { getStorageStatus, getStorageSettings } from '@/lib/actions/settings.actions'
import { getMediaStorageSummary } from '@/lib/actions/media.actions'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { resolveGalleryPermissions } from '@/lib/actions/roles.actions'
import { VHSTransition }  from '@/components/ui/transitions/VHSTransition'
import { BreadcrumbSetter } from '@/components/ui/molecules/BreadcrumbSetter'
import { MediaGalleryPage } from '@/components/ui/organisms/MediaGalleryPage'
import { ACTIVE_PROJECT_COOKIE } from '@/lib/auth/constants'

export async function generateMetadata() {
  const locale = await getCurrentLocale()
  const d = getDictionary(locale).cms
  return { title: d.content.mediaGallery.title }
}

export default async function ContentPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const locale = await getCurrentLocale()
  const d      = getDictionary(locale).cms

  const [statusRes, settingsRes, summaryRes] = await Promise.all([
    getStorageStatus(),
    getStorageSettings(),
    getMediaStorageSummary(),
  ])

  const activeProvider  = statusRes.success  ? statusRes.data.activeProvider   : 'r2'
  const vpsConfigured   = settingsRes.success ? !!settingsRes.data.settings.mediaVpsUrl : false
  const storageSummary  = summaryRes.success  ? summaryRes.data                 : undefined

  // Resolve gallery permissions based on user's role in the active project
  const cookieStore  = await cookies()
  const projectId    = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? session.user.currentProjectId ?? null
  const galleryPerms = projectId
    ? await resolveGalleryPermissions(session.user.id, projectId)
    : { images: { canView: true, canUpload: true, canDelete: true }, videos: { canView: true, canUpload: true, canDelete: true } }

  return (
    <>
      <BreadcrumbSetter items={[{ id: 'content', name: d.content.mediaGallery.title }]} parentId={null} />
      <VHSTransition duration="full" className="h-full w-full overflow-auto">
        <MediaGalleryPage
          d={d}
          activeProvider={activeProvider}
          vpsConfigured={vpsConfigured}
          storageSummary={storageSummary}
          canUpload={galleryPerms.images.canUpload || galleryPerms.videos.canUpload}
          canDelete={galleryPerms.images.canDelete || galleryPerms.videos.canDelete}
          galleryPerms={galleryPerms}
        />
      </VHSTransition>
    </>
  )
}
