'use server'

// Cada action lee scraperApiUrl + scraperApiKey desde getSetting()
// La API key nunca se expone al cliente

import { auth } from '@/auth'
import { getSetting } from '@/lib/settings/get-setting'
import { scraperService } from '@/lib/services/scraper.service'
import { nodeService } from '@/lib/services/nodes.service'
import { recordsService } from '@/lib/services/records.service'
import { validateScrapeResult } from '@/lib/validators/scraper.validator'
import type { ActionResult } from '@/types/actions'
import type {
  ScrapeOptions,
  ScrapeJobState,
  ScrapeResult,
  ScraperServerStatus,
  ImportStrategy,
  ImportedSummary,
} from '@/types/scraper'

const DEFAULT_SCRAPER_URL = 'https://scraper.azanolabs.com'

// ── Auth + config helper ───────────────────────────────────────────────────────

async function requireAuth(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')
  return session.user.id
}

async function getApiConfig(): Promise<{ apiUrl: string; apiKey: string }> {
  await requireAuth()
  const [url, key] = await Promise.all([
    getSetting('scraper_api_url', process.env.SCRAPER_API_URL),
    getSetting('scraper_api_key', process.env.SCRAPER_API_KEY),
  ])
  if (!key) throw new Error('SCRAPER_NOT_CONFIGURED')
  return { apiUrl: url ?? DEFAULT_SCRAPER_URL, apiKey: key }
}

// ── Server Actions ─────────────────────────────────────────────────────────────

export async function getScraperServerStatus(): Promise<ActionResult<ScraperServerStatus>> {
  try {
    const { apiUrl, apiKey } = await getApiConfig()
    const status = await scraperService.getServerStatus(apiUrl, apiKey)
    return { success: true, data: status }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function startScrapeJob(
  url: string,
  options?: ScrapeOptions,
): Promise<ActionResult<{ job_id: string }>> {
  try {
    const { apiUrl, apiKey } = await getApiConfig()
    const job = await scraperService.startJob(apiUrl, apiKey, url, options)
    return { success: true, data: { job_id: job.job_id } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getScrapeJobStatus(
  jobId: string,
): Promise<ActionResult<ScrapeJobState>> {
  try {
    const { apiUrl, apiKey } = await getApiConfig()
    const state = await scraperService.getJobStatus(apiUrl, apiKey, jobId)
    return { success: true, data: state }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getScrapeJobResult(
  jobId: string,
): Promise<ActionResult<ScrapeResult>> {
  try {
    const { apiUrl, apiKey } = await getApiConfig()
    const raw = await scraperService.getJobResult(apiUrl, apiKey, jobId)

    // ── Validate scraper result structure ─────────────────────────────────────
    const validation = validateScrapeResult(raw)
    if (!validation.ok) {
      // Dev: full issues already logged inside validateScrapeResult()
      return { success: false, error: 'SCRAPER_INVALID_RESULT' }
    }

    return { success: true, data: validation.data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function cancelScrapeJob(
  jobId: string,
): Promise<ActionResult<void>> {
  try {
    const { apiUrl, apiKey } = await getApiConfig()
    await scraperService.cancelJob(apiUrl, apiKey, jobId)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Import ─────────────────────────────────────────────────────────────────────
// Crea mazo(s) + cartas + registros a partir del resultado scrapeado.
// Valores null del scraper → string vacío '' (nunca null en records).

export async function importScrapedData(
  result: ScrapeResult,
  strategy: ImportStrategy,
): Promise<ActionResult<ImportedSummary>> {
  try {
    await requireAuth()

    const businessName = result.data.business_name ?? 'Unnamed'
    // Helper: null/undefined → empty string
    const s = (v: string | null | undefined): string => v ?? ''

    // ── 1. Create Business container ──────────────────────────────────────────
    const businessContainer = await nodeService.createContainer({
      name:     `Business: ${businessName}`,
      parentId: null,
    })

    // ── 2. Create Business field nodes ────────────────────────────────────────
    const businessFieldNames = [
      'name', 'type', 'description', 'language', 'address',
      'phone', 'email', 'social_links', 'main_topics', 'scraped_url', 'scraped_at',
    ]
    for (const fieldName of businessFieldNames) {
      await nodeService.createField({
        name:       fieldName,
        parentId:   businessContainer.id,
        fieldType:  'text',
        isRequired: false,
      })
    }

    // ── 3. Create Business record ─────────────────────────────────────────────
    const businessRecord = await recordsService.create(businessContainer.id, {
      data: {
        name:         s(result.data.business_name),
        type:         s(result.data.business_type),
        description:  s(result.data.description),
        language:     s(result.data.language),
        address:      s(result.data.address),
        phone:        s(result.data.phone),
        email:        s(result.data.email),
        social_links: JSON.stringify(result.data.social_links),
        main_topics:  result.data.main_topics.join(', '),
        scraped_url:  result.url,
        scraped_at:   result.scraped_at,
      },
    })

    const summary: ImportedSummary = {
      businessNodeId:   businessContainer.id,
      businessRecordId: businessRecord.id,
    }

    // business_only — done
    if (strategy === 'business_only') {
      return { success: true, data: summary }
    }

    // ── 4. Create Pages container ──────────────────────────────────────────────
    const pagesContainer = await nodeService.createContainer({
      name:     `Pages: ${businessName}`,
      parentId: null,
    })

    // ── 5. Create Pages field nodes ────────────────────────────────────────────
    const pageFieldNames = ['url', 'title', 'summary', 'key_points']
    for (const fieldName of pageFieldNames) {
      await nodeService.createField({
        name:       fieldName,
        parentId:   pagesContainer.id,
        fieldType:  'text',
        isRequired: false,
      })
    }

    // ── 6. Create one record per key_page ─────────────────────────────────────
    const pagesRecordIds: string[] = []
    for (const page of result.data.key_pages) {
      const rec = await recordsService.create(pagesContainer.id, {
        data: {
          url:        page.url,
          title:      page.title,
          summary:    page.summary,
          key_points: JSON.stringify(page.key_points),
        },
      })
      pagesRecordIds.push(rec.id)
    }

    return {
      success: true,
      data: {
        ...summary,
        pagesNodeId:   pagesContainer.id,
        pagesRecordIds,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Import failed' }
  }
}
