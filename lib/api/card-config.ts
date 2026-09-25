import { Buffer } from 'node:buffer'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { project } from '@/db/schema'
import { mediaRepository } from '@/db/repositories/media.repository'
import { getActiveProvider } from '@/lib/media/storage-router'
import { restoreMediaFile } from '@/lib/media/storage-write'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  BLOB_VIDEO_MAX_BYTES,
} from '@/types/media'
import type {
  FieldConfig,
  FieldType,
  GalleryItem,
  TextFieldConfig,
  NumberFieldConfig,
  BooleanFieldConfig,
  RelationFieldConfig,
  ImageFieldConfig,
  VideoFieldConfig,
  GalleryFieldConfig,
} from '@/types/nodes'

// Hard technical cap on how many gallery items a single JSON request may
// carry (independent of the field's own optional `maxItems` config) — a
// base64 gallery payload can get huge fast, this just bounds one request.
const MAX_GALLERY_ITEMS_PER_REQUEST = 24

export type ConfigError = {
  ok: false
  error: string
  message: string
  status: number
}

export type ConfigResult =
  | { ok: true; config: FieldConfig | null }
  | ConfigError

function fail(error: string, message: string, status: number): ConfigError {
  return { ok: false, error, message, status }
}

// ── Base64 decoding ─────────────────────────────────────────────────────────

type DecodedMedia = { buffer: Buffer; mimeType: string }

function decodeBase64Media(raw: string, explicitMime?: string): DecodedMedia | null {
  const dataUriMatch = raw.match(/^data:([^;,]+);base64,([\s\S]+)$/)
  const mimeType = dataUriMatch ? dataUriMatch[1] : explicitMime
  const b64      = dataUriMatch ? dataUriMatch[2] : raw
  if (!mimeType) return null

  try {
    const buffer = Buffer.from(b64, 'base64')
    if (buffer.length === 0) return null
    return { buffer, mimeType }
  } catch {
    return null
  }
}

async function getProjectOwnerId(projectId: string): Promise<string | null> {
  const [row] = await db
    .select({ ownerId: project.ownerId })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1)
  return row?.ownerId ?? null
}

// ── Media reference resolution (shared by image / video / gallery items) ────

type MediaRefInput = {
  base64?:   unknown
  filename?: unknown
  mimeType?: unknown
  url?:      unknown
  mediaId?:  unknown
}

type ResolvedMediaRef = { url: string; mediaId: string | null }

