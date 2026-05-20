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

    // ── Business metadata fields ───────────────────────────────────────────────
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

    // ── strategy: business_only — flat Info container ──────────────────────────
    if (strategy === 'business_only') {
      const infoContainer = await nodeService.createContainer({
        name:      `Info: ${businessName}`,
        parentId:  null,
        positionX: 80,
        positionY: 80,
      })
      for (let i = 0; i < businessFields.length; i++) {
        const [key, value] = businessFields[i]
        await nodeService.createField({
          name:         key,
          parentId:     infoContainer.id,
          fieldType:    'text',
          isRequired:   false,
          defaultValue: value.substring(0, 255),
          positionX:    (i % 2) * 320,
          positionY:    Math.floor(i / 2) * 52,
        })
      }
      revalidatePath('/cms/board')
      return { success: true, data: { siteNodeId: infoContainer.id, attrCount: businessFields.length } }
    }

    // ── strategy: business_and_pages — 3-level hierarchy ──────────────────────
    // Site (root) → Info + nav section containers → field nodes

    const siteContainer = await nodeService.createContainer({
      name:      `Site: ${businessName}`,
      parentId:  null,
      positionX: 80,
      positionY: 80,
    })

    const infoContainer = await nodeService.createContainer({
      name:      'Info',
      parentId:  siteContainer.id,
      positionX: 0,
      positionY: 0,
    })

    for (let i = 0; i < businessFields.length; i++) {
      const [key, value] = businessFields[i]
      await nodeService.createField({
        name:         key,
        parentId:     infoContainer.id,
        fieldType:    'text',
        isRequired:   false,
        defaultValue: value.substring(0, 255),
        positionX:    (i % 2) * 320,
        positionY:    Math.floor(i / 2) * 52,
      })
    }

    const navSections = (result.data.nav_sections ?? []).filter(s => s.url != null)
    let sectionsCount = 0

    for (let i = 0; i < navSections.length; i++) {
      const section = navSections[i]
      // +1 offset to leave slot 0 for Info container
      const col = (i + 1) % 3
      const row = Math.floor((i + 1) / 3)
      const label = (section.label || section.section_type || `Section ${i + 1}`).substring(0, 60)

      const sectionNode = await nodeService.createContainer({
        name:      label,
        parentId:  siteContainer.id,
        positionX: col * 420,
        positionY: row * 200,
      })

      const elements = section.elements ?? []
      const typeCounts: Record<string, number> = {}
      for (let j = 0; j < elements.length; j++) {
        const el = elements[j]
        if (!el.text?.trim()) continue
        const count = typeCounts[el.type] ?? 0
        typeCounts[el.type] = count + 1
        const fieldName = count === 0 ? el.type : `${el.type}_${count}`
        await nodeService.createField({
          name:         fieldName,
          parentId:     sectionNode.id,
          fieldType:    'text',
          isRequired:   false,
          defaultValue: el.text.substring(0, 255),
          positionX:    0,
          positionY:    j * 52,
        })
      }

      sectionsCount++
    }

    revalidatePath('/cms/board')
    return {
      success: true,
      data: { siteNodeId: siteContainer.id, attrCount: businessFields.length, sectionsCount },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Import failed' }
  }
}
