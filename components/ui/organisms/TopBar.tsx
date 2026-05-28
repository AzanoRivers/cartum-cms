'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { BreadcrumbBar } from '@/components/ui/molecules/BreadcrumbBar'
import { ProjectSelector } from '@/components/ui/molecules/ProjectSelector'
import { CreateProjectModal } from '@/components/ui/molecules/CreateProjectModal'
import { Tooltip } from '@/components/ui/atoms/Tooltip'
import { useUIStore } from '@/lib/stores/uiStore'
import type { ProjectItem } from '@/components/ui/molecules/ProjectSelector'

const TRIAL_SECONDS = 7 * 86_400

export type TopBarProps = {
  currentProject:       ProjectItem
  projects:             ProjectItem[]
  userInitials:         string
  isSuperAdmin:         boolean
  cartumSuscriptor:     boolean
  cartumSuscriptorTime: number
}

export function TopBar({ currentProject, projects, userInitials, isSuperAdmin, cartumSuscriptor, cartumSuscriptorTime }: TopBarProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen]         = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const breadcrumb = useUIStore((s) => s.breadcrumb)
  const d          = useUIStore((s) => s.cmsDict)
  const openSettings     = useUIStore((s) => s.openSettings)
  const setGlobalLoading = useUIStore((s) => s.setGlobalLoading)

  const trialBadge = (() => {
    if (isSuperAdmin) return (
      <span className="flex items-center rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5">
        <span className="cartum-neon-rainbow font-mono text-[10px] font-semibold tracking-wide">
          super_admin
        </span>
      </span>
    )
    const daysLeft = cartumSuscriptor
      ? Math.max(0, Math.floor((cartumSuscriptorTime + TRIAL_SECONDS - Date.now() / 1000) / 86_400))
      : 0
    const tooltipText = d?.topBar.trialTooltip ?? 'CartumCMS subscription time'
    if (daysLeft > 0) {
      const label = (d?.topBar.trialDaysLeft ?? '{n}d left').replace('{n}', String(daysLeft))
      return (
        <Tooltip content={tooltipText} side="bottom">
          <span className="flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 font-mono text-[10px] text-warning cursor-default">
            ⏱ {label}
          </span>
        </Tooltip>
      )
    }
    return (
      <Tooltip content={tooltipText} side="bottom">
        <span className="flex items-center rounded-full border border-muted/30 bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-muted cursor-default">
          {d?.topBar.freeTier ?? 'Free Tier'}
        </span>
      </Tooltip>
    )
  })()

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
    <>
      <header className="relative z-40 flex h-10 items-center justify-between border-b border-border bg-surface px-4 shrink-0">
        {/* Left: logo + project selector */}
        <div className="flex items-center gap-2 min-w-0">
          <Image
            src="/images/brand/icon.svg"
            alt="Cartum"
            width={18}
            height={18}
            className="shrink-0"
          />
          <ProjectSelector
            currentProject={currentProject}
            projects={projects}
            onCreateNew={() => setShowCreateModal(true)}
          />
        </div>

        {/* Center: breadcrumb — hidden on mobile */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex max-w-[min(50vw,540px)] overflow-hidden">
          <BreadcrumbBar breadcrumb={breadcrumb} maxItems={4} />
        </div>

        {/* Right: trial badge + avatar */}
        <div className="flex items-center gap-2">
        {trialBadge}
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
        </div>
      </header>

      {showCreateModal && d?.newProjectModal && (
        <CreateProjectModal
          d={d.newProjectModal}
          defaultLocale={currentProject.locale ?? 'en'}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  )
}
