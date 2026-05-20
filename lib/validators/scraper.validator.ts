/**
 * Zod schemas for DealerScraper API result validation.
 *
 * Used exclusively in server actions — never imported client-side.
 *
 * If validation fails → return error code 'SCRAPER_INVALID_RESULT'.
 * In development, the full ZodError is logged to the server console
 * so developers can debug structural mismatches from the scraper.
 */

import { z } from 'zod'

// ── Leaf schemas ────────────────────────────────────────────────────────────────

const ScrapeResultKeyPageSchema = z.object({
  url:        z.string(),
  title:      z.string(),
  summary:    z.string(),
  key_points: z.array(z.string()),
})

// Flat LLM output — matches keys from CARTUM_RESPONSE_SCHEMA
const ScrapeResultDataSchema = z.object({
  business_name: z.string().nullable(),
  business_type: z.string().nullable(),
  description:   z.string().nullable(),
  language:      z.string().nullable(),
  address:       z.string().nullable(),
  phone:         z.string().nullable(),
  email:         z.string().nullable(),
  social_links:  z.array(z.string()),
  main_topics:   z.array(z.string()),
  key_pages:     z.array(ScrapeResultKeyPageSchema),
})

const ScrapeResultMetadataSchema = z.object({
  total_pages_discovered: z.number(),
  pages_fetched:          z.number(),
  pages_analyzed:         z.number(),
  coverage_percent:       z.number().min(0).max(100),
})

// ── Root schema ────────────────────────────────────────────────────────────────

export const ScrapeResultSchema = z.object({
  job_id:           z.string(),
  url:              z.string().url(),
  scraped_at:       z.string(),
  llm_provider:     z.string(),
  llm_model:        z.string(),
  schema_validated: z.boolean(),
  data:             ScrapeResultDataSchema,
  metadata:         ScrapeResultMetadataSchema,
})

// ── Validation helper ──────────────────────────────────────────────────────────

export type ScraperValidationError = {
  /**
   * Human-readable summary of what fields were wrong/missing.
   * Only used in server-side dev logging — never sent to the client.
   */
  issues: string[]
  raw: unknown
}

/**
 * Validates a raw API response against ScrapeResultSchema.
 *
 * Returns `{ ok: true, data }` on success,
 * or `{ ok: false, error }` on failure.
 *
 * In development, the error is automatically logged to the server console.
 */
export function validateScrapeResult(
  raw: unknown,
): { ok: true; data: z.infer<typeof ScrapeResultSchema> } | { ok: false; error: ScraperValidationError } {
  const parsed = ScrapeResultSchema.safeParse(raw)

  if (parsed.success) return { ok: true, data: parsed.data }

  const issues = parsed.error.issues.map(
    (i) => `[${i.path.join('.')}] ${i.message}`,
  )

  const validationError: ScraperValidationError = { issues, raw }

  if (process.env.NODE_ENV === 'development') {
    console.error(
      '[DealerScraper] Invalid result structure — el Dealer no entregó las cartas correctamente.',
      '\n\nIssues:\n' + issues.map((s) => `  • ${s}`).join('\n'),
      '\n\nRaw payload:',
      JSON.stringify(raw, null, 2),
    )
  }

  return { ok: false, error: validationError }
}
