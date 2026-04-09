import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { InfiniteCanvas } from '@/components/ui/organisms/InfiniteCanvas'
import { BreadcrumbSetter } from '@/components/ui/molecules/BreadcrumbSetter'
import { nodeService } from '@/lib/services/nodes.service'
import { connectionsService } from '@/lib/services/connections.service'
import { rolesService } from '@/lib/services/roles.service'

type Props = {
  params: Promise<{ nodeId: string[] }>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function generateMetadata({ params }: Props) {
  const { nodeId } = await params
  const currentId = nodeId.at(-1)
  if (!currentId || !UUID_RE.test(currentId)) return {}
  const breadcrumb = await nodeService.getBreadcrumb(currentId)
  const current = breadcrumb.at(-1)
  return { title: current?.name ?? 'Board' }
}

export default async function NestedBoardPage({ params }: Props) {
  const { nodeId } = await params
  const currentId = nodeId.at(-1)
  if (!currentId || !UUID_RE.test(currentId)) notFound()

  const session = await auth()
  if (!session) redirect('/login')

  const [permsResult, nodes, breadcrumb, connections] = await Promise.all([
    session.user.isSuperAdmin
      ? Promise.resolve(null)
      : rolesService.resolvePermissions(session.user.id, currentId),
    nodeService.getBoard(currentId),
    nodeService.getBreadcrumb(currentId),
    connectionsService.getForBoard(currentId),
  ])

  if (permsResult && !permsResult.canRead) notFound()

  // Node doesn't exist in DB
  if (breadcrumb.length === 0 && nodes.length === 0) notFound()

  const isStorageConfigured = !!process.env.R2_ENDPOINT

  return (
    <>
      {/* Sync this route's breadcrumb + parentId into TopBar / NodeCreationPanel */}
      <BreadcrumbSetter items={breadcrumb} parentId={currentId} />
      <VHSTransition duration="full" trigger={currentId} className="flex flex-1 overflow-hidden">
        <InfiniteCanvas
          initialNodes={nodes}
          connections={connections}
          isStorageConfigured={isStorageConfigured}
        />
      </VHSTransition>
    </>
  )
}
