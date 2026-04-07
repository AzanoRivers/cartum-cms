'use client'

/**
 * Floating brand footer — fixed bottom-center.
 * Minimal dark aesthetic with ultra-subtle neon glow on the links.
 * Never blocks UI interaction (pointer-events: none on wrapper).
 */
export function BrandFooter() {
  return (
    <div
      className="fixed bottom-3 inset-x-0 z-40 pointer-events-none flex md:justify-start md:pl-4 justify-center"
      aria-hidden="true"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/50 bg-surface px-4 py-1.5">
        <span className="font-mono text-[11px] md:text-xs text-muted/80 tracking-wide select-none">
          by
        </span>

        <a
          href="https://azanorivers.com"
          target="_blank"
          rel="noopener noreferrer"
          className="brand-link group font-mono text-[11px] md:text-xs tracking-wide text-muted transition-colors duration-300 hover:text-accent"
        >
          <span className="brand-glow">AzanoRivers</span>
        </a>

        <span className="font-mono text-[11px] md:text-xs text-muted/50 select-none">·</span>

        <a
          href="https://azanolabs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="brand-link group font-mono text-[11px] md:text-xs tracking-wide text-muted transition-colors duration-300 hover:text-primary"
        >
          <span className="brand-glow-primary">AzanoLabs</span>
        </a>

        <span className="font-mono text-[11px] md:text-xs text-muted/30 select-none">·</span>

        <span className="cartum-neon-rainbow font-mono text-[11px] md:text-xs tracking-wide select-none font-semibold">
          CARTUM CMS
        </span>
      </div>
    </div>
  )
}
