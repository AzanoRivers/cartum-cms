# Media Storage — Cloudflare R2 + Vercel Blob

**[Español](#español) · [English](#english)**

---

## Español

Cartum soporta dos proveedores de almacenamiento de media intercambiables: **Cloudflare R2** y **Vercel Blob**. Ambos coexisten sin conflicto — cada archivo guarda su proveedor de origen y siempre se sirve desde su URL original, independientemente del proveedor activo en ese momento.

### Proveedores

| | Cloudflare R2 | Vercel Blob |
|---|---|---|
| **Cómo funciona** | URL presignada → browser hace PUT directo | Server Action → bytes pasan por Vercel |
| **Ventaja** | Los bytes nunca pasan por Vercel | Sin cuenta Cloudflare, más simple |
| **Variable de entorno** | `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, etc. | `BLOB_READ_WRITE_TOKEN` |
| **Config en CMS** | Settings → Storage → Cloudflare R2 | Settings → Storage → Vercel Blob |

### Cómo seleccionar el proveedor activo

1. Abre **Settings → Storage** en el CMS.
2. Configura las credenciales del proveedor deseado y guarda.
3. Si ambos proveedores están configurados, aparece un selector de proveedor activo en la parte superior de la sección.
4. Los nuevos uploads irán al proveedor activo. Los archivos existentes no se migran — siguen en su proveedor original.

### Backward compatibility

El campo `storageProvider` (`r2` | `blob`) se guarda en cada registro de la tabla `media`. Al servir o eliminar un archivo, Cartum siempre usa ese campo — no el proveedor activo. Esto garantiza que cambiar de proveedor no rompe ningún contenido existente.

### Flujo de upload por proveedor

**R2 (presigned URL)**
```
browser → getUploadUrl() → URL presignada → PUT directo a R2 → saveMediaRecord()
```

**Vercel Blob (server upload)**
```
browser → getUploadUrl() → { error: 'USE_SERVER_UPLOAD' } → uploadBlobDirect() → @vercel/blob put() → registro en DB
```

El hook `useMediaGallery` detecta la señal `USE_SERVER_UPLOAD` y enruta automáticamente.

### Límites de video por proveedor

| Proveedor | VPS configurado | Límite por video |
|---|---|---|
| Cloudflare R2 | No | 500 MB |
| Cloudflare R2 | Sí | 500 MB (compresión previa) |
| Vercel Blob | No | **50 MB (fijo, inapelable)** |
| Vercel Blob | Sí | 500 MB (VPS comprime → `/complete` route, sin límite de SA) |

**Por qué 50 MB es fijo para Blob sin VPS:** sin VPS, el `ArrayBuffer` completo del video viaja por un Server Action. Vercel impone un límite máximo de 50 MB en este flujo. No es un valor configurable — cambiarlo requiere cambiar la infraestructura de Vercel o usar el VPS.

La constante de referencia es `BLOB_VIDEO_MAX_BYTES` en `lib/media/blob-client.ts`.

**Comportamiento cuando se supera el límite (Blob activo, sin VPS):**

- Al seleccionar el archivo: el video es rechazado antes de entrar a la cola, con un toast de error inmediato.
- Si el VPS falla en medio de un upload (catch): si el video es mayor de 50 MB, el error es definitivo sin fallback.

**Comportamiento cuando el VPS falla con Blob activo:**

- Video menor o igual a 50 MB: el hook intenta `uploadVideoBlobDirect` como fallback automático.
- Video mayor de 50 MB: error sin fallback — no hay forma de subir ese video a Blob sin VPS.

### API pública — campos de media expandidos

Cuando el consumidor de la API usa `?include=fieldName` en un campo `image` o `video`, la respuesta incluye:

```json
{
  "id": "uuid",
  "url": "https://...",
  "mimeType": "image/webp",
  "storageProvider": "r2",
  "sizeBytes": 142381
}
```

El campo `storageProvider` en la respuesta indica el origen real del archivo.

### Variables de entorno

```env
# Cloudflare R2
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://media.tu-dominio.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=
```

### Archivos relevantes

| Archivo | Responsabilidad |
|---|---|
| `lib/media/storage-router.ts` | `getActiveProvider()` — lee el proveedor activo desde DB |
| `lib/media/blob-client.ts` | `blobUpload()` / `blobDelete()` — wrapper de `@vercel/blob` |
| `lib/media/r2-client.ts` | `getR2Client()` — wrapper de `@aws-sdk/client-s3` |
| `lib/actions/media.actions.ts` | `getUploadUrl`, `uploadBlobDirect`, `uploadVideoBlobDirect`, `getActiveStorageProvider` |
| `db/repositories/media.repository.ts` | CRUD de `media`, delete agnóstico por proveedor |
| `lib/hooks/useMediaGallery.ts` | Detecta `USE_SERVER_UPLOAD`, enruta a Blob, maneja límite de 50 MB |
| `app/api/internal/media/videos/complete/route.ts` | Finaliza uploads VPS: brancha a Blob o R2 según proveedor activo |
| `components/ui/organisms/settings/StorageSection.tsx` | UI de configuración de storage |

---

## English

Cartum supports two interchangeable media storage providers: **Cloudflare R2** and **Vercel Blob**. Both coexist without conflict — each file stores its origin provider and is always served from its original URL, regardless of the currently active provider.

### Providers

| | Cloudflare R2 | Vercel Blob |
|---|---|---|
| **How it works** | Presigned URL → browser does direct PUT | Server Action → bytes go through Vercel |
| **Advantage** | Media bytes never go through Vercel | No Cloudflare account needed, simpler setup |
| **Env var** | `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, etc. | `BLOB_READ_WRITE_TOKEN` |
| **CMS config** | Settings → Storage → Cloudflare R2 | Settings → Storage → Vercel Blob |

### Selecting the active provider

1. Open **Settings → Storage** in the CMS.
2. Configure credentials for the desired provider and save.
3. If both providers are configured, a provider selector appears at the top of the section.
4. New uploads go to the active provider. Existing files are not migrated — they stay on their original provider.

### Backward compatibility

The `storageProvider` field (`r2` | `blob`) is stored on every row in the `media` table. When serving or deleting a file, Cartum always uses that field — not the global active provider. This guarantees that switching providers never breaks existing content.

### Upload flow per provider

**R2 (presigned URL)**
```
browser → getUploadUrl() → presigned URL → direct PUT to R2 → saveMediaRecord()
```

**Vercel Blob (server upload)**
```
browser → getUploadUrl() → { error: 'USE_SERVER_UPLOAD' } → uploadBlobDirect() → @vercel/blob put() → DB record
```

The `useMediaGallery` hook detects the `USE_SERVER_UPLOAD` signal and routes automatically.

### Video limits by provider

| Provider | VPS configured | Limit per video |
|---|---|---|
| Cloudflare R2 | No | 500 MB |
| Cloudflare R2 | Yes | 500 MB (pre-compressed) |
| Vercel Blob | No | **50 MB (fixed, non-negotiable)** |
| Vercel Blob | Yes | 500 MB (VPS compresses, `/complete` route handles upload, no SA limit) |

**Why 50 MB is fixed for Blob without VPS:** without VPS, the full video `ArrayBuffer` travels through a Server Action. Vercel enforces a hard 50 MB maximum on this flow. It is not configurable — raising it requires changing Vercel infrastructure or enabling the VPS.

The reference constant is `BLOB_VIDEO_MAX_BYTES` in `lib/media/blob-client.ts`.

**Behavior when the limit is exceeded (Blob active, no VPS):**

- On file selection: the video is rejected before entering the queue, with an immediate error toast.
- If VPS fails mid-upload (catch block): if the video exceeds 50 MB, the error is final with no fallback.

**Behavior when VPS fails with Blob active:**

- Video 50 MB or smaller: the hook automatically attempts `uploadVideoBlobDirect` as a fallback.
- Video larger than 50 MB: error with no fallback — there is no way to upload that video to Blob without VPS.

### Public API — expanded media fields

When an API consumer uses `?include=fieldName` on an `image` or `video` field, the response includes:

```json
{
  "id": "uuid",
  "url": "https://...",
  "mimeType": "image/webp",
  "storageProvider": "r2",
  "sizeBytes": 142381
}
```

The `storageProvider` field in the response indicates the actual origin of the file.

### Environment variables

```env
# Cloudflare R2
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://media.your-domain.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=
```

### Relevant files

| File | Responsibility |
|---|---|
| `lib/media/storage-router.ts` | `getActiveProvider()` — reads active provider from DB |
| `lib/media/blob-client.ts` | `blobUpload()` / `blobDelete()` — `@vercel/blob` wrapper |
| `lib/media/r2-client.ts` | `getR2Client()` — `@aws-sdk/client-s3` wrapper |
| `lib/actions/media.actions.ts` | `getUploadUrl`, `uploadBlobDirect`, `uploadVideoBlobDirect`, `getActiveStorageProvider` |
| `db/repositories/media.repository.ts` | `media` CRUD, provider-aware delete |
| `lib/hooks/useMediaGallery.ts` | Detects `USE_SERVER_UPLOAD`, routes to Blob, enforces 50 MB video limit |
| `app/api/internal/media/videos/complete/route.ts` | Finalizes VPS uploads: branches to Blob or R2 based on active provider |
| `components/ui/organisms/settings/StorageSection.tsx` | Storage settings UI |
