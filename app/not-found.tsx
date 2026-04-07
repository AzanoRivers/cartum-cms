import Link from 'next/link'
import Image from 'next/image'
import { getLocale } from '@/lib/i18n/getLocale'
import { getDictionary } from '@/locales'

export default async function NotFound() {
  const locale = await getLocale()
  const d = getDictionary(locale).cms.notFound

  return (
    <div className="min-h-screen bg-background text-text flex items-center justify-center p-6">
      {/* Scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-md w-full">
        {/* Icon + brand name */}
        <div className="flex flex-col items-center gap-2">
          <Image
            src="/images/brand/icon.svg"
            alt="Cartum icon"
            width={44}
            height={44}
            priority
            className="opacity-90"
          />
          <span className="font-mono text-xs text-muted tracking-widest uppercase">Cartum CMS</span>
        </div>

        {/* Glitch 404 */}
        <span
          className="font-mono text-[7rem] font-bold leading-none tracking-tighter text-primary select-none"
          style={{ textShadow: '3px 0 0 rgba(239,68,68,0.5), -3px 0 0 rgba(34,211,238,0.5)' }}
          aria-hidden="true"
        >
          404
        </span>

        {/* Title + message */}
        <div className="space-y-3">
          <h1 className="font-mono text-lg font-semibold text-text">{d.title}</h1>
          <p className="font-mono text-sm text-muted leading-relaxed">{d.message}</p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-border" />

        {/* CTA */}
        <Link
          href="/cms/board"
          className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-5 py-2.5 font-mono text-sm text-primary transition-all hover:bg-primary/20 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          ← {d.back}
        </Link>
      </div>
    </div>
  )
}


