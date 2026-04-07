import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/db'
import { project } from '@/db/schema'
import { getDictionary } from '@/locales'
import { nodesRepository } from '@/db/repositories/nodes.repository'
import { rolesService } from '@/lib/services/roles.service'
import { recordsService } from '@/lib/services/records.service'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { BreadcrumbSetter } from '@/components/ui/molecules/BreadcrumbSetter'
import { RecordForm } from '@/components/ui/organisms/RecordForm'
import type { SupportedLocale } from '@/types/project'
import type { FieldNode } from '@/types/nodes'

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ nodeId: string; recordId: string }>
}) {
  const { nodeId, recordId } = await params

  const session = await auth()
  if (!session) redirect('/login')

  let canUpdate = false

  if (session.user.isSuperAdmin) {
    canUpdate = true
  } else {
    const perms = await rolesService.resolvePermissions(session.user.id, nodeId)
    if (!perms.canRead) redirect('/cms/content')
    canUpdate = perms.canUpdate
  }

  const [proj] = await db
    .select({ defaultLocale: project.defaultLocale })
    .from(project)
    .limit(1)

  const locale = (proj?.defaultLocale ?? 'en') as SupportedLocale
  const d      = getDictionary(locale).cms

  const [node, children, record, breadcrumbs] = await Promise.all([
    nodesRepository.findById(nodeId),
    nodesRepository.findChildren(nodeId),
    recordsService.getById(nodeId, recordId),
    nodesRepository.findAncestors(nodeId),
  ])

  if (!node || node.type !== 'container') redirect('/cms/content')
  if (!record) redirect(`/cms/content/${nodeId}`)

  const fields              = children.filter((n): n is FieldNode => n.type === 'field')
  const isStorageConfigured = !!process.env.R2_ENDPOINT

  return (
    <>
      <BreadcrumbSetter items={breadcrumbs} parentId={node.parentId} />
      <VHSTransition duration="full" className="flex flex-col gap-6 p-6">
        <h1 className="font-mono text-lg font-semibold text-text">{d.content.form.editTitle}</h1>
        <RecordForm
          nodeId={nodeId}
          fields={fields}
          isStorageConfigured={isStorageConfigured}
          initial={record}
          canUpdate={canUpdate}
        />
      </VHSTransition>
    </>
  )
}
