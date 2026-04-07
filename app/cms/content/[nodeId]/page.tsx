import { redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { auth } from '@/auth'
import { db } from '@/db'
import { project } from '@/db/schema'
import { getDictionary } from '@/locales'
import { nodesRepository } from '@/db/repositories/nodes.repository'
import { rolesService } from '@/lib/services/roles.service'
import { recordsService } from '@/lib/services/records.service'
import { isMobileUserAgent } from '@/lib/utils/ua'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { BreadcrumbSetter } from '@/components/ui/molecules/BreadcrumbSetter'
import { RecordListClient } from '@/components/ui/organisms/RecordListClient'
import { MobileRecordList } from '@/components/ui/organisms/MobileRecordList'
import type { SupportedLocale } from '@/types/project'
import type { FieldNode } from '@/types/nodes'

export default async function ContentNodePage({
  params,
}: {
  params: Promise<{ nodeId: string }>
}) {
  const { nodeId } = await params

  const session = await auth()
  if (!session) redirect('/login')

  let canCreate = false
  let canUpdate = false
  let canDelete = false

  if (session.user.isSuperAdmin) {
    canCreate = canUpdate = canDelete = true
  } else {
    const perms = await rolesService.resolvePermissions(session.user.id, nodeId)
    if (!perms.canRead) redirect('/cms/content')
    canCreate = perms.canCreate
    canUpdate = perms.canUpdate
    canDelete = perms.canDelete
  }

  const [proj] = await db
    .select({ defaultLocale: project.defaultLocale })
    .from(project)
    .limit(1)

  const locale = (proj?.defaultLocale ?? 'en') as SupportedLocale
  const d      = getDictionary(locale).cms

  const [node, children, breadcrumbs] = await Promise.all([
    nodesRepository.findById(nodeId),
    nodesRepository.findChildren(nodeId),
    nodesRepository.findAncestors(nodeId),
  ])

  if (!node || node.type !== 'container') redirect('/cms/content')

  const fields  = children.filter((n): n is FieldNode => n.type === 'field')
  const records = await recordsService.getByNodeId(nodeId)

  const ua     = (await headers()).get('user-agent') ?? ''
  const mobile = isMobileUserAgent(ua)

  if (mobile) {
    return (
      <>
        <BreadcrumbSetter items={breadcrumbs} parentId={node.parentId} />
        <VHSTransition duration="full" className="flex flex-col">
          <div className="flex items-center justify-between gap-4 px-3 pt-3">
            <h1 className="font-mono text-sm font-semibold text-text">{node.name}</h1>
            {canCreate && (
              <Link
                href={`/cms/content/${nodeId}/new`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 font-mono text-xs text-white"
              >
                {d.content.list.newRecord}
              </Link>
            )}
          </div>
          <MobileRecordList
            nodeId={nodeId}
            fields={fields}
            records={records}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </VHSTransition>
      </>
    )
  }

  return (
    <>
      <BreadcrumbSetter items={breadcrumbs} parentId={node.parentId} />
      <VHSTransition duration="full" className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-mono text-lg font-semibold text-text">{node.name}</h1>
          {canCreate && (
            <Link
              href={`/cms/content/${nodeId}/new`}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 font-mono text-xs text-white transition-colors hover:brightness-110"
            >
              {d.content.list.newRecord}
            </Link>
          )}
        </div>

        <RecordListClient
          nodeId={nodeId}
          fields={fields}
          records={records}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      </VHSTransition>
    </>
  )
}
