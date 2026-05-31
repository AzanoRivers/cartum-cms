import { redirect } from 'next/navigation'

// Docs are now at /docs (public, no auth required).
// This keeps backwards compatibility for bookmarks and internal links.
export default function CmsDocsRedirect() {
  redirect('/docs')
}
