import pkg from '@/package.json'

type StackEntry = { label: string; version: string; color: string; href: string }

function v(raw: string): string {
  return raw.replace(/^[\^~]/, '')
}

export const STACK: StackEntry[] = [
  { label: 'Next.js',       version: v(pkg.dependencies.next),                  color: '#000000', href: 'https://nextjs.org' },
  { label: 'React',         version: v(pkg.dependencies.react),                 color: '#087ea4', href: 'https://react.dev' },
  { label: 'TypeScript',    version: v(pkg.devDependencies.typescript),         color: '#3178c6', href: 'https://typescriptlang.org' },
  { label: 'Tailwind CSS',  version: v(pkg.devDependencies.tailwindcss),        color: '#0ea5e9', href: 'https://tailwindcss.com' },
  { label: 'Drizzle ORM',   version: v(pkg.dependencies['drizzle-orm']),        color: '#c5f74f', href: 'https://orm.drizzle.team' },
  { label: 'PostgreSQL',    version: 'Neon',                                    color: '#336791', href: 'https://neon.tech' },
  { label: 'Cloudflare R2', version: 'S3-API',                                  color: '#f38020', href: 'https://developers.cloudflare.com/r2' },
  { label: 'Zustand',       version: v(pkg.dependencies.zustand),               color: '#443e3e', href: 'https://zustand-demo.pmnd.rs' },
  { label: 'Sonner',        version: v(pkg.dependencies.sonner),                color: '#6366f1', href: 'https://sonner.emilkowal.ski' },
]

export const CMS_VERSION: string = pkg.version
