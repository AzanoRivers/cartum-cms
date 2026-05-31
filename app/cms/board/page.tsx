import { cookies } from 'next/headers'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { InfiniteCanvas } from '@/components/ui/organisms/InfiniteCanvas'
import { BreadcrumbSetter } from '@/components/ui/molecules/BreadcrumbSetter'
import { nodeService } from '@/lib/services/nodes.service'
import { connectionsService } from '@/lib/services/connections.service'
import { rolesService } from '@/lib/services/roles.service'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { auth } from '@/auth'
import { getDictionary } from '@/locales'
import { getCurrentLocale } from '@/lib/utils/get-current-locale'
import { ACTIVE_PROJECT_COOKIE } from '@/lib/auth/constants'
import { ROLE_ADMIN } from '@/types/roles'

export async function generateMetadata() {
  const locale = await getCurrentLocale()
  return { title: getDictionary(locale).cms.board.title }
}

export default async function BoardPage() {
  const session     = await auth()
  const userId      = session?.user?.id
  const cookieStore = await cookies()
  const projectId   = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? session?.user?.currentProjectId

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        No hay proyecto seleccionado.
      </div>
    )
  }

  const [allNodes, connections] = await Promise.all([
    nodeService.getBoard(null, projectId),
    connectionsService.getForBoard(null, projectId),
  ])

  // SuperAdmins and project admins see all nodes; others see only nodes with canRead
  let nodes = allNodes
  if (!session?.user?.isSuperAdmin && userId) {
    const isGlobalAdmin  = (session.user.roles ?? []).includes(ROLE_ADMIN)
    const isProjectAdmin = isGlobalAdmin
      || await projectMembershipsRepository.isMemberWithRole(userId, projectId, 'admin')

    if (!isProjectAdmin) {
      const accessibleIds = new Set(await rolesService.getAccessibleNodes(userId, projectId))
      nodes = allNodes.filter((n) => accessibleIds.has(n.id))
    }
  }

  const isStorageConfigured = !!process.env.R2_ENDPOINT

  return (
    <>
      {/* Sync breadcrumb (root = empty) into the layout-level TopBar */}
      <BreadcrumbSetter items={[]} parentId={null} />
      <VHSTransition duration="full" className="flex flex-1 overflow-hidden">
        <InfiniteCanvas
          initialNodes={nodes}
          connections={connections}
          isStorageConfigured={isStorageConfigured}
        />
      </VHSTransition>
    </>
  )
}

