import { header, ok, warn, info, fatal, devUrl } from '@/lib/boot/logger'

const VALID_PROVIDERS = ['neon', 'supabase'] as const
type DbProvider = (typeof VALID_PROVIDERS)[number]

export async function runBootValidation(): Promise<void> {
  header('Cartum — Boot sequence')

  let hasFatal = false

  // ── 1. NODE_ENV ────────────────────────────────────────────────────────────
  if (!process.env.NODE_ENV) {
    fatal('CARTUM_E006', 'NODE_ENV is not defined.', 'Set NODE_ENV in your .env.local file.')
    hasFatal = true
  } else {
    ok(`NODE_ENV — OK (${process.env.NODE_ENV})`)
  }

  // ── 2. DATABASE_URL ────────────────────────────────────────────────────────
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    fatal('CARTUM_E001', 'DATABASE_URL environment variable is not defined.', 'Add DATABASE_URL to your .env.local file.')
    hasFatal = true
  } else {
    ok('DATABASE_URL — OK')
  }

  // ── 3. DB_PROVIDER ─────────────────────────────────────────────────────────
  const dbProvider = process.env.DB_PROVIDER
  if (!dbProvider || !(VALID_PROVIDERS as readonly string[]).includes(dbProvider)) {
    fatal(
      'CARTUM_E004',
      `DB_PROVIDER is invalid or missing. Got: "${dbProvider ?? '(empty)'}"`,
      'Set DB_PROVIDER to "neon" or "supabase" in your .env.local file.',
    )
    hasFatal = true
  } else {
    ok(`DB_PROVIDER — OK (${dbProvider as DbProvider})`)
  }

  // ── 4. AUTH_SECRET ─────────────────────────────────────────────────────────
  if (!process.env.AUTH_SECRET) {
    fatal('CARTUM_E003', 'AUTH_SECRET environment variable is not defined.', 'Generate one with: openssl rand -base64 32')
    hasFatal = true
  } else {
    ok('AUTH_SECRET — OK')
  }

  // Stop here if any fatal error — DB checks require a valid URL
  if (hasFatal) {
    process.stdout.write('\n')
    process.exit(1)
  }

  // ── 5. Database connection ─────────────────────────────────────────────────
  try {
    const { checkDatabaseConnection } = await import('@/db/adapters/check-connection')
    await checkDatabaseConnection()
    ok('Database connection — OK')
  } catch {
    fatal('CARTUM_E002', 'Could not establish a connection to the database.', 'Verify DATABASE_URL and that the database is reachable.')
    process.stdout.write('\n')
    process.exit(1)
  }

  // ── 6. Schema integrity ────────────────────────────────────────────────────
  try {
    const { checkSchemaIntegrity } = await import('@/db/adapters/check-schema')
    const ready = await checkSchemaIntegrity()
    if (!ready) {
      fatal('CARTUM_E005', 'Database migrations have not been applied.', 'Run: pnpm db:migrate')
      process.stdout.write('\n')
      process.exit(1)
    }
    ok('Schema integrity — OK')
  } catch {
    fatal('CARTUM_E005', 'Could not verify schema integrity.', 'Run: pnpm db:migrate')
    process.stdout.write('\n')
    process.exit(1)
  }

  // ── 7–9. Optional warnings ────────────────────────────────────────────────
  if (!process.env.R2_ENDPOINT) {
    warn('CARTUM_E007', 'R2_ENDPOINT not set. Storage features disabled.')
  }
  if (!process.env.R2_PUBLIC_URL) {
    warn('CARTUM_E008', 'R2_PUBLIC_URL not set. Storage features disabled.')
  }
  try {
    const { getSetting } = await import('@/lib/settings/get-setting')
    const resendKey = await getSetting('resend_api_key', process.env.RESEND_API_KEY)
    if (!resendKey) {
      warn('CARTUM_E009', 'resend_api_key not configured (env + DB). Email features disabled.')
    }
  } catch {
    if (!process.env.RESEND_API_KEY) {
      warn('CARTUM_E009', 'RESEND_API_KEY not set. Email features disabled.')
    }
  }

  // ── 10. Setup state ───────────────────────────────────────────────────────
  try {
    const { checkSetupComplete } = await import('@/db/adapters/check-setup')
    const setupDone = await checkSetupComplete()
    if (!setupDone) {
      info('CARTUM_E010', 'Setup not completed. Redirecting to /setup on first request.')
    } else {
      ok('Setup — OK')
    }
  } catch {
    info('CARTUM_E010', 'Setup state unknown. Will redirect to /setup if needed.')
  }

  process.stdout.write('\n')

  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT ?? '3000'
    devUrl(`http://localhost:${port}`)
  }
}
