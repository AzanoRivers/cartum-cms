'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { BreadcrumbBar } from '@/components/ui/molecules/BreadcrumbBar'
import { useUIStore } from '@/lib/stores/uiStore'

export type TopBarProps = {
  projectName: string
  userInitials: string
}

export function TopBar({ projectName, userInitials }: TopBarProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const breadcrumb = useUIStore((s) => s.breadcrumb)
  const d          = useUIStore((s) => s.cmsDict)
  const openSettings     = useUIStore((s) => s.openSettings)
  const setGlobalLoading = useUIStore((s) => s.setGlobalLoading)

  async function handleLogout() {
    setMenuOpen(false)
    setGlobalLoading(true)
    const { logout } = await import('@/lib/actions/logout.actions')
    await logout()
    router.push('/login')
  }

  function handleAccount() {
    setMenuOpen(false)
    openSettings('account')
  }

  return (
    <header className="relative z-20 flex h-10 items-center justify-between border-b border-border bg-surface px-4 shrink-0">
      {/* Left: logo + project name */}
      <div className="flex items-center gap-2 min-w-0">
        <Image
          src="/images/brand/icon.svg"
          alt="Cartum"
          width={18}
          height={18}
          className="shrink-0"
        />
        <span className="font-mono text-sm text-text/80 truncate max-w-40 select-none">
          {projectName}
        </span>
      </div>

      {/* Center: breadcrumb — hidden on mobile (MobileBreadcrumbBar handles it) */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex max-w-[min(50vw,540px)] overflow-hidden">
        <BreadcrumbBar breadcrumb={breadcrumb} maxItems={4} />
      </div>

      {/* Right: avatar */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 border border-primary/40 text-primary font-mono text-[13px] cursor-pointer hover:bg-primary/30 transition-colors"
          aria-label={d?.topBar.userMenuAriaLabel ?? 'User menu'}
        >
          {userInitials}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-8 z-50 min-w-36 rounded-lg border border-border bg-surface shadow-lg overflow-hidden">
            <button
              onClick={handleAccount}
              className="w-full px-3 py-2 text-left text-xs text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer font-mono"
            >
              {d?.topBar.account ?? 'Account'}
            </button>
            <div className="h-px bg-border" />
            <button
              onClick={handleLogout}
              className="w-full px-3 py-2 text-left text-xs text-text hover:bg-surface-2 transition-colors cursor-pointer"
            >
              {d?.topBar.logOut ?? 'Log out'}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

