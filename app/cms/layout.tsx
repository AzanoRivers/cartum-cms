import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/db'
import { project } from '@/db/schema'
import { isMobileUserAgent } from '@/lib/utils/ua'
import { getDictionary } from '@/locales'
import type { SupportedLocale } from '@/types/project'
import { DesktopLayout } from '@/components/ui/layouts/DesktopLayout'
import { MobileLayout } from '@/components/ui/layouts/MobileLayout'
import { CmsDictionarySetter } from '@/components/ui/molecules/CmsDictionarySetter'
import { GlobalLoader } from '@/components/ui/atoms/GlobalLoader'

export default async function CMSLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const [proj] = await db
    .select({ name: project.name, defaultLocale: project.defaultLocale })
    .from(project)
    .limit(1)

  const projectName = proj?.name ?? 'Cartum'
  const locale = (proj?.defaultLocale ?? 'en') as SupportedLocale
  const dict = getDictionary(locale)
  const cmsDict = dict.cms
  const settingsDict = dict.settings
  const canAccessBuilder = session.user.isSuperAdmin ?? true
  const isStorageConfigured = !!process.env.R2_ENDPOINT

  const ua = (await headers()).get('user-agent') ?? ''
  const mobile = isMobileUserAgent(ua)

  const userEmail = session.user?.email ?? ''
  const userInitials = userEmail ? userEmail.slice(0, 2).toUpperCase() : '??'
  const userId = session.user?.id ?? ''
  const isSuperAdmin = session.user.isSuperAdmin ?? false
  const isAdmin = (session.user.roles ?? []).includes('admin')

  if (mobile) {
    return (
      <>
        <CmsDictionarySetter dict={cmsDict} canAccessBuilder={canAccessBuilder} />
        <GlobalLoader />
        <MobileLayout
          projectName={projectName}
          userInitials={userInitials}
          isStorageConfigured={isStorageConfigured}
          userEmail={userEmail}
          userId={userId}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          settingsDict={settingsDict}
        >
          {children}
        </MobileLayout>
      </>
    )
  }

  return (
    <>
      <CmsDictionarySetter dict={cmsDict} canAccessBuilder={canAccessBuilder} />
      <GlobalLoader />
      <DesktopLayout
        projectName={projectName}
        userInitials={userInitials}
        userEmail={userEmail}
        userId={userId}
        isSuperAdmin={isSuperAdmin}
        isAdmin={isAdmin}
        settingsDict={settingsDict}
      >
        {children}
      </DesktopLayout>
    </>
  )
}
