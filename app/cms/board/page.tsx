import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { InfiniteCanvas } from '@/components/ui/organisms/InfiniteCanvas'
import { BreadcrumbSetter } from '@/components/ui/molecules/BreadcrumbSetter'
import { nodeService } from '@/lib/services/nodes.service'
import { connectionsService } from '@/lib/services/connections.service'

export const metadata = { title: 'Board' }

export default async function BoardPage() {
  const [nodes, connections] = await Promise.all([
    nodeService.getBoard(null),
    connectionsService.getForBoard(null),
  ])

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
