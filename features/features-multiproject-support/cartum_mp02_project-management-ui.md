# MP-02 — Multi-Project: Project Management UI & Player Route

## Goal

Build all user-facing surfaces for multi-project navigation:

1. **Project Selector** — replaces the static project title in the CMS topbar; dropdown to switch between projects or create a new one
2. **Create Project Flow** — modal form with name + description + locale; creates project capsule and switches to it
3. **`/cartum-player` route** — public registration page (gated by `CARTUM_NEW_PLAYER=true` env var) that creates a new user + a new project in a single transaction; only accessible by manually typing the URL

---

## Prerequisites

- MP-01 database capsule architecture implemented
- `createProjectService`, `getUserProjectsService`, `switchProject` actions working
- CMS topbar / dock components identified: `components/ui/organisms/TopBar.tsx` (or equivalent)
- Auth.js session carries `currentProjectId`
- Login page design to reference for `/cartum-player` styling

---

## Feature 1 — Project Selector

### Behavior

The current project name is displayed in the topbar. With multi-project support, this element becomes an interactive selector:

- **1 project:** Shows project name + small chevron down; clicking opens dropdown with only "New Project" option
- **2+ projects:** Shows project name + chevron; clicking opens dropdown with all the user's projects + "New Project" option at the bottom
- **Active project:** Highlighted with primary color dot or border
- **Switch:** Click a project name → calls `switchProject(id)` → server redirects to `/cms/board`
- **New Project:** Opens `<CreateProjectModal>` inline (no page navigation)

### Visual Design

```
┌─────────────────────────────────────────┐
│ ● My Awesome Project         ⌄          │  ← interactive trigger
└─────────────────────────────────────────┘
         ↓ (dropdown, 220px wide)
┌─────────────────────────────────────────┐
│  ● My Awesome Project  (active)         │
│  ○ Client Beta                          │
│  ○ E-commerce Playground               │
│  ─────────────────────────────────────  │
│  + New project                          │
└─────────────────────────────────────────┘
```

**Aesthetic:** Matches existing dark-first design.
- Dropdown: `bg-surface border border-border rounded-lg shadow-xl z-50`
- Active item: `border-l-2 border-primary pl-3 text-text`
- Inactive items: `text-muted hover:text-text hover:bg-surface-2`
- "New project" row: `text-primary hover:bg-primary/10 font-mono text-xs`
- Separator: `border-t border-border/60 my-1`
- Close on outside click (same pattern as `MultiSelectionContextMenu`)
- Close on `Escape`

### Component: `components/ui/molecules/ProjectSelector.tsx`

```tsx
'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, PlusCircle, Check } from 'lucide-react'
import { switchProject } from '@/lib/actions/project.actions'

type Project = { id: string; name: string }

type ProjectSelectorProps = {
  currentProject: Project
  projects: Project[]
  onCreateNew: () => void
}

export function ProjectSelector({ currentProject, projects, onCreateNew }: ProjectSelectorProps) {
  const [open, setOpen]           = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
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
    startTransition(() => switchProject(projectId))
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-sm text-text transition-colors hover:bg-surface-2 cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
        <span className="max-w-[160px] truncate">{currentProject.name}</span>
        <ChevronDown size={12} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
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
                : <span className="w-3 shrink-0" />
              }
              <span className="truncate">{p.name}</span>
            </button>
          ))}

          {/* Separator + New project */}
          <div className="my-1 border-t border-border/60" />
          <button
            onClick={() => { setOpen(false); onCreateNew() }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-mono text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          >
            <PlusCircle size={12} className="shrink-0" />
            New project
          </button>
        </div>
      )}
    </div>
  )
}
```

### Topbar Integration

The `ProjectSelector` replaces wherever the static project name is currently rendered in the topbar. Projects list and current project are fetched server-side and passed as props.

```tsx
// In the topbar Server Component (or layout):
const session       = await auth()
const currentProjId = session?.user.currentProjectId
const projects      = await getMyProjects()
const current       = projects.find(p => p.id === currentProjId) ?? projects[0]
// Pass to client topbar component:
// <TopBar currentProject={current} projects={projects} ... />
```

---

## Feature 2 — Create Project Modal

### Behavior

Opened from ProjectSelector's "New project" option or from a dedicated button when user has 0 projects.

- Form: project name (required), description (optional), locale (en | es, optional default: en)
- Submit → server action `createProject()` → creates project + membership → switches session → redirects to `/cms/board`
- Loading state during submission (spinner on button, fields disabled)
- Error: shows inline error if name is blank or server error occurs
- Escape / click-outside: closes modal

