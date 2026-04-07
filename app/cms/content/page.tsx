import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { db } from '@/db'
import { project } from '@/db/schema'
import { getDictionary } from '@/locales'
import { nodesRepository } from '@/db/repositories/nodes.repository'
import { recordsRepository } from '@/db/repositories/records.repository'
import { rolesService } from '@/lib/services/roles.service'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { BreadcrumbSetter } from '@/components/ui/molecules/BreadcrumbSetter'
import type { SupportedLocale } from '@/types/project'

export const metadata = { title: 'Content' }

export default async function ContentIndexPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [proj] = await db
    .select({ defaultLocale: project.defaultLocale })
    .from(project)
    .limit(1)

  const locale  = (proj?.defaultLocale ?? 'en') as SupportedLocale
  const d       = getDictionary(locale).cms

  const contentNodes = session.user.isSuperAdmin
    ? await nodesRepository.findFullTree()
    : await (async () => {
        const nodeIds = await rolesService.getAccessibleNodes(session.user.id)
        return nodeIds.length > 0 ? nodesRepository.findByIds(nodeIds) : []
      })()

  const countMap: Record<string, number> = {}
  await Promise.all(
    contentNodes.map(async (n) => {
      countMap[n.id] = await recordsRepository.countByNodeId(n.id)
    })
  )

  return (
    <>
      <BreadcrumbSetter items={[]} parentId={null} />
      <VHSTransition duration="full" className="flex flex-col gap-6 p-6">
        {contentNodes.length === 0 ? (
          <div className="rounded-md border border-border bg-surface px-6 py-12 text-center">
            <p className="font-mono text-sm text-muted">{d.content.index.emptyOwn}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contentNodes.map((node) => (
              <Link
                key={node.id}
                href={`/cms/content/${node.id}`}
                className="group flex flex-col gap-2 rounded-md border border-border bg-surface p-5 transition-colors hover:border-primary"
              >
                <span className="font-medium text-text transition-colors group-hover:text-primary">
                  {node.name}
                </span>
                <span className="font-mono text-xs text-muted">
                  {countMap[node.id] ?? 0} {d.content.index.records}
                </span>
                <span className="mt-auto font-mono text-[10px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {d.content.index.browse} →
                </span>
              </Link>
            ))}
          </div>
        )}
      </VHSTransition>
    </>
  )
}
