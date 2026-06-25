# UPD-01 — CMS Update System: `cartum update` CLI Command

## Goal

Design and implement a safe, reproducible update mechanism for Cartum CMS instances deployed by end users. The system allows users who installed Cartum via `create-cartum-cms` to pull the latest framework changes, apply pending database migrations, and be notified of new required environment variables — all without overwriting their own content, configurations, or custom code.

This document covers the **CLI update command**, the **file merge strategy**, the **migration pipeline**, and the **.env versioning protocol**.

---

## Context & Problem

Cartum CMS is a self-hosted, open-source CMS. Users run their own instances. There is no central server controlling deployments. This creates specific challenges:

- The CMS codebase evolves (bug fixes, new features, security patches)
- Users may have modified files in `app/` or added custom components
- Database schemas change over time (new columns, tables, migrations)
- New environment variables are introduced (AWS SES, HELP_EMAIL, etc.)
- A naive "overwrite everything" approach would destroy user customizations

The update system must be **conservative by default** and **transparent about what it changes**.

---

## Prerequisites

- `create-cartum-cms` npm package installed (used for initial setup, reused for updates)
- `giget` available (already a dependency of the CLI — used for template download)
- Drizzle ORM with `_journal.json` in place (already implemented)
- `DATABASE_URL` accessible from the machine running the update
- Git initialized in the project (recommended, but update works without it)

---

## Architecture Decision: What Is "Framework" vs "User"

The core decision is which files belong to Cartum (can be safely overwritten on update) and which belong to the user (must never be touched automatically).

```
┌─────────────────────────────────────────────────────────────┐
│  FRAMEWORK FILES (safe to overwrite)                        │
│  app/cms/           ← CMS UI, settings, board, docs         │
│  components/ui/     ← Design system components              │
│  lib/               ← Actions, services, hooks, RBAC        │
│  db/schema/         ← Drizzle schemas (user adds via gen)   │
│  db/migrations/     ← New migration files only (additive)   │
│  db/seeds/          ← Default role seeds                    │
│  db/repositories/   ← Data access layer                     │
│  locales/           ← i18n dictionaries                     │
│  types/             ← TypeScript types                      │
│  proxy.ts           ← Middleware                            │
│  .env.example       ← Updated template                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  USER FILES (never overwrite automatically)                 │
│  .env               ← User credentials — NEVER TOUCHED      │
│  app/               ← User pages, custom routes, layouts    │
│  public/            ← User assets, images                   │
│  db/migrations/     ← ONLY existing files, never delete     │
│  package.json       ← User may have added deps              │
│  next.config.*      ← User may have custom config           │
│  tailwind.config.*  ← User may have custom theme            │
│  README.md          ← User documentation                    │
└─────────────────────────────────────────────────────────────┘
```

### Exception: `app/cms/`

`app/cms/` is owned by the framework (CMS UI routes). User custom pages live in `app/` outside of `app/cms/`. The update overwrites `app/cms/` safely.

---

## Update Flow

```
npx create-cartum-cms update
        │
        ▼
  1. Detect current version
     (read package.json in CMS project)
        │
        ▼
  2. Fetch latest version from npm registry
     (GET registry.npmjs.org/create-cartum-cms)
        │
        ▼
  3. Show changelog summary
     (fetch CHANGELOG.md from template repo)
     Ask: "Update from v1.0.3 to v1.0.6? [Y/n]"
        │
        ▼
  4. Backup database (optional but recommended)
     Ask: "Export DB backup before updating? [Y/n]"
     If yes: run pnpm db:studio or pg_dump via DATABASE_URL
        │
        ▼
  5. Download new template via giget
     (same mechanism as initial install)
        │
        ▼
  6. Smart file merge
     Overwrite FRAMEWORK files
     Skip USER files (show list of skipped)
     NEW files: copy as-is
        │
        ▼
  7. Apply new migrations
     pnpm db:migrate (Drizzle is idempotent)
        │
        ▼
  8. Detect new env vars
     Compare .env.example new vs old
     Show: "New variables available: AWS_SES_REGION, HELP_EMAIL_AZANO"
     Do NOT write to .env — user does it manually
        │
        ▼
  9. Install/update dependencies
     pnpm install (or npm/yarn based on detected pm)
        │
        ▼
 10. Done — show summary
     "Updated to v1.0.6 · 3 migrations applied · 2 new env vars"
```

---

## Implementation: `create-cartum-cms` Changes

### New command detection in `bin/index.mjs`

```javascript
// Detect if running as "update" vs "create"
const isUpdate = process.argv.includes('update') ||
                 existsSync(join(process.cwd(), 'package.json'))
                 // If package.json exists in cwd, assume we're inside a project
```

### File merge strategy

```javascript
// FRAMEWORK_PATHS: always overwrite
const FRAMEWORK_PATHS = [
  'app/cms',
  'components/ui',
  'lib',
  'db/schema',
  'db/repositories',
  'db/seeds',
  'locales',
  'types',
  'proxy.ts',
  '.env.example',
]

// USER_PATHS: never touch
const USER_PATHS = [
  '.env',
  'public',
  'package.json',
  'next.config.*',
  'tailwind.config.*',
  'README.md',
]

// MIGRATION special rule: only ADD new files, never delete existing
// Compare db/migrations/ from template vs local — copy only files that don't exist locally
```

### .env version detection

