# Part 03 — First-Run Setup Wizard

## Goal
Build the guided setup wizard that runs the first time the CMS is accessed. It configures the super admin credentials, project identity, and initializes the database schema — all in a step-by-step, zero-confusion UI flow.

## Prerequisites
- Part 01 (foundation, boot validation)
- Part 02 (database schema migrated, repositories ready)

---

## Routing Logic

The middleware (`middleware.ts`) checks on every request to `/(cms)/*`:
1. Query `usersRepository.findSuperAdmin()` — if no super admin exists → redirect to `/setup`
2. If setup is complete → allow through to CMS

```ts
// middleware.ts
export async function middleware(req: NextRequest) {
  const isSetupRoute = req.nextUrl.pathname.startsWith('/setup')
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')

  if (isApiRoute) return NextResponse.next()

  const setupComplete = await isSetupComplete()    // checks DB for super_admin

  if (!setupComplete && !isSetupRoute) {
    return NextResponse.redirect(new URL('/setup', req.url))
  }
  if (setupComplete && isSetupRoute) {
    return NextResponse.redirect(new URL('/cms/board', req.url))
  }

  return NextResponse.next()
}
```

---

## Wizard Pages

### `/app/setup/page.tsx` → Step 0 (System Check)
Server Component. Runs system checks server-side and passes results as props.

**What it checks (re-runs the same logic as boot, but visually):**
- DB connection
- Required env vars
- Schema integrity

**UI:**
```
▶ Cartum — System Check

✓  Database connection
✓  Environment variables
✓  Schema integrity
⚠  Storage (R2) not configured — you can configure this later

[ All systems nominal — Continue → ]
```

If any fatal check fails: show the error with `errores_info.md` reference and a "Fix this first" state (no Continue button).

### `/app/setup/locale/page.tsx` → Step 1 (Interface Language)

Server Component shell, Client Component form. Shown **immediately after the system check**, before asking for any credentials. The language selected here applies to the entire wizard from Step 2 onwards and becomes the CMS default locale.

**UI:**
```
◈ CARTUM — Choose your language

  Select the interface language for this CMS.
  You can change this later in Settings → Appearance.

  ┌─────────────────────┐  ┌─────────────────────┐
  │  🇺🇸                 │  │  🇪🇸                 │
  │  English             │  │  Español             │
  │  ● Selected          │  │                      │
  └─────────────────────┘  └─────────────────────┘

                             [ Continue → ]
```

- Default pre-selected: **English**
- Cards use the same `--color-surface` / `--color-primary` border-active pattern as `ThemeSwatch`
- Selecting a card immediately switches the wizard UI to that language (client-side dictionary swap)
- Continue is always enabled (English is pre-selected — user never blocked)
- On Submit → calls `setDefaultLocale({ locale })` Server Action → persists to `project_settings.default_locale`

**No back button on this step.** (Step 0 → Step 1 is one-way; system check has no fields to undo)

---

### `/app/setup/credentials/page.tsx` → Step 2 (Super Admin)

Fields:
- Email (validated format)
- Password (strength meter: weak / fair / strong — based on length + entropy)
- Confirm password
- Recovery email (can be same as main email)

Validation:
- Password min 12 chars
- Passwords must match
- Email must be valid format

On Submit → calls `createSuperAdmin(input)` Server Action.

### `/app/setup/project/page.tsx` → Step 3 (Project Config)

Fields:
- Project name (max 40 chars, no special chars except `-` `_` space)
- Project description (optional, max 200 chars)

> El idioma fue capturado en Step 1 — no se repite aquí.

On Submit → calls `createProject(input)` Server Action.

### `/app/setup/initializing/page.tsx` → Step 4 (Auto-progress)

No user input. Client Component that:
1. Triggers `initializeSchema()` Server Action on mount
2. Shows animated progress steps with VHS entry per item:
   ```
   ✓  Creating admin account...
   ✓  Setting up project...
   ✓  Initializing schema...
   ✓  Generating default roles...
   →  Done
   ```
3. On completion → redirects to `/setup/ready`

### `/app/setup/ready/page.tsx` → Step 5 (Entry to CMS)

Full VHS transition. Shows:
```
◈ CARTUM — SYSTEM INITIALIZED

  Project: [name]
  Admin:   [email]
  Status:  Ready

  [ Open Dashboard → ]
```

Click navigates to `/cms/board`.

---

## Server Actions

### `/lib/actions/setup.actions.ts`
```ts
setDefaultLocale(input: { locale: 'en' | 'es' }): Promise<ActionResult>  // Step 1 — persists before credentials
createSuperAdmin(input: CreateSuperAdminInput): Promise<ActionResult>     // Step 2
createProject(input: CreateProjectInput): Promise<ActionResult>           // Step 3
initializeSchema(): Promise<ActionResult>  // Step 4 — creates default roles, validates all tables
```

### `/lib/services/setup.service.ts`
```ts
// createSuperAdmin:
// 1. Hash password with bcrypt (12 rounds)
// 2. Insert into users with is_super_admin = true
// 3. Store recovery email

// createProject:
// 1. Check no project row exists (enforce single project)
// 2. Insert project row

// initializeSchema:
// 1. Confirm users + project rows exist
// 2. Create default roles: 'admin', 'editor', 'viewer'
// 3. Mark setup as complete (super_admin exists = setup complete flag)
```

---

## Types to Add

### `/types/project.ts`
```ts
export interface Project {
  id: string
  name: string
  description: string | null
  defaultLocale: string
  createdAt: Date
}

export type SetupStep = 'system-check' | 'locale' | 'credentials' | 'project' | 'initializing' | 'ready'

export interface SetupState {
  currentStep:     SetupStep
  systemCheck:     Record<string, boolean>
  localeDone:      boolean
  credentialsDone: boolean
  projectDone:     boolean
}
```

---

## Shared Wizard Layout

### `/components/ui/layouts/SetupLayout.tsx`
Client Component. Renders:
- Step progress indicator (dots, 6 total)
- Current step number + label
- Back button (where applicable)
- Children (the step content)

Aesthetic: centered dark card on pure black background. Step dots glow in primary color for completed steps. VHS transition on step change.

---

## Wizard Navigation Rules

- Users **cannot skip steps** — each step redirects to the next only after successful action
- The back button only appears on steps 2 and 3 (not on 0, 1, 4, 5)
- If the user navigates to a later step URL directly without completing prior steps, they are redirected back to the earliest incomplete step
- Wizard state is not persisted in localStorage — it is derived entirely from what exists in the DB

---

## Acceptance Criteria

- [ ] Fresh DB → accessing `/` redirects to `/setup`
- [ ] Step 0 shows green checks for all valid env vars / DB connection
- [ ] Step 0 with bad `DATABASE_URL` shows error, no Continue button
- [ ] Step 1 muestra English pre-seleccionado; al pulsar Español el resto del wizard cambia de idioma
- [ ] Step 1 persiste el idioma en `project_settings.default_locale` antes de avanzar
- [ ] Step 2 rejects weak passwords (< 12 chars) with inline error
- [ ] Step 2 rejects mismatched passwords
- [ ] Step 3 saves project name to DB
- [ ] Step 4 auto-runs and creates default roles (`admin`, `editor`, `viewer`)
- [ ] Step 5 redirects to `/cms/board` on Click
- [ ] After wizard completes, accessing `/setup` redirects to `/cms/board`
- [ ] No step can be reached by direct URL if prior steps are incomplete
