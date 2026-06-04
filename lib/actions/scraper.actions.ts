'use server'

// Cada action lee scraperApiUrl + scraperApiKey desde getSetting()
// La API key nunca se expone al cliente

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/auth'
import { requireProjectId } from '@/lib/auth/get-project-id'
import { getSetting } from '@/lib/settings/get-setting'
import { assertTier2Access } from '@/lib/subscription'
import { scraperService } from '@/lib/services/scraper.service'
import { nodeService } from '@/lib/services/nodes.service'
import { validateScrapeResult } from '@/lib/validators/scraper.validator'
import { getR2Client } from '@/lib/media/r2-client'
import { blobUpload } from '@/lib/media/blob-client'
import { getActiveProvider } from '@/lib/media/storage-router'
import { mediaRepository } from '@/db/repositories/media.repository'
import type { ActionResult } from '@/types/actions'
import type {
  ScrapeOptions,
  ScrapeJobState,
  ScrapeResult,
  ScraperServerStatus,
  ImportStrategy,
  ImportedSummary,
  SectionImage,
} from '@/types/scraper'
import type { ImageFieldConfig, GalleryFieldConfig, GalleryItem } from '@/types/nodes'

const DEFAULT_SCRAPER_URL = 'https://scraper.azanolabs.com'

const _VALID_SCRAPE_IMAGE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
])

// ── Auth + config helper ───────────────────────────────────────────────────────

async function requireAuth(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')
  return session.user.id
}

async function getApiConfig(): Promise<{ apiUrl: string; apiKey: string }> {
  await requireAuth()
  const projectId = await requireProjectId().catch(() => null)

  async function resolveSetting(key: string, envFallback: string | undefined) {
    if (projectId) {
      const project = await getSetting(`${key}:${projectId}`)
      if (project) return project
    }
    return getSetting(key, envFallback)
  }

  const [url, key] = await Promise.all([
    resolveSetting('scraper_api_url', process.env.SCRAPER_API_URL),
    resolveSetting('scraper_api_key', process.env.SCRAPER_API_KEY),
  ])
  if (!key) throw new Error('SCRAPER_NOT_CONFIGURED')
  return { apiUrl: url ?? DEFAULT_SCRAPER_URL, apiKey: key }
}

// ── Image upload helper ────────────────────────────────────────────────────────

type _UploadedImage = { publicUrl: string; mediaId: string }

