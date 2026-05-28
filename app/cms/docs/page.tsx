import { getDictionary } from '@/locales'
import { getCurrentLocale } from '@/lib/utils/get-current-locale'
import { BreadcrumbSetter } from '@/components/ui/molecules/BreadcrumbSetter'
import { DocsPage } from '@/components/ui/organisms/docs/DocsPage'

export async function generateMetadata() {
  const locale = await getCurrentLocale()
  return { title: getDictionary(locale).cms.docs.title }
}

export default async function CmsDocsPage() {
  const locale = await getCurrentLocale()
  const dict = getDictionary(locale)
  const d = dict.cms.docs

  return (
    <>
      <BreadcrumbSetter items={[{ id: 'docs', name: d.breadcrumb }]} parentId={null} />
      <DocsPage d={d} />
    </>
  )
}
