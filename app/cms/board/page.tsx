import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { InfiniteCanvas } from '@/components/ui/organisms/InfiniteCanvas'
import { BreadcrumbSetter } from '@/components/ui/molecules/BreadcrumbSetter'
import { nodeService } from '@/lib/services/nodes.service'
import { connectionsService } from '@/lib/services/connections.service'
import { rolesService } from '@/lib/services/roles.service'
import { auth } from '@/auth'

export const metadata = { title: 'Board' }

export default async function BoardPage() {
  const session = await auth()
  const userId = session?.user?.id

  const [allNodes, connections] = await Promise.all([
    nodeService.getBoard(null),
    connectionsService.getForBoard(null),
  ])

  // Non-superAdmins see only the nodes for which they have canRead
  let nodes = allNodes
  if (!session?.user?.isSuperAdmin && userId) {
    const accessibleIds = new Set(await rolesService.getAccessibleNodes(userId))
    nodes = allNodes.filter((n) => accessibleIds.has(n.id))
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

