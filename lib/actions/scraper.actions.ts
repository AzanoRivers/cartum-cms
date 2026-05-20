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
// Arquitectura:
//   Business → fields directamente en el contenedor (identifier=name, value=defaultValue)
//   Pages    → sub-contenedor por página → fields desde elements[] (identifier=name, value=defaultValue)
//              Fallback si elements vacío: url / summary / key_points como fields

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

    // ── 2. Fields de negocio — identifier como nombre, valor en defaultValue ──
    const businessFields: [string, string][] = (
      [
        ['business_name',  result.data.business_name],
        ['business_type',  result.data.business_type],
        ['description',    result.data.description],
        ['language',       result.data.language],
        ['address',        result.data.address],
        ['phone',          result.data.phone],
        ['email',          result.data.email],
        ['main_topics',    result.data.main_topics?.join(', ')],
        ['social_links',   result.data.social_links?.join(' | ')],
        ['scraped_url',    result.url],
      ] as [string, string | null | undefined][]
    ).filter((pair): pair is [string, string] => {
      const v = pair[1]
      return typeof v === 'string' && v.trim().length > 0
    })

    for (let i = 0; i < businessFields.length; i++) {
      const [key, value] = businessFields[i]
      const col = i % 2
      const row = Math.floor(i / 2)
      await nodeService.createField({
        name:         key,
        parentId:     businessContainer.id,
        fieldType:    'text',
        isRequired:   false,
        defaultValue: value.substring(0, 255),
        positionX:    col * 320,
        positionY:    row * 52,
      })
    }

    const summary: ImportedSummary = {
      businessNodeId: businessContainer.id,
      attrCount:      businessFields.length,
    }

    if (strategy === 'business_only') {
      revalidatePath('/cms/board')
      return { success: true, data: summary }
    }

    // ── 3. Contenedor principal Pages ──────────────────────────────────────────
    const pagesContainer = await nodeService.createContainer({
      name:      `Pages: ${businessName}`,
      parentId:  null,
      positionX: 780,
      positionY: 80,
    })

    // ── 4. Sub-contenedor por página → fields de sus elementos ─────────────────
    let pageCount = 0
    for (let i = 0; i < result.data.key_pages.length; i++) {
      const page  = result.data.key_pages[i]
      const col   = i % 3
      const row   = Math.floor(i / 3)
      const title = (page.title || page.url || `Page ${i + 1}`).substring(0, 60)
      const isDup = result.data.key_pages.some(
        (p, j) => j < i && (p.title || p.url) === (page.title || page.url),
      )
      const pageName = isDup ? `${title} (${i + 1})` : title

      const pageNode = await nodeService.createContainer({
        name:      pageName,
        parentId:  pagesContainer.id,
        positionX: col * 420,
        positionY: row * 200,
      })

      // Campos: desde elements[] si disponible, si no fallback a url/summary/key_points
      const elements = page.elements ?? []
      const pageFields: [string, string][] = []

      if (elements.length > 0) {
        // Deduplica tipos repetidos: h1 → h1, h1_1, h1_2 …
        const typeCounts: Record<string, number> = {}
        for (const el of elements) {
          if (!el.text?.trim()) continue
          const count = typeCounts[el.type] ?? 0
          typeCounts[el.type] = count + 1
          const fieldName = count === 0 ? el.type : `${el.type}_${count}`
          pageFields.push([fieldName, el.text])
        }
      } else {
        // Fallback para resultados sin elements
        if (page.url?.trim())     pageFields.push(['url',        page.url])
        if (page.summary?.trim()) pageFields.push(['summary',    page.summary])
        const kp = Array.isArray(page.key_points)
          ? page.key_points.join(' • ')
          : (page.key_points ?? '')
        if (kp.trim()) pageFields.push(['key_points', kp])
      }

      for (let j = 0; j < pageFields.length; j++) {
        const [name, value] = pageFields[j]
        await nodeService.createField({
          name,
          parentId:     pageNode.id,
          fieldType:    'text',
          isRequired:   false,
          defaultValue: value.substring(0, 255),
          positionX:    0,
          positionY:    j * 52,
        })
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