### Visual Design

```
┌───────────────────────────────────────────┐
│  New Project                          ✕   │
├───────────────────────────────────────────┤
│                                           │
│  Project name *                           │
│  ┌─────────────────────────────────────┐  │
│  │ My new project                      │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  Description (optional)                   │
│  ┌─────────────────────────────────────┐  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  Language                                 │
│  ○ English  ● Spanish                     │
│                                           │
│              [ Cancel ]  [ Create → ]     │
└───────────────────────────────────────────┘
```

**Aesthetic:** Matches existing modals (NodePanel, HelpPanel)
- Overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/50`
- Panel: `rounded-xl border border-border bg-surface shadow-2xl w-full max-w-sm`
- Apply `<VHSTransition duration="fast">` to the panel on mount

### Component: `components/ui/molecules/CreateProjectModal.tsx`

```tsx
'use client'

import { useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { Icon } from '@/components/ui/atoms/Icon'
import { createProject } from '@/lib/actions/project.actions'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'

type CreateProjectModalProps = {
  onClose: () => void
}

export function CreateProjectModal({ onClose }: CreateProjectModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  useFocusTrap(ref, true)

  async function handleSubmit(formData: FormData) {
    startTransition(() => createProject(formData))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <VHSTransition duration="fast" trigger={true} className="w-full max-w-sm px-4">
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label="New project"
          className="rounded-xl border border-border bg-surface shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Icon name="FolderPlus" size="sm" className="text-primary" />
              <span className="font-mono text-sm font-medium text-text">New project</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-border font-mono text-xs text-muted hover:border-border/80 hover:text-text cursor-pointer transition-colors"
            >✕</button>
          </div>

          {/* Form */}
          <form action={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-xs text-muted">Project name *</label>
              <input
                name="name"
                required
                disabled={isPending}
                placeholder="My project"
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-xs text-muted">Description (optional)</label>
              <textarea
                name="description"
                rows={2}
                disabled={isPending}
                placeholder="What is this project about?"
                className="w-full resize-none rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-xs text-muted">Language</label>
              <div className="flex gap-4">
                {[{ value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' }].map((loc) => (
                  <label key={loc.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="locale" value={loc.value} defaultChecked={loc.value === 'en'} className="accent-primary" />
                    <span className="font-mono text-xs text-muted">{loc.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50"
              >Cancel</button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-mono text-xs text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isPending ? 'Creating…' : 'Create →'}
              </button>
            </div>
          </form>
        </div>
      </VHSTransition>
    </div>
  )
}
```

---

## Feature 3 — `/cartum-player` Route

### Concept

A public-facing registration page for new users who are receiving access to the CMS for the first time. It is **not linked from anywhere** — must be accessed by typing the URL manually. Gated by `CARTUM_NEW_PLAYER=true` in `.env`.

When a new user registers via this page:
1. A user account is created
2. A new project capsule is created (with the name they provide)
3. The user becomes the admin of that project
4. The user is automatically logged in and redirected to `/cms/board`

### Environment Gate

```env
# .env
CARTUM_NEW_PLAYER=true
```

- `CARTUM_NEW_PLAYER=true` → page is accessible, registration works
- `CARTUM_NEW_PLAYER=false` or unset → `notFound()` (404)
- This env var is **never exposed** to the client (`NEXT_PUBLIC_` prefix is NOT used)

### Route: `app/(auth)/cartum-player/page.tsx`

```tsx
// app/(auth)/cartum-player/page.tsx
import { notFound } from 'next/navigation'
import { PlayerRegisterForm } from '@/components/ui/organisms/PlayerRegisterForm'

export const metadata = { title: 'Join Cartum' }

export default function CartumPlayerPage() {
  if (process.env.CARTUM_NEW_PLAYER !== 'true') notFound()
  return <PlayerRegisterForm />
}
```

### Visual Design

Matches the login page aesthetic exactly (dark-first, monospace, centered card) with additions:

```
┌────────────────────────────────────────────┐
│           ◈ CARTUM                         │  ← logo / brand mark
│                                            │
│         Join the platform                  │  ← subtitle
│                                            │
├────────────────────────────────────────────┤
│                                            │
│  Your name                                 │
│  ┌──────────────────────────────────────┐  │
│  │ Jane Doe                             │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Email address                             │
│  ┌──────────────────────────────────────┐  │
│  │ jane@example.com                     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Password                                  │
│  ┌──────────────────────────────────────┐  │
│  │ ••••••••••                     👁    │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Project name                              │
│  ┌──────────────────────────────────────┐  │
│  │ My workspace                         │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [ Create account and project ───────── ]  │  ← full-width primary button
│                                            │
│  Already have an account? Sign in →        │
│                                            │
└────────────────────────────────────────────┘
```

**Aesthetic rules:**
- Same card dimensions and border as login page: `max-w-sm`, `border border-border`, `rounded-xl`, `bg-surface`
- VHS transition on mount
- Input fields: same style as login inputs
- Error display: same inline error pattern as login
- Loading: button text changes to `Creating…` + spinner icon
- Bottom link: `text-muted hover:text-text` linking to `/`

### Server Action: `lib/actions/auth.actions.ts` (extend)

```typescript
// lib/actions/auth.actions.ts  — ADD this action

import { RegisterPlayerSchema } from '@/lib/actions/auth.schemas'
import { createUser } from '@/db/repositories/users.repository'
import { createProjectService } from '@/lib/services/project.service'
import { initializeSchemaService } from '@/lib/services/setup.service'
import { signIn } from '@/auth'

export async function registerPlayer(formData: FormData) {
  // 1. Gate check (env)
  if (process.env.CARTUM_NEW_PLAYER !== 'true') {
    throw new Error('REGISTRATION_DISABLED')
  }

  // 2. Validate
  const parsed = RegisterPlayerSchema.safeParse({
    name:        formData.get('name'),
    email:       formData.get('email'),
    password:    formData.get('password'),
    projectName: formData.get('projectName'),
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { name, email, password, projectName } = parsed.data

  // 3. Check if email already in use
  const existing = await usersRepository.findByEmail(email)
  if (existing) return { error: 'Email already in use.' }

  // 4. Hash password
  const passwordHash = await hashPassword(password)

  // 5. Create user
  const user = await usersRepository.create({ email, passwordHash, isSuperAdmin: false })

  // 6. Ensure default roles exist (idempotent)
  await initializeSchemaService()

  // 7. Create project + membership
  const { projectId } = await createProjectService({
    name:        projectName,
    description: '',
    locale:      'en',
    creatorId:   user.id,
  })

  // 8. Sign in automatically
  await signIn('credentials', {
    email,
    password,
    redirect: true,
    redirectTo: '/cms/board',
  })
}
```

### Zod Schema: `lib/actions/auth.schemas.ts` (extend)

```typescript
export const RegisterPlayerSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(80),
  email:       z.string().email('Invalid email address'),
  password:    z.string().min(8, 'Password must be at least 8 characters'),
  projectName: z.string().min(1, 'Project name is required').max(120),
})
```

### Component: `components/ui/organisms/PlayerRegisterForm.tsx`

```tsx
'use client'

import { useActionState } from 'react'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { registerPlayer } from '@/lib/actions/auth.actions'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function PlayerRegisterForm() {
  const [showPass, setShowPass] = useState(false)
  const [state, action, pending] = useActionState(registerPlayer, undefined)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <VHSTransition duration="normal" trigger className="w-full max-w-sm">
        <div className="rounded-xl border border-border bg-surface shadow-2xl">
          {/* Brand header */}
          <div className="flex flex-col items-center gap-1 border-b border-border px-8 py-6">
            <span className="font-mono text-xs text-muted tracking-widest uppercase">◈ CARTUM</span>
            <h1 className="font-mono text-base font-medium text-text">Join the platform</h1>
          </div>

          {/* Form */}
          <form action={action} className="p-6 space-y-4">
            {state?.error && (
              <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
                {state.error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs text-muted">Your name</label>
              <input
                name="name" type="text" required disabled={pending}
                placeholder="Jane Doe"
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs text-muted">Email address</label>
              <input
                name="email" type="email" required disabled={pending}
                placeholder="jane@example.com"
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs text-muted">Password</label>
              <div className="relative">
                <input
                  name="password" type={showPass ? 'text' : 'password'} required disabled={pending}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 pr-9 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
                />
                <button
                  type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text cursor-pointer"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Project name */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs text-muted">Project name</label>
              <input
                name="projectName" type="text" required disabled={pending}
                placeholder="My workspace"
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder:text-muted/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-mono text-sm text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
            >
              {pending ? 'Creating…' : 'Create account and project'}
            </button>

            {/* Link to login */}
            <p className="text-center font-mono text-xs text-muted">
              Already have an account?{' '}
              <a href="/" className="text-primary hover:underline">Sign in →</a>
            </p>
          </form>
        </div>
      </VHSTransition>
    </div>
  )
}
```

---

## Internal Project Creation (from within CMS)

When `CARTUM_NEW_PLAYER=false` (or unset), new projects can only be created **from inside the CMS** via the Project Selector's "New project" option. No dedicated page — only the `CreateProjectModal` is used. The modal is rendered in the CMS layout so it's available anywhere in the authenticated area.

### CMS layout integration

```tsx
// app/cms/layout.tsx  (client wrapper or page)
// 1. Fetch session + projects server-side
// 2. Pass to <TopBarWithProjectSelector> client component
// 3. <TopBarWithProjectSelector> manages `showCreateModal` state
//    and renders <CreateProjectModal> when triggered
```

---

## Locale Additions (en.ts + es.ts)

```typescript
// en.ts — add to cms section
projectSelector: {
  switchProject:   'Switch project',
  newProject:      'New project',
  createTitle:     'New project',
  namePlaceholder: 'My project',
  descPlaceholder: 'What is this project about?',
  language:        'Language',
  english:         'English',
  spanish:         'Spanish',
  cancel:          'Cancel',
  create:          'Create →',
  creating:        'Creating…',
},
player: {
  brand:           '◈ CARTUM',
  title:           'Join the platform',
  name:            'Your name',
  namePlaceholder: 'Jane Doe',
  email:           'Email address',
  emailPlaceholder:'jane@example.com',
  password:        'Password',
  passwordHint:    'Min. 8 characters',
  projectName:     'Project name',
  projectPlaceholder:'My workspace',
  submit:          'Create account and project',
  submitting:      'Creating…',
  signInLink:      'Already have an account?',
  signIn:          'Sign in →',
},
```

---

## Folder Skeleton

```
app/
  (auth)/
    cartum-player/
      page.tsx                         ← NEW (gated by env)

components/
  ui/
    molecules/
      ProjectSelector.tsx              ← NEW
      CreateProjectModal.tsx           ← NEW
    organisms/
      PlayerRegisterForm.tsx           ← NEW

lib/
  actions/
    auth.schemas.ts                    ← EXTEND (RegisterPlayerSchema)
    auth.actions.ts                    ← EXTEND (registerPlayer)
    project.actions.ts                 ← EXTEND (createProject, already in MP-01)
```

---

## Acceptance Criteria

- [ ] `CARTUM_NEW_PLAYER=true` → `/cartum-player` renders the registration form
- [ ] `CARTUM_NEW_PLAYER=false` or unset → `/cartum-player` returns 404 (`notFound()`)
- [ ] `/cartum-player` is NOT linked from any nav element — only accessible via manual URL
- [ ] `registerPlayer` action validates all 4 fields; returns field-level error messages
- [ ] `registerPlayer` action checks for duplicate email before creating user
- [ ] `registerPlayer` action is blocked if `CARTUM_NEW_PLAYER !== 'true'` (server-side gate, not just UI)
- [ ] Successful registration: user created + project created + user is admin member + auto-logged-in + redirected to `/cms/board`
- [ ] Password field has show/hide toggle
- [ ] Form is fully disabled while submission is pending
- [ ] `/cartum-player` matches login page visual style (card, dark-first, VHS transition)
- [ ] `ProjectSelector` is visible in the CMS topbar where the project title was
- [ ] With 1 project: selector shows only "New project" option in dropdown
- [ ] With 2+ projects: selector shows all user's projects + "New project"
- [ ] Active project is visually distinguished (primary color indicator)
- [ ] Clicking a different project calls `switchProject()` and redirects to `/cms/board`
- [ ] `switchProject()` verifies user is a member of the target project (throws `FORBIDDEN` otherwise)
- [ ] `CreateProjectModal` opens when "New project" is clicked in selector
- [ ] `CreateProjectModal` requires name, description and locale are optional
- [ ] Successful modal submit: project created + user added as admin + session switches + redirect to `/cms/board`
- [ ] Modal closes on Escape key or cancel button click
- [ ] Modal applies `<VHSTransition>` on mount
- [ ] TypeScript compiles with zero errors across all new components and actions
- [ ] All new locale keys are present in both `en.ts` and `es.ts`
- [ ] No console errors or unhandled promise rejections in the browser during any flow