async function _uploadImageFromUrl(
  img: SectionImage,
  userId: string,
  nodeId: string,
  sectionLabel: string,
  idx: number,
  projectId: string,
): Promise<_UploadedImage | null> {
  try {
    const res = await fetch(img.src, {
      signal: AbortSignal.timeout(20_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CartumBot/1.0)',
        'Accept': 'image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })
    if (!res.ok) {
      console.warn(`[scraper-import] image fetch failed ${res.status}: ${img.src}`)
      return null
    }

    const contentType = res.headers.get('content-type') ?? ''
    const mimeType    = contentType.split(';')[0].trim().toLowerCase()
    if (!_VALID_SCRAPE_IMAGE_MIMES.has(mimeType)) {
      console.warn(`[scraper-import] invalid mime "${mimeType}": ${img.src}`)
      return null
    }

    const buffer = await res.arrayBuffer()
    if (buffer.byteLength === 0) return null

    const rawExt = mimeType.split('/')[1] ?? 'jpg'
    const ext    = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt
    const sectionSlug = sectionLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30) || 'section'
    const name = `${img.role}-${sectionSlug}-${idx}.${ext}`

    const provider = await getActiveProvider()
    let publicUrl: string
    let key: string

    if (provider === 'r2') {
      const r2 = await getR2Client()
      key = `uploads/${projectId}/${randomUUID()}.${ext}`
      await r2.client.send(new PutObjectCommand({
        Bucket:      r2.bucket,
        Key:         key,
        Body:        new Uint8Array(buffer),
        ContentType: mimeType,
      }))
      publicUrl = `${r2.publicUrl}/${key}`
    } else {
      const slug   = `uploads/${projectId}/${randomUUID()}.${ext}`
      const result = await blobUpload(slug, buffer, mimeType)
      key       = result.key
      publicUrl = result.publicUrl
    }

    const record = await mediaRepository.create({
      key,
      publicUrl,
      mimeType,
      sizeBytes:  buffer.byteLength,
      name,
      nodeId,
      uploadedBy: userId,
      projectId,
    })

    return { publicUrl, mediaId: record.id }
  } catch (err) {
    console.warn(`[scraper-import] image upload error: ${img.src}`, err)
    return null
  }
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
    await assertTier2Access()
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
    await assertTier2Access()
    const { apiUrl, apiKey } = await getApiConfig()
    await scraperService.cancelJob(apiUrl, apiKey, jobId)
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Import helpers ─────────────────────────────────────────────────────────────

/** Creates a container with a unique name, appending (2), (3)… on collision. */
async function _createUniqueContainer(
  baseName: string,
  parentId: string | null,
  positionX: number,
  positionY: number,
  projectId: string,
): Promise<Awaited<ReturnType<typeof nodeService.createContainer>>> {
  let name    = baseName
  let attempt = 1
  while (attempt <= 30) {
    try {
      return await nodeService.createContainer({ name, parentId, positionX, positionY }, projectId)
    } catch (err) {
      if (err instanceof Error && err.message === 'NODE_NAME_TAKEN' && attempt < 30) {
        attempt++
        name = `${baseName} (${attempt})`
        continue
      }
      throw err
    }
  }
  throw new Error('NODE_NAME_TAKEN')
}

// ── Import ─────────────────────────────────────────────────────────────────────
// Arquitectura:
//   Business → fields directamente en el contenedor (identifier=name, value=defaultValue)
//   Pages    → sub-contenedor por página → fields desde elements[] (identifier=name, value=defaultValue)
//              Fallback si elements vacío: url / summary / key_points como fields
//   Images   → solo cuando downloadImages=true; banner → image field, gallery_items → gallery field,
//              reference → image fields; logo se omite

export async function importScrapedData(
  result: ScrapeResult,
  strategy: ImportStrategy,
  downloadImages = false,
): Promise<ActionResult<ImportedSummary>> {
  try {
    await assertTier2Access()
    const userId    = await requireAuth()
    const projectId = await requireProjectId()

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
      const infoContainer = await _createUniqueContainer(`Info: ${businessName}`, null, 80, 80, projectId)
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
        }, projectId)
      }
      revalidatePath('/cms/board')
      return { success: true, data: { siteNodeId: infoContainer.id, attrCount: businessFields.length } }
    }

    // ── strategy: business_and_pages — 3-level hierarchy ──────────────────────
    // Site (root) → Info + nav section containers → field nodes

    const siteContainer = await _createUniqueContainer(`Site: ${businessName}`, null, 80, 80, projectId)
    const infoContainer = await _createUniqueContainer('Info', siteContainer.id, 0, 0, projectId)

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
      }, projectId)
    }

    const navSections = (result.data.nav_sections ?? []).filter(s => s.url != null)
    let sectionsCount   = 0
    let imagesImported  = 0

    const _uploadCache = new Map<string, _UploadedImage | null>()
    let   _imgIdx      = 0
    const _upload = async (img: SectionImage, nodeId: string, label: string): Promise<_UploadedImage | null> => {
      if (_uploadCache.has(img.src)) return _uploadCache.get(img.src) ?? null
      _imgIdx++
      const r = await _uploadImageFromUrl(img, userId, nodeId, label, _imgIdx, projectId)
      _uploadCache.set(img.src, r)
      return r
    }

    // Track used section labels to avoid sibling name collisions
    const usedSectionLabels = new Set<string>(['info'])

    for (let i = 0; i < navSections.length; i++) {
      const section = navSections[i]
      // +1 offset to leave slot 0 for Info container
      const col = (i + 1) % 3
      const row = Math.floor((i + 1) / 3)
      const baseLabel = (section.label || section.section_type || `Section ${i + 1}`).substring(0, 55)
      let label = baseLabel
      let sfx = 2
      while (usedSectionLabels.has(label.toLowerCase())) {
        label = `${baseLabel} (${sfx++})`
      }
      usedSectionLabels.add(label.toLowerCase())

      const sectionNode = await _createUniqueContainer(label, siteContainer.id, col * 420, row * 200, projectId)

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
        }, projectId)
      }

      // ── Image fields (only when downloadImages=true) ───────────────────────
      if (downloadImages) {
        const sectionImages = section.images ?? []

        // Deduplicate by src within this section (cross-section dedup via _uploadCache)
        const seenInSection = new Set<string>()
        const uniqueImages = sectionImages.filter(img => {
          if (!img.src || seenInSection.has(img.src)) return false
          seenInSection.add(img.src)
          return true
        })

        const galleryItems = uniqueImages.filter(img => img.role === 'gallery_item')
        const nonGallery   = uniqueImages.filter(img => img.role !== 'gallery_item')
        let imgFieldY = elements.length * 52

        // Gallery field — all gallery_items grouped in one field
        if (galleryItems.length > 0) {
          const items: GalleryItem[] = []
          for (const img of galleryItems) {
            const uploaded = await _upload(img, sectionNode.id, label)
            items.push({ url: uploaded?.publicUrl ?? img.src, mediaId: uploaded?.mediaId ?? null })
            if (uploaded) imagesImported++
          }
          const config: GalleryFieldConfig = { items }
          const field = await nodeService.createField({
            name:         'gallery',
            parentId:     sectionNode.id,
            fieldType:    'gallery',
            isRequired:   false,
            defaultValue: '',
            positionX:    0,
            positionY:    imgFieldY,
          }, projectId)
          await nodeService.updateFieldMeta(field.id, { config }, projectId)
          imgFieldY += 52
        }

        // Individual image field per non-gallery image (banner, reference, logo, etc.)
        // Field name: role for first, role_2/role_3... for subsequent same-role images
        const roleCount: Record<string, number> = {}
        for (let k = 0; k < nonGallery.length; k++) {
          const img      = nonGallery[k]
          const role     = img.role || 'image'
          const count    = roleCount[role] ?? 0
          roleCount[role] = count + 1
          const fieldName = count === 0 ? role : `${role}_${count + 1}`

          const uploaded = await _upload(img, sectionNode.id, label)
          const config: ImageFieldConfig = {
            defaultUrl:     uploaded?.publicUrl ?? img.src,
            defaultMediaId: uploaded?.mediaId   ?? null,
          }
          const field = await nodeService.createField({
            name:         fieldName,
            parentId:     sectionNode.id,
            fieldType:    'image',
            isRequired:   false,
            defaultValue: uploaded?.publicUrl ?? img.src,
            positionX:    0,
            positionY:    imgFieldY + k * 52,
          }, projectId)
          await nodeService.updateFieldMeta(field.id, { config }, projectId)
          if (uploaded) imagesImported++
        }
      }

      sectionsCount++
    }

    revalidatePath('/cms/board')
    return {
      success: true,
      data: {
        siteNodeId:     siteContainer.id,
        attrCount:      businessFields.length,
        sectionsCount,
        imagesImported: downloadImages ? imagesImported : undefined,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Import failed' }
  }
}