async function resolveMediaRef(
  kind:      'image' | 'video',
  ref:       MediaRefInput,
  ctx:       { projectId: string; parentId: string },
): Promise<{ ok: true; ref: ResolvedMediaRef | null } | ConfigError> {
  // Priority: an existing mediaId wins, then base64 upload, then a plain
  // external url. Silently ignoring extra fields on ambiguous input keeps
  // this endpoint forgiving rather than pedantic about caller intent.
  if (typeof ref.mediaId === 'string' && ref.mediaId) {
    const media = await mediaRepository.findById(ref.mediaId, ctx.projectId)
    if (!media) return fail('MEDIA_NOT_FOUND', `No media asset with id '${ref.mediaId}' in this project.`, 404)
    const category = media.mimeType.startsWith('video/') ? 'video' : 'image'
    if (category !== kind) {
      return fail('MEDIA_TYPE_MISMATCH', `Media '${ref.mediaId}' is a ${category}, not a ${kind}.`, 422)
    }
    return { ok: true, ref: { url: media.publicUrl, mediaId: media.id } }
  }

  if (typeof ref.base64 === 'string' && ref.base64) {
    const explicitMime = typeof ref.mimeType === 'string' ? ref.mimeType : undefined
    const decoded = decodeBase64Media(ref.base64, explicitMime)
    if (!decoded) {
      return fail('INVALID_BASE64', 'Could not decode base64 media (missing/invalid data, or missing mimeType).', 422)
    }

    const allowed = kind === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES
    if (!(allowed as readonly string[]).includes(decoded.mimeType)) {
      return fail('FILE_TYPE_NOT_ALLOWED', `mimeType '${decoded.mimeType}' is not allowed for ${kind} fields.`, 422)
    }

    const maxSize = kind === 'image' ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES
    if (decoded.buffer.length > maxSize) {
      return fail('FILE_TOO_LARGE', `Decoded ${kind} is larger than the ${maxSize} bytes limit.`, 422)
    }

    const provider = await getActiveProvider(ctx.projectId)
    if (kind === 'video' && provider === 'blob' && decoded.buffer.length > BLOB_VIDEO_MAX_BYTES) {
      return fail('VIDEO_TOO_LARGE_FOR_BLOB', `Videos over ${BLOB_VIDEO_MAX_BYTES} bytes are not supported on Vercel Blob.`, 422)
    }

    const filename = typeof ref.filename === 'string' && ref.filename
      ? ref.filename
      : `upload.${decoded.mimeType.split('/')[1] ?? 'bin'}`

    const bytes = new Uint8Array(decoded.buffer).buffer
    const uploaded = await restoreMediaFile(ctx.projectId, bytes, decoded.mimeType, provider, filename)
    if (!uploaded) {
      return fail('STORAGE_NOT_CONFIGURED', 'Project storage (R2 or Blob) is not configured.', 422)
    }

    const uploadedBy = await getProjectOwnerId(ctx.projectId)
    if (!uploadedBy) {
      return fail('PROJECT_OWNER_MISSING', 'Project has no owner to attribute this upload to.', 422)
    }

    const media = await mediaRepository.create({
      projectId:       ctx.projectId,
      key:             uploaded.key,
      publicUrl:       uploaded.publicUrl,
      mimeType:        decoded.mimeType,
      sizeBytes:       decoded.buffer.length,
      name:            filename,
      nodeId:          ctx.parentId,
      uploadedBy,
      storageProvider: uploaded.storageProvider,
    })

    return { ok: true, ref: { url: media.publicUrl, mediaId: media.id } }
  }

  if (typeof ref.url === 'string' && ref.url) {
    return { ok: true, ref: { url: ref.url, mediaId: null } }
  }

  return { ok: true, ref: null }
}

// ── Per-fieldType config builders ────────────────────────────────────────────

function resolveTextConfig(raw: Record<string, unknown>): ConfigResult {
  const maxLength = raw.maxLength
  if (maxLength !== undefined && (typeof maxLength !== 'number' || maxLength <= 0)) {
    return fail('VALIDATION_ERROR', 'config.maxLength must be a positive number.', 422)
  }
  const config: TextFieldConfig = {
    multiline: typeof raw.multiline === 'boolean' ? raw.multiline : false,
    ...(maxLength !== undefined ? { maxLength } : {}),
  }
  return { ok: true, config }
}

function resolveNumberConfig(raw: Record<string, unknown>): ConfigResult {
  const subtype = raw.subtype === 'float' ? 'float' : 'integer'
  const valueMode = raw.valueMode === 'range' ? 'range' : 'fixed'

  if (valueMode === 'range') {
    const min = typeof raw.min === 'number' ? raw.min : undefined
    const max = typeof raw.max === 'number' ? raw.max : undefined
    if (min !== undefined && max !== undefined && min > max) {
      return fail('VALIDATION_ERROR', 'config.min must be less than or equal to config.max.', 422)
    }
    const config: NumberFieldConfig = {
      subtype, valueMode,
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
    }
    return { ok: true, config }
  }

  const fixedValue = typeof raw.fixedValue === 'number' ? raw.fixedValue : null
  const config: NumberFieldConfig = { subtype, valueMode, fixedValue }
  return { ok: true, config }
}

function resolveBooleanConfig(raw: Record<string, unknown>): ConfigResult {
  const config: BooleanFieldConfig = {
    defaultValue: typeof raw.defaultValue === 'boolean' ? raw.defaultValue : false,
    ...(typeof raw.trueLabel === 'string' && raw.trueLabel ? { trueLabel: raw.trueLabel } : {}),
    ...(typeof raw.falseLabel === 'string' && raw.falseLabel ? { falseLabel: raw.falseLabel } : {}),
  }
  return { ok: true, config }
}

