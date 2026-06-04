import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { isMobileUserAgent } from '@/lib/utils/ua'
import { getDictionary } from '@/locales'
import type { SupportedLocale } from '@/types/project'
import { DesktopLayout } from '@/components/ui/layouts/DesktopLayout'
import { MobileLayout } from '@/components/ui/layouts/MobileLayout'
import { CmsDictionarySetter } from '@/components/ui/molecules/CmsDictionarySetter'
import { GlobalLoader } from '@/components/ui/atoms/GlobalLoader'
import { ThemeSync } from '@/components/ui/atoms/ThemeSync'
import { rolesService } from '@/lib/services/roles.service'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { ROLE_ADMIN, ROLE_EDITOR } from '@/types/roles'
import { resolveSchemaPermissions } from '@/lib/actions/roles.actions'
import { getTheme } from '@/lib/settings/get-setting'
import { getMyProjects } from '@/lib/actions/project.actions'
import { NoProjectModal } from '@/components/ui/molecules/NoProjectModal'
import { ACTIVE_PROJECT_COOKIE } from '@/lib/auth/constants'

export default async function CMSLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const userId               = session.user?.id ?? ''
  const isSuperAdmin         = session.user.isSuperAdmin ?? false
  const cookieStore          = await cookies()
  const cookieProjectId      = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? null
  const sessionProjectId     = session.user.currentProjectId ?? null

  // Validate cookie project — user MUST be an actual member regardless of role
  // Super_admin is NOT exempt: projects are isolated capsules
  let currentProjectId: string | null = sessionProjectId
  if (cookieProjectId) {
    const isMember = await projectMembershipsRepository.isMember(userId, cookieProjectId)
    if (isMember) {
      currentProjectId = cookieProjectId
    }
  }

  // If resolved project is still not one the user is a member of, find their first membership
  if (currentProjectId) {
    const validMember = await projectMembershipsRepository.isMember(userId, currentProjectId)
    if (!validMember) {
      const memberships = await projectMembershipsRepository.getUserProjects(userId)
      currentProjectId = memberships[0]?.projectId ?? null
    }
  }
  const cartumSuscriptor     = session.user.cartumSuscriptor ?? true
  const cartumSuscriptorTime = session.user.cartumSuscriptorTime ?? 0

  const [sectionPermissions, isProjectAdmin, schemaPermissions, theme, allProjects] = await Promise.all([
    isSuperAdmin
      ? Promise.resolve({} as Awaited<ReturnType<typeof rolesService.getSectionPermissionsForUser>>)
      : rolesService.getSectionPermissionsForUser(userId, currentProjectId),
    isSuperAdmin || !currentProjectId
      ? Promise.resolve(false)
      : projectMembershipsRepository.isMemberWithRole(userId, currentProjectId, ROLE_ADMIN),
    currentProjectId
      ? resolveSchemaPermissions(userId, currentProjectId)
      : Promise.resolve({ canCreate: false, canUpdate: false, canDelete: false, canConnect: false }),
    getTheme(currentProjectId),
    getMyProjects(),
  ])

  const isAdmin = isSuperAdmin
    || (session.user.roles ?? []).includes(ROLE_ADMIN)
    || isProjectAdmin


  const isProjectEditor = schemaPermissions.canCreate && schemaPermissions.canUpdate
    && schemaPermissions.canDelete && schemaPermissions.canConnect

  const projects = allProjects.map((p) => ({ id: p.id, name: p.name, locale: p.defaultLocale ?? 'en' }))
  const currentProject = projects.find((p) => p.id === currentProjectId)
    ?? projects[0]
    ?? { id: '', name: 'Cartum', locale: 'en' }

  const locale = (currentProject.locale ?? 'en') as SupportedLocale
  const dict = getDictionary(locale)
  const cmsDict = dict.cms
  const settingsDict = dict.settings

  const ua = (await headers()).get('user-agent') ?? ''
  const mobile = isMobileUserAgent(ua)

  const userEmail    = session.user?.email ?? ''
  const userInitials = userEmail ? userEmail.slice(0, 2).toUpperCase() : '??'

  const noProject = projects.length === 0

  if (mobile) {
    return (
      <>
        <ThemeSync theme={theme} />
        <CmsDictionarySetter dict={cmsDict} schemaPermissions={schemaPermissions} />
        <GlobalLoader />
        {noProject && <NoProjectModal d={dict.cms.noProject} />}
        <MobileLayout
          currentProject={currentProject}
          projects={projects}
          userInitials={userInitials}
          userEmail={userEmail}
          userId={userId}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          settingsDict={settingsDict}
          sectionPermissions={sectionPermissions}
          cartumSuscriptor={cartumSuscriptor}
          cartumSuscriptorTime={cartumSuscriptorTime}
        >
          {children}
        </MobileLayout>
      </>
    )
  }

  return (
    <>
      <ThemeSync theme={theme} />
      <CmsDictionarySetter dict={cmsDict} schemaPermissions={schemaPermissions} />
      <GlobalLoader />
      {noProject && <NoProjectModal d={dict.cms.noProject} />}
      <DesktopLayout
        currentProject={currentProject}
        projects={projects}
        userInitials={userInitials}
        userEmail={userEmail}
        userId={userId}
        isSuperAdmin={isSuperAdmin}
        isAdmin={isAdmin}
        settingsDict={settingsDict}
        sectionPermissions={sectionPermissions}
        cartumSuscriptor={cartumSuscriptor}
        cartumSuscriptorTime={cartumSuscriptorTime}
      >
        {children}
      </DesktopLayout>
    </>
  )
}
