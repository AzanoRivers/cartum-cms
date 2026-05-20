'use server'

// Cada action lee scraperApiUrl + scraperApiKey desde getSetting()
// La API key nunca se expone al cliente

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { getSetting } from '@/lib/settings/get-setting'
import { scraperService } from '@/lib/services/scraper.service'
import { nodeService } from '@/lib/services/nodes.service'
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
// Arquitectura: cada atributo del resultado = sub-contenedor cuya carta
// tiene el VALOR como nombre → datos visibles directamente en el tablero.

/** Crea un sub-contenedor con una sola carta cuyo nombre ES el valor. */
async function createAttrNode(
  key: string,
  value: string,
  parentId: string,
  positionX: number,
  positionY: number,
): Promise<void> {
  const sub = await nodeService.createContainer({
    name: key,
    parentId,
    positionX,
    positionY,
  })
  await nodeService.createField({
    name:       value.substring(0, 120),
    parentId:   sub.id,
    fieldType:  'text',
    isRequired: false,
  })
}

export async function importScrapedData(
  result: ScrapeResult,
  strategy: ImportStrategy,
): Promise<ActionResult<ImportedSummary>> {
  try {
    await requireAuth()

    const businessName = result.data.business_name ?? 'Unnamed'

    // ── 1. Contenedor principal Business ──────────────────────────────────────
    const businessContainer = await nodeService.createContainer({
      name:      `Business: ${businessName}`,
      parentId:  null,
      positionX: 80,
      positionY: 80,
    })

    // ── 2. Sub-contenedor por cada atributo no vacío ───────────────────────────
    const businessAttrs: [string, string][] = (
      [
        ['name',         result.data.business_name],
        ['type',         result.data.business_type],
        ['description',  result.data.description],
        ['language',     result.data.language],
        ['address',      result.data.address],
        ['phone',        result.data.phone],
        ['email',        result.data.email],
        ['main_topics',  result.data.main_topics?.join(', ')],
        ['social_links', result.data.social_links?.join(' | ')],
        ['scraped_url',  result.url],
      ] as [string, string | null | undefined][]
    ).filter((pair): pair is [string, string] => {
      const v = pair[1]
      return typeof v === 'string' && v.trim().length > 0
    })

    for (let i = 0; i < businessAttrs.length; i++) {
      const [key, value] = businessAttrs[i]
      const col = i % 3
      const row = Math.floor(i / 3)
      await createAttrNode(key, value, businessContainer.id, col * 340, row * 140)
    }

    const summary: ImportedSummary = {
      businessNodeId: businessContainer.id,
      attrCount:      businessAttrs.length,
    }

    if (strategy === 'business_only') {
      revalidatePath('/cms/board')
      return { success: true, data: summary }
    }

    // ── 3. Contenedor principal Pages ──────────────────────────────────────────
    const pagesContainer = await nodeService.createContainer({
      name:      `Pages: ${businessName}`,
      parentId:  null,
      positionX: 680,
      positionY: 80,
    })

    // ── 4. Sub-contenedor por cada página, con sus atributos anidados ──────────
    let pageCount = 0
    for (let i = 0; i < result.data.key_pages.length; i++) {
      const page  = result.data.key_pages[i]
      const col   = i % 3
      const row   = Math.floor(i / 3)
      const title = (page.title || page.url || `Page ${i + 1}`).substring(0, 60)
      // Add index suffix to avoid duplicate names if titles repeat
      const pageName = result.data.key_pages.filter((p, j) => j < i && (p.title || p.url) === (page.title || page.url)).length > 0
        ? `${title} (${i + 1})`
        : title

      const pageNode = await nodeService.createContainer({
        name:      pageName,
        parentId:  pagesContainer.id,
        positionX: col * 380,
        positionY: row * 160,
      })

      const pageAttrs: [string, string][] = (
        [
          ['url',        page.url],
          ['summary',    page.summary],
          ['key_points', Array.isArray(page.key_points)
            ? page.key_points.join(' • ')
            : page.key_points],
        ] as [string, string | null | undefined][]
      ).filter((pair): pair is [string, string] => {
        const v = pair[1]
        return typeof v === 'string' && v.trim().length > 0
      })

      for (let j = 0; j < pageAttrs.length; j++) {
        const [key, value] = pageAttrs[j]
        await createAttrNode(key, value, pageNode.id, j * 340, 0)
      }
      pageCount++
    }

    revalidatePath('/cms/board')
    return {
      success: true,
      data: { ...summary, pagesNodeId: pagesContainer.id, pagesCount: pageCount },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Import failed' }
  }
}