function resolveRelationConfig(raw: Record<string, unknown>, relationTargetId: string): ConfigResult {
  const relationType = raw.relationType === '1:1' || raw.relationType === 'n:m' ? raw.relationType : '1:n'
  const config: RelationFieldConfig = { relationTargetId, relationType }
  return { ok: true, config }
}

async function resolveImageOrVideoConfig(
  kind: 'image' | 'video',
  raw:  Record<string, unknown>,
  ctx:  { projectId: string; parentId: string },
): Promise<ConfigResult> {
  const resolved = await resolveMediaRef(kind, raw, ctx)
  if (!resolved.ok) return resolved

  const config: ImageFieldConfig | VideoFieldConfig = {
    defaultUrl:     resolved.ref?.url ?? null,
    defaultMediaId: resolved.ref?.mediaId ?? null,
  }
  return { ok: true, config }
}

async function resolveGalleryConfig(
  raw: Record<string, unknown>,
  ctx: { projectId: string; parentId: string },
): Promise<ConfigResult> {
  const rawItems = Array.isArray(raw.items) ? raw.items : []
  if (rawItems.length > MAX_GALLERY_ITEMS_PER_REQUEST) {
    return fail('VALIDATION_ERROR', `A single request cannot carry more than ${MAX_GALLERY_ITEMS_PER_REQUEST} gallery items.`, 422)
  }

  const maxItems = typeof raw.maxItems === 'number' && raw.maxItems > 0 ? raw.maxItems : undefined
  if (maxItems !== undefined && rawItems.length > maxItems) {
    return fail('VALIDATION_ERROR', `config.items has more entries than config.maxItems (${maxItems}).`, 422)
  }

  const items: GalleryItem[] = []
  for (const rawItem of rawItems) {
    if (typeof rawItem !== 'object' || rawItem === null) {
      return fail('VALIDATION_ERROR', 'Each gallery item must be an object.', 422)
    }
    const resolved = await resolveMediaRef('image', rawItem as MediaRefInput, ctx)
    if (!resolved.ok) return resolved
    if (!resolved.ref) {
      return fail('VALIDATION_ERROR', 'Each gallery item needs a mediaId, base64, or url.', 422)
    }
    items.push({ url: resolved.ref.url, mediaId: resolved.ref.mediaId })
  }

  const config: GalleryFieldConfig = { items, ...(maxItems !== undefined ? { maxItems } : {}) }
  return { ok: true, config }
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Validates and resolves the `config` a POST /api/v1/card request sends,
 * per fieldType. For image/video/gallery, `config` may carry base64 media
 * (decoded, uploaded to the project's active storage provider, and turned
 * into a real media row) instead of only an already-hosted `url`.
 */
export async function resolveCreateFieldConfig(
  fieldType:        FieldType,
  rawConfig:        unknown,
  relationTargetId: string | undefined,
  ctx:              { projectId: string; parentId: string },
): Promise<ConfigResult> {
  const raw = (typeof rawConfig === 'object' && rawConfig !== null ? rawConfig : {}) as Record<string, unknown>

  switch (fieldType) {
    case 'text':    return resolveTextConfig(raw)
    case 'number':  return resolveNumberConfig(raw)
    case 'boolean': return resolveBooleanConfig(raw)
    case 'relation':
      if (!relationTargetId) {
        // validator.ts already rejects this earlier — kept here defensively.
        return fail('RELATION_REQUIRES_TARGET', 'relationTargetId is required for relation fields.', 422)
      }
      return resolveRelationConfig(raw, relationTargetId)
    case 'image':   return resolveImageOrVideoConfig('image', raw, ctx)
    case 'video':   return resolveImageOrVideoConfig('video', raw, ctx)
    case 'gallery': return resolveGalleryConfig(raw, ctx)
  }
}
