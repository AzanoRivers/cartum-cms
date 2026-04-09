# Part 01 — Project Foundation

## Goal
Set up the complete project skeleton so every subsequent part has the correct folder structure, TypeScript config, env handling, and the startup boot validation running before anything else.

## Prerequisites
- Node.js 20+, pnpm installed
- A PostgreSQL database URL (Neon or Supabase)
- Repository cloned locally

---

## Files to Create / Configure

### `package.json`

#### Current package versions (April 2026)
| Package | Version | Notes |
|---|---|---|
| `next` | 16.2.2 | App Router, RSC, Server Actions |
| `react` | 19.2.4 | |
| `react-dom` | 19.2.4 | |
| `typescript` | 6.0.2 | |
| `drizzle-orm` | 0.45.2 | |
| `drizzle-kit` | latest | |
| `next-auth` | 5.x | Auth.js v5 — App Router native |
| `zustand` | 5.0.12 | Global UI state |
| `sonner` | 2.0.7 | Toast notifications |
| `tailwindcss` | 4.x | |
| `class-variance-authority` | latest | |
| `zod` | latest | |
| `@dnd-kit/core` | latest | |
| `@dnd-kit/sortable` | latest | |

- Framework: `next@16`
- Language: `typescript@6` (strict)
- Styling: `tailwindcss@4`, `class-variance-authority`
- DB: `drizzle-orm@0.45.2`, `drizzle-kit`
- Validation: `zod`
- Auth: `next-auth@5` (Auth.js v5)
- State: `zustand@5` (global UI stores — canvas, settings panel, board navigation)
- Toasts: `sonner@2` (replaces custom AlertContext system)
- Dev scripts:
  ```json
  {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
  ```

### `tsconfig.json`
- `strict: true`
- `paths`: `@/*` → `./*`
- `moduleResolution: bundler`

### `.env.local` (never committed — documented in `.env.example`)
```
NODE_ENV=development
DATABASE_URL=
DB_PROVIDER=neon
AUTH_SECRET=
AUTH_URL=http://localhost:3000
R2_BUCKET_URL=
R2_PUBLIC_URL=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

> Note: Auth.js v5 uses `AUTH_SECRET` and `AUTH_URL` (not `NEXTAUTH_*`). Old `NEXTAUTH_*` names still work for backwards compat but v5 prefers the new names.

### `.env.example`
Mirror of `.env.local` with empty values and inline comments explaining each variable. Committed to the repo.

### `instrumentation.ts` (project root)
Next.js instrumentation hook — the entry point for the boot validation sequence.
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runBootValidation } = await import('@/lib/boot/validate')
    await runBootValidation()
  }
}
```

### `/lib/boot/validate.ts`
Startup validation — runs once on server start. See `cartum_part01` error codes.

**Checks (in dependency order):**
1. `NODE_ENV` present → `CARTUM_E006`
2. `DATABASE_URL` present → `CARTUM_E001`
3. `DB_PROVIDER` valid value → `CARTUM_E004`
4. `AUTH_SECRET` present → `CARTUM_E003`
5. DB connection reachable → `CARTUM_E002` (only if E001 passed)
6. Migrations applied (check for existence of `project` table) → `CARTUM_E005`
7. *(Warning)* `R2_BUCKET_URL` present → `CARTUM_E007`
8. *(Warning)* `R2_PUBLIC_URL` present → `CARTUM_E008`
9. *(Warning)* `RESEND_API_KEY` present → `CARTUM_E009`
10. *(Info)* `super_admin` exists → `CARTUM_E010`

**Output format:**
```
▶ Cartum — Boot sequence
  ✓  NODE_ENV — OK
  ✓  DATABASE_URL — OK
  ✓  DB_PROVIDER — OK (neon)
  ✓  AUTH_SECRET — OK
  ✓  Database connection — OK
  ✓  Schema integrity — OK
  ⚠  [CARTUM_E007] R2_BUCKET_URL not set. Storage disabled.
  ℹ  [CARTUM_E010] Setup not completed. Redirecting to /setup on first request.
```

Fatal errors call `process.exit(1)` after printing. Warnings/info continue.

### `/lib/boot/logger.ts`
Formatting helpers: `fatal()`, `warn()`, `info()`, `ok()` — each writes to `process.stdout` with correct prefix symbol and color (using ANSI codes, no external dependency).

---

## Folder Skeleton to Create (empty `index.ts` or `.gitkeep` as needed)

```
/app
/components/ui/atoms
/components/ui/molecules
/components/ui/organisms
/components/ui/transitions
/components/ui/layouts
/components/external/dnd
/lib/actions
/lib/hooks
/lib/services
/lib/boot
/lib/i18n
/locales
/db/schema
/db/repositories
/db/adapters
/db/migrations
/nodes
/types
/public/images/brand   ← logos y assets de marca (azanolabs-logo-*.png)
/features         ← this folder (planning docs, not shipped code)
```

---

## Acceptance Criteria

- [x] `pnpm dev` starts without crashing when all required env vars are set
- [x] `pnpm dev` with missing `DATABASE_URL` prints `[CARTUM_E001]` and exits
- [x] `pnpm dev` with missing `AUTH_SECRET` prints `[CARTUM_E003]` and exits
- [x] `pnpm dev` without R2 config prints a warning but continues
- [x] All folder paths from the Project Structure section exist
- [x] `tsconfig.json` has `strict: true` and `@/` path alias working
- [x] `.env.example` is committed; `.env.local` is gitignored
