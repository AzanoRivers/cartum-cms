# Cartum — Error Reference Guide

This file documents all startup error codes emitted by Cartum during the boot sequence.
Each code corresponds to a specific configuration or environment problem.

When you see a `[CARTUM_EXXX]` message in your terminal, find the matching section below for a full explanation and fix instructions.

---

## CARTUM_E001 — Missing DATABASE_URL

**Severity:** Fatal — server will not start.

**Terminal output:**
```
✖ [CARTUM_E001] DATABASE_URL environment variable is not defined.
  → What this means: Cartum cannot connect to any database without this variable.
  → How to fix: Add DATABASE_URL to your .env file.
  → Reference: errores_info.md#cartum_e001
```

**What to do:**

1. Open your `.env` file (create it at the project root if it does not exist).
2. Add the connection string for your database provider:

   **Neon:**
   ```
   DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
   ```

   **Supabase:**
   ```
   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

3. Save the file and restart the dev server.

**Notes:**
- Never commit `.env` to version control.
- If using Vercel, add `DATABASE_URL` in the project's Environment Variables dashboard.

---

## CARTUM_E002 — Database Connection Failed

**Severity:** Fatal — server will not start.

**Terminal output:**
```
✖ [CARTUM_E002] Could not establish a connection to the database.
  → What this means: DATABASE_URL is set but the database is not reachable.
  → How to fix: Verify the connection string, network access, and database status.
  → Reference: errores_info.md#cartum_e002
```

**What to do:**

1. Double-check the `DATABASE_URL` value — look for typos in the host, port, username, or password.
2. Verify your database is running and accepting connections:
   - **Neon**: Check the Neon dashboard. Free-tier projects may be suspended after inactivity.
   - **Supabase**: Check the Supabase dashboard under Settings → Database.
3. If running locally, confirm your DB server process is active.
4. Check that the IP or deployment environment (e.g. Vercel) is not blocked by your DB provider's IP allowlist.
5. For Neon, ensure `?sslmode=require` is appended to the URL.

---

## CARTUM_E003 — Missing AUTH_SECRET

**Severity:** Fatal — server will not start.

**Terminal output:**
```
✖ [CARTUM_E003] AUTH_SECRET environment variable is not defined.
  → What this means: Authentication sessions cannot be encrypted without this secret.
  → How to fix: Generate a secure random secret and add it to your .env.
  → Reference: errores_info.md#cartum_e003
```

**What to do:**

1. Generate a secure secret with one of the following:

   ```bash
   # Option A — openssl (recommended)
   openssl rand -base64 32

   # Option B — Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. Add the result to `.env`:
   ```
   AUTH_SECRET=your-generated-secret-here
   ```

3. Use a **different** secret for development and production environments.

**Notes:**
- If this value changes in production, all active sessions will be invalidated and users will be logged out.

---

## CARTUM_E004 — Invalid DB_PROVIDER Value

**Severity:** Fatal — server will not start.

**Terminal output:**
```
✖ [CARTUM_E004] DB_PROVIDER has an unrecognized value.
  → What this means: Cartum only supports 'neon' or 'supabase' as DB_PROVIDER values.
  → How to fix: Set DB_PROVIDER to either 'neon' or 'supabase' in your .env.
  → Reference: errores_info.md#cartum_e004
```

**What to do:**

1. Open `.env` and check the `DB_PROVIDER` value:
   ```
   DB_PROVIDER=neon     ← valid
   DB_PROVIDER=supabase ← valid
   ```

2. Common mistakes:
   - `DB_PROVIDER=Neon` — value is case-sensitive, must be lowercase
   - `DB_PROVIDER=postgres` — not a recognized adapter identifier
   - `DB_PROVIDER=` — empty value is treated as invalid

---

## CARTUM_E005 — Database Schema Out of Sync (Migrations Not Applied)

**Severity:** Fatal — server will not start.

**Terminal output:**
```
✖ [CARTUM_E005] The database schema is missing required tables or is out of sync with the current version.
  → What this means: Drizzle migrations have not been run against this database.
  → How to fix: Run 'pnpm db:migrate' to apply pending migrations.
  → Reference: errores_info.md#cartum_e005
```

**What to do:**

1. Run the migration command from the project root:
   ```bash
   pnpm db:migrate
   ```

2. If this is a fresh database (first install), this is expected — run migrations once before starting the server.

3. If you recently pulled new code that includes schema changes, always run migrations before `pnpm dev`.

4. If the command fails, check:
   - `DATABASE_URL` is correct and the DB is reachable (see E001, E002)
   - The migration files in `/db/migrations/` are not corrupted or missing

**Notes:**
- Never manually edit migration files. If you need to change the schema, update the Drizzle schema files and run `pnpm db:generate` followed by `pnpm db:migrate`.

---

## CARTUM_E006 — NODE_ENV Not Set

**Severity:** Fatal — server will not start.

**Terminal output:**
```
✖ [CARTUM_E006] NODE_ENV environment variable is not defined.
  → What this means: Cartum cannot determine the runtime environment (development vs production).
  → How to fix: Add NODE_ENV to your .env file.
  → Reference: errores_info.md#cartum_e006
```

**What to do:**

1. Add to `.env`:
   ```
   NODE_ENV=development
   ```

