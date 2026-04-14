import { db } from '@/db'
import { project } from '@/db/schema'
import { getDictionary } from '@/locales'
import type { SupportedLocale } from '@/types/project'
import { BreadcrumbSetter } from '@/components/ui/molecules/BreadcrumbSetter'
import { DocsPage } from '@/components/ui/organisms/docs/DocsPage'

export default async function CmsDocsPage() {
  const [proj] = await db
    .select({ defaultLocale: project.defaultLocale })
    .from(project)
    .limit(1)

  const locale = (proj?.defaultLocale ?? 'en') as SupportedLocale
  const dict = getDictionary(locale)
  const d = dict.cms.docs

  return (
    <>
      <BreadcrumbSetter items={[{ id: 'docs', name: d.breadcrumb }]} parentId={null} />
      <DocsPage d={d} />
    </>
  )
}