```javascript
// .env.version file in template root tracks env schema version
// Format: ENV_SCHEMA_VERSION=3
// Update script compares template ENV_SCHEMA_VERSION vs local .env.version
// Lists new vars from .env.example that are not in local .env

function detectNewEnvVars(localEnvPath, newExamplePath) {
  const localKeys = parseEnvKeys(readFileSync(localEnvPath))
  const exampleKeys = parseEnvKeys(readFileSync(newExamplePath))
  return exampleKeys.filter(k => !localKeys.includes(k))
}
```

---

## `.env.version` File

A new file added to the CMS template root:

```
# Cartum CMS — Environment Schema Version
# Incremented whenever new env vars are added or existing ones change.
# Used by `cartum update` to detect configuration drift.
ENV_SCHEMA_VERSION=1
```

**Rules:**
- Increment on every release that adds/modifies env vars
- Never contains actual values, only the integer version
- Committed to version control (not in `.gitignore`)
- The update script copies the new `.env.version` from the template after update

---

## Database Migration Strategy

Drizzle's `_journal.json` already handles idempotency. The update adds no new migration mechanism — it relies on what already works:

1. New migration files are included in the template download
2. `pnpm db:migrate` applies only migrations not in `__drizzle_migrations` table
3. The journal hash must match — this is guaranteed since migration files come from the official template

**Risk scenario:** User manually edited a migration file. The hash won't match and Drizzle will error. The update script detects this and warns:

```
⚠ Migration hash mismatch detected in:
  db/migrations/0015_cool_excalibur.sql
  This file was modified after it was applied.
  Manual intervention required before updating.
  See: docs/troubleshooting/migration-conflicts.md
```

---

## Versioning Convention

The CMS `package.json` uses semver. The update system respects this:

| Version bump | Meaning | Migrations? | Env changes? | Breaking? |
|---|---|---|---|---|
| **patch** (1.0.x) | Bug fixes, copy changes | No | No | No |
| **minor** (1.x.0) | New features, new settings | Maybe | Maybe | No |
| **major** (x.0.0) | Breaking changes | Yes | Possibly | Yes |

For **major** updates, the script shows an extra warning and requires typing the version number to confirm:

```
⚠ This is a MAJOR update (v1.x.x → v2.0.0).
  Major updates may include breaking changes.
  Type the version number to confirm: 2.0.0
  >
```

---

## New Files in `create-cartum-cms`

```
create-cartum-cms/
  bin/
    index.mjs          ← EXTEND: add update command
  update/
    merge.mjs          ← Smart file merge logic
    env-diff.mjs       ← Detect new env vars
    migration-check.mjs ← Detect hash mismatches
    changelog.mjs      ← Fetch and display changelog
```

## New Files in CMS Template

```
cms/
  .env.version         ← NEW: env schema version tracker
  CHANGELOG.md         ← NEW: human-readable changelog
  update-notes/        ← NEW: per-version migration guides
    v1.1.0.md
    v2.0.0.md
```

---

## Audit: What Could Go Wrong

| Risk | Mitigation |
|---|---|
| User modified framework file gets overwritten | Git diff shown before overwrite; user confirms per-file if conflict detected |
| Migration hash mismatch blocks update | Detected early, shown as warning with instructions |
| New env var missing causes runtime crash | Detected and reported before `pnpm install`; update still completes but warns |
| `pnpm db:migrate` fails mid-update | DB backup taken first; user can restore and retry |
| Template download fails (no internet) | Error shown; local files untouched; retry later |
| Major version with breaking UI changes | Extra confirmation required; migration guide shown |
| User's custom `app/` pages conflict with new `app/cms/` routes | Not possible — they are separate directories by design |
| Concurrent update on production | Out of scope for v1; document: always update on maintenance window |

---

## Acceptance Criteria

- [ ] `npx create-cartum-cms update` detected and routed to update flow (not create flow)
- [ ] Current CMS version read from `package.json` in the target directory
- [ ] Latest version fetched from npm registry without requiring login
- [ ] Changelog displayed before confirmation prompt
- [ ] User can abort at confirmation step with no files changed
- [ ] DB backup prompt appears before any file changes
- [ ] Template downloaded via `giget` to a temp directory (not directly into project)
- [ ] FRAMEWORK_PATHS overwritten from template
- [ ] USER_PATHS never touched regardless of template contents
- [ ] `db/migrations/` in template: only new files copied, existing files never modified or deleted
- [ ] `.env.version` updated in project after successful update
- [ ] New env vars detected by comparing template `.env.example` vs local `.env`
- [ ] New env vars shown in terminal with descriptions, NOT written to `.env`
- [ ] Migration hash mismatch detected and shown as a blocking warning with instructions
- [ ] `pnpm db:migrate` (or detected package manager equivalent) run after file merge
- [ ] `pnpm install` run after migrations to pick up new dependencies
- [ ] Major version update requires typing confirmation of version number
- [ ] Summary shown at end: version changed, migrations applied count, new env vars count
- [ ] If any step fails, remaining steps are skipped and error is shown clearly
- [ ] No orphaned temp directories left on failure (cleanup on exit)
- [ ] TypeScript compilation passes on updated CMS template
- [ ] Update tested from v1.0.x to v1.1.x with: no custom files, custom app/ files, modified framework file
- [ ] Update works with pnpm, npm, and yarn (package manager auto-detected)
- [ ] `CHANGELOG.md` maintained in template repo and shown during update
- [ ] `update-notes/` per-version guides linked when relevant (e.g. major updates)
- [ ] `.env.version` file present in template and incremented on every env-changing release
- [ ] Documentation in `/docs` (developer section) explains the update process for end users
