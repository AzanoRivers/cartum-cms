'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { ChevronDown, PlusCircle, Check } from 'lucide-react'
import { switchProject } from '@/lib/actions/project.actions'
import { useUIStore } from '@/lib/stores/uiStore'

export type ProjectItem = { id: string; name: string; locale?: string }

export type ProjectSelectorProps = {
  currentProject: ProjectItem
  projects:       ProjectItem[]
  onCreateNew:    () => void
}

export function ProjectSelector({ currentProject, projects, onCreateNew }: ProjectSelectorProps) {
  const [open, setOpen]             = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const setGlobalLoading = useUIStore((s) => s.setGlobalLoading)
  const d                = useUIStore((s) => s.cmsDict)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown, { capture: true })
    }
  }, [])

  function handleSwitch(projectId: string) {
    if (projectId === currentProject.id) { setOpen(false); return }
    setOpen(false)
    setGlobalLoading(true)
    startTransition(async () => {
      await switchProject(projectId)
      // Signal the next page to show an opaque overlay immediately (before React hydrates)
      // so no theme flash is visible during the hard navigation.
      try { sessionStorage.setItem('cartum-project-switching', '1') } catch {}
      window.location.href = '/cms/board'
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-sm text-text transition-colors hover:bg-surface-2 cursor-pointer disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
        <span className="max-w-[160px] truncate">{currentProject.name}</span>
        <ChevronDown
          size={12}
          className={`text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Projects"
          className="absolute left-0 top-full mt-1.5 w-56 rounded-lg border border-border bg-surface shadow-xl z-50 py-1 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {projects.map((p) => (
            <button
              key={p.id}
              role="option"
              aria-selected={p.id === currentProject.id}
              onClick={() => handleSwitch(p.id)}
              className={[
                'flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-mono transition-colors',
                p.id === currentProject.id
                  ? 'border-l-2 border-primary pl-2.5 text-text'
                  : 'text-muted hover:text-text hover:bg-surface-2',
              ].join(' ')}
            >
              {p.id === currentProject.id
                ? <Check size={12} className="text-primary shrink-0" />
                : <span className="w-3 shrink-0" />}
              <span className="truncate">{p.name}</span>
            </button>
          ))}

          <div className="my-1 border-t border-border/60" />
          <button
            onClick={() => { setOpen(false); onCreateNew() }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-mono text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          >
            <PlusCircle size={12} className="shrink-0" />
            {d?.projectSelector.newProject ?? 'New project'}
          </button>
        </div>
      )}
    </div>
  )
}
