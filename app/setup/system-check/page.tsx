import { cookies } from 'next/headers'
import { checkDatabaseConnection } from '@/db/adapters/check-connection'
import { checkSchemaIntegrity } from '@/db/adapters/check-schema'
import { SetupLayout } from '@/components/ui/layouts/SetupLayout'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { SystemCheckClient } from '../SystemCheckClient'
import { getDictionary } from '@/locales'
import type { SupportedLocale } from '@/types/project'
import type { Dictionary } from '@/locales/en'

type CheckResult = {
  label: string
  ok: boolean
  warning?: string
}

type SysCheckDict = Dictionary['setup']['systemCheck']

async function runChecks(dict: SysCheckDict): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  // DB connection
  try {
    await checkDatabaseConnection()
    results.push({ label: dict.db, ok: true })
  } catch {
    results.push({ label: dict.db, ok: false })
  }

  // Env vars
  const envOk = Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET)
  results.push({ label: dict.env, ok: envOk })

  // Schema
  try {
    const schemaOk = await checkSchemaIntegrity()
    results.push({ label: dict.schema, ok: schemaOk })
  } catch {
    results.push({ label: dict.schema, ok: false })
  }

  // Storage R2 — always shown; warning only when not configured
  const r2Configured = Boolean(process.env.R2_ENDPOINT)
  results.push({
    label:   dict.storageLabel,
    ok:      true,
    warning: r2Configured ? undefined : dict.storageWarning,
  })

  // Storage Blob — always shown; warning only when not configured
  const blobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
  results.push({
    label:   dict.blobLabel,
    ok:      true,
    warning: blobConfigured ? undefined : dict.blobWarning,
  })

  // Optimus VPS media optimization — always shown; warning only when not configured
  const optimusConfigured = Boolean(process.env.MEDIA_VPS_URL)
  results.push({
    label:   dict.optimusLabel,
    ok:      true,
    warning: optimusConfigured ? undefined : dict.optimusWarning,
  })

  return results
}

export default async function SystemCheckPage() {
  const jar    = await cookies()
  const locale = (jar.get('cartum-setup-locale')?.value ?? 'en') as SupportedLocale
  const setup  = getDictionary(locale).setup
  const dict   = setup.systemCheck

  const checks = await runChecks(dict)
  const allOk  = checks.filter((c) => !c.warning).every((c) => c.ok)

  return (
    <SetupLayout currentStep="system-check" layoutDict={{ stepLabels: setup.stepLabels, back: setup.layout.back }}>
      <VHSTransition>
        <SystemCheckClient checks={checks} allOk={allOk} dict={dict} />
      </VHSTransition>
    </SetupLayout>
  )
}
