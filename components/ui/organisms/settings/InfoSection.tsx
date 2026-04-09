'use client'

import { ExternalLink } from 'lucide-react'
import type { Dictionary } from '@/locales/en'

export type InfoSectionProps = {
  d: Dictionary['settings']['info']
}

// Stack badges — versions kept in sync with package.json
const STACK: { label: string; version: string; color: string; href: string }[] = [
  { label: 'Next.js',       version: '16.2',   color: '#000000', href: 'https://nextjs.org' },
  { label: 'React',         version: '19.2',   color: '#087ea4', href: 'https://react.dev' },
  { label: 'TypeScript',    version: '6.0',    color: '#3178c6', href: 'https://typescriptlang.org' },
  { label: 'Tailwind CSS',  version: '4.1',    color: '#0ea5e9', href: 'https://tailwindcss.com' },
  { label: 'Drizzle ORM',   version: '0.45',   color: '#c5f74f', href: 'https://orm.drizzle.team' },
  { label: 'PostgreSQL',    version: 'Neon',   color: '#336791', href: 'https://neon.tech' },
  { label: 'Cloudflare R2', version: 'S3-API', color: '#f38020', href: 'https://developers.cloudflare.com/r2' },
  { label: 'Zustand',       version: '5.0',    color: '#443e3e', href: 'https://zustand-demo.pmnd.rs' },
  { label: 'Sonner',        version: '2.0',    color: '#6366f1', href: 'https://sonner.emilkowal.ski' },
]

export function InfoSection({ d }: InfoSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="font-mono text-sm font-medium text-text">{d.title}</h2>

      {/* Version + License */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <Row label={d.versionLabel}>
          <span className="font-mono text-sm text-primary">{d.version}</span>
        </Row>
        <Divider />
        <Row label={d.releasedOn}>
          <span className="font-mono text-sm text-muted">{d.releaseDate}</span>
        </Row>
        <Divider />
        <Row label={d.license}>
          <span className="font-mono text-sm text-muted">{d.licenseValue}</span>
        </Row>
      </div>

      {/* Stack badges */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <p className="font-mono text-xs text-muted uppercase tracking-widest">{d.builtWith}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {STACK.map(({ label, version, color, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-stretch rounded overflow-hidden border border-white/5 text-[11px] font-mono no-underline hover:brightness-110 transition-[filter] select-none"
            >
              {/* Left: label */}
              <span
                className="px-2 py-0.5 leading-5"
                style={{ backgroundColor: '#1e1e2e', color: '#e2e8f0' }}
              >
                {label}
              </span>
              {/* Right: version pill */}
              <span
                className="px-2 py-0.5 leading-5 font-semibold"
                style={{ backgroundColor: color, color: isLight(color) ? '#1a1a1a' : '#ffffff' }}
              >
                {version}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <LinkRow label={d.docs} href={d.docsUrl} text={d.docs} color="primary" />
        <Divider />
        <LinkRow label={d.openSource} href={d.openSourceUrl} text="GitHub" color="primary" />
        <Divider />
        <LinkRow label={d.developedBy} href="https://azanorivers.com" text="azanorivers.com" color="accent" />
      </div>
    </div>
  )
}

// ── Local helpers ─────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-mono text-xs text-muted shrink-0">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  )
}

function LinkRow({ label, href, text, color }: { label: string; href: string; text: string; color: 'primary' | 'accent' }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="font-mono text-xs text-muted shrink-0">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 font-mono text-xs hover:underline sm:text-right ${color === 'accent' ? 'text-accent' : 'text-primary'}`}
      >
        {text} <ExternalLink size={10} />
      </a>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-border" />
}

/** Naive luminance check to decide badge text color */
function isLight(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 140
}