2. In production deployments (Vercel, Cloudflare), this variable is typically set automatically by the platform. If you see this error in production, check your platform's environment variable settings.

**Notes:**
- Valid values: `development`, `production`, `test`

---

## CARTUM_E007 — R2_BUCKET_URL Not Configured *(Warning)*

**Severity:** Warning — server starts, but media uploads will be unavailable.

**Terminal output:**
```
⚠ [CARTUM_E007] R2_BUCKET_URL is not configured. Storage features are disabled.
  → What this means: Image and video field nodes exist in the schema but uploads will fail.
  → How to fix: Add R2_BUCKET_URL to your .env to enable media uploads.
  → Reference: errores_info.md#cartum_e007
```

**What to do:**

1. In your Cloudflare R2 dashboard, locate the bucket you want to use and copy its endpoint URL.
2. Add to `.env`:
   ```
   R2_BUCKET_URL=https://[bucket-name].[account-id].r2.cloudflarestorage.com
   ```

3. Make sure the bucket has **public upload permissions** or a policy that allows PUT from your deployment origin.

**Notes:**
- If `R2_BUCKET_URL` is not set, image and video field nodes can still be created in the schema. Uploads will fail at runtime with an inline CMS warning, not a server crash.
- This is a warning (not fatal) because the CMS is fully functional without storage for content types that do not use media fields.

---

## CARTUM_E008 — R2_PUBLIC_URL Not Set *(Warning)*

**Severity:** Warning — server starts, but uploaded files will not be publicly accessible via a clean URL.

**Terminal output:**
```
⚠ [CARTUM_E008] R2_PUBLIC_URL is not configured. Uploaded files may not be publicly accessible.
  → What this means: Cartum cannot construct public URLs for serving uploaded media.
  → How to fix: Add R2_PUBLIC_URL to your .env.
  → Reference: errores_info.md#cartum_e008
```

**What to do:**

1. Set `R2_PUBLIC_URL` to the public-facing base URL for your R2 bucket:

   ```
   # Option A — Cloudflare R2 dev URL (available without custom domain)
   R2_PUBLIC_URL=https://pub-[hash].r2.dev

   # Option B — Custom domain mapped to R2 bucket
   R2_PUBLIC_URL=https://media.yourdomain.com
   ```

2. After adding, restart the dev server.

**Notes:**
- This URL is used to build the `src` attribute of images and the `src` of video elements in Content Mode.
- Without it, uploads may succeed but files will have no accessible URL in the CMS.

---

## CARTUM_E009 — RESEND_API_KEY Not Set *(Warning)*

**Severity:** Warning — server starts, but password recovery emails will not be delivered.

**Terminal output:**
```
⚠ [CARTUM_E009] RESEND_API_KEY is not configured. Password recovery emails are disabled.
  → What this means: Users who forget their password cannot receive a recovery email.
  → How to fix: Add RESEND_API_KEY to your .env, or accept this limitation.
  → Reference: errores_info.md#cartum_e009
```

**What to do:**

1. Create a free account at [resend.com](https://resend.com) and generate an API key.
2. Add to `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   ```
3. Also set the sender address:
   ```
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

**Notes:**
- The password recovery flow in the CMS Setup Wizard (Step 1) and the Settings panel will show an inline warning if no email provider is configured.
- The `super_admin` account recovery without email requires a direct DB intervention — this risk is shown as a warning during the setup wizard.
- Future versions may support alternative email providers (Vercel Email, Mailgun, etc.) via an adapter layer.

---

## CARTUM_E010 — Setup Not Completed *(Info)*

**Severity:** Info — server starts normally, but all CMS routes redirect to `/setup`.

**Terminal output:**
```
ℹ [CARTUM_E010] No super_admin account found. CMS setup has not been completed.
  → What this means: The first-run setup wizard has not been finished for this installation.
  → How to fix: Open the CMS in your browser and complete the setup wizard.
  → Reference: errores_info.md#cartum_e010
```

**What to do:**

1. This is expected on a fresh installation after running migrations for the first time.
2. Open your browser and navigate to your CMS URL (e.g. `http://localhost:3000`).
3. You will be redirected to `/setup` automatically.
4. Complete all setup steps to create the `super_admin` account and initialize the project.

**Notes:**
- If you see this on an existing installation that was previously set up, it may indicate:
  - The database was reset or pointed to a new empty DB
  - The `users` table was accidentally cleared
  - A migration rollback removed the `super_admin` record
- In all cases, completing the setup wizard again will re-initialize the system.

---

## General Troubleshooting

### "I have all env vars set but still get errors"

- Make sure your `.env` file is at the **project root** (same level as `package.json`), not inside `/app` or `/src`.
- Variable names are **case-sensitive**: `DATABASE_URL` ≠ `database_url`.
- After editing `.env`, always **restart** the dev server — Next.js does not hot-reload env changes.
- When deploying, verify the env vars are set in your platform's dashboard (Vercel → Settings → Environment Variables), not only in local files.

### "I see an error code not listed here"

If you encounter a `[CARTUM_EXXX]` code that doesn't appear in this file, it may be from a newer version. Check the project's CHANGELOG or open an issue in the repository.

---

*Last updated: auto-managed — update this file whenever a new error code is added to `/lib/boot/validate.ts`.*
