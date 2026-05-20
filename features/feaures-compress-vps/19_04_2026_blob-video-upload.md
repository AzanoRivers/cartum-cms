# Feature: Vercel Blob, Soporte de Videos

**Fecha:** 2026-04-19  
**Scope:** Extender el soporte de Vercel Blob a videos, con límite de 50 MB en rutas sin VPS

---

## Contexto

La feature `19_04_2026_vercel-blob-storage.md` añadió Blob como proveedor dual para **imágenes**. Los videos quedaron fuera; siguen la ruta VPS -> R2 (o presigned URL -> R2 si no hay VPS).

Este plan extiende Blob a videos con dos rutas diferenciadas:

1. **Sin VPS (o VPS skipped / fallido)** -> upload directo al Blob vía Server Action, con límite estricto de **50 MB**
2. **Con VPS configurado** -> el pipeline VPS existente finaliza guardando en Blob en lugar de R2 (ruta `/complete`)

---

## Límite de 50 MB: límite fijo e inapelable

**50 MB es el máximo absoluto por upload al Blob cuando se sube desde un Server Action.**  
No es un valor conservador ni configurable. Es la restricción real de la plataforma para este flujo.

| Restricción | Valor |
|---|---|
| `serverActionsBodySizeLimit` elevado (`next.config.ts`) | 52 MB (margen mínimo) |
| **Límite real de Blob vía Server Action** | **50 MB** |
| Vercel Blob vía route handler (streaming server-side) | Sin límite práctico |

**Por qué solo aplica a la ruta sin VPS:**  
Sin VPS el `ArrayBuffer` completo viaja por el Server Action -> 50 MB máximo.  
Con VPS el output comprimido llega al route handler `/complete` (no es un Server Action) -> puede llamar `blob.put()` con streaming sin ese límite.

La constante `BLOB_VIDEO_MAX_BYTES = 50 * 1024 * 1024` se exporta desde `lib/media/blob-client.ts` y **no debe modificarse** sin cambiar también la infraestructura de Vercel.

---

## Flujos actuales de video

### A) Con VPS configurado
```
browser
  -> /init -> upload_id
  -> chunks -> /chunk (x N)
  -> /finalize -> job_id
  -> poll /status (50-90 %)
  -> /complete (route handler, server-side)
       |
  download VPS output
       |
  PutObjectCommand -> R2
       |
  mediaRepository.create({ storageProvider: 'r2' })
```

### B) Sin VPS, fallback silencioso
```
browser
  -> /init -> { skipped: true }
  -> getUploadUrl() -> presigned URL
  -> PUT video -> R2
  -> saveMediaRecord({ storageProvider: 'r2' })
```

---

## Nuevos flujos con Blob activo

### C) Blob activo + VPS configurado
```
browser
  -> /init -> upload_id
  -> chunks -> finalize -> polling
  -> /complete (route handler)
       | detecta getActiveProvider() === 'blob'
  download VPS output
       |
  blob.put(pathname, readable, mimeType)        <- CAMBIO
       |
  mediaRepository.create({ storageProvider: 'blob' })
```

### D) Blob activo + sin VPS (skipped)
```
browser
  -> getActiveStorageProvider()  <- nuevo server action
  -> /init -> { skipped: true }
  -> [provider === 'blob']
  -> validar file.size > 50 MB -> error toast ABORT
  -> <= 50 MB -> uploadVideoBlobDirect(arrayBuffer, mimeType)
                     |
               blob.put(pathname, buffer, mimeType)
                     |
               mediaRepository.create({ storageProvider: 'blob' })
```

### E) Blob activo + VPS falla (catch en hook)
```
uploadVideoViaVps() lanza error
  -> catch -> [provider === 'blob']
  -> validar file.size > 50 MB
      -> si: error toast "video too large for Blob fallback"
      -> no: uploadVideoBlobDirect (mismo que D)
```

### F) R2 activo (cualquier caso)
Sin cambios. Flujos A y B existentes tal cual.

---

## Matriz de decisión

| Provider | VPS | Tamaño | Resultado |
|---|---|---|---|
| R2 | Configurado | cualquiera | VPS -> R2 (sin cambios) |
| R2 | No / skip | cualquiera | Presigned -> R2 (sin cambios) |
| Blob | Configurado | cualquiera | VPS -> `/complete` -> Blob |
| Blob | No / skip | <= 50 MB | `uploadVideoBlobDirect` -> Blob |
| Blob | No / skip | > 50 MB | Error, no se sube |
| Blob | VPS falla | <= 50 MB | Fallback `uploadVideoBlobDirect` -> Blob |
| Blob | VPS falla | > 50 MB | Error, sin fallback disponible |

---

## Archivos a modificar

### 1. `lib/media/blob-client.ts`

Agregar constante exportada:
```ts
export const BLOB_VIDEO_MAX_BYTES = 50 * 1024 * 1024  // 50 MB
```

---

### 2. `lib/actions/media.actions.ts`

**a) Nueva acción `uploadVideoBlobDirect`:**
```ts
type UploadVideoBlobInput = {
  file:      ArrayBuffer
  mimeType:  string
  filename?: string
  nodeId?:   string
}

export async function uploadVideoBlobDirect(
  input: UploadVideoBlobInput,
): Promise<ActionResult<{ publicUrl: string; key: string }>> {
  const userId = await requireSession()
  if (input.file.byteLength > BLOB_VIDEO_MAX_BYTES) {
    return { success: false, error: 'VIDEO_TOO_LARGE_FOR_BLOB' }
  }
  const ext      = input.filename ? sanitizeExtension(input.filename) : 'mp4'
  const pathname = `uploads/videos/${randomUUID()}.${ext}`
  const { publicUrl, key } = await blobUpload(pathname, input.file, input.mimeType)
  await mediaRepository.create({
    key, publicUrl,
    mimeType:        input.mimeType,
    sizeBytes:       input.file.byteLength,
    name:            input.filename,
    nodeId:          input.nodeId,
    uploadedBy:      userId,
    storageProvider: 'blob',
  })
  return { success: true, data: { publicUrl, key } }
}
```

**b) Nueva acción `getActiveStorageProvider`:**
```ts
export async function getActiveStorageProvider(): Promise<ActionResult<StorageProvider>> {
  try {
    const provider = await getActiveProvider()
    return { success: true, data: provider }
  } catch {
    return { success: false, error: 'PROVIDER_UNKNOWN' }
  }
}
```

---

### 3. `app/api/internal/media/videos/complete/route.ts`

Actualmente hardcodeado a R2 con `PutObjectCommand`. Agregar branching por proveedor:

```ts
// Al inicio del handler POST, antes de PutObjectCommand:
const provider = await getActiveProvider()

if (provider === 'blob') {
  const { publicUrl } = await blobUpload(
    `uploads/videos/${job_id}.mp4`,
    videoBuffer,   // el stream ya leído
    'video/mp4',
  )
  await mediaRepository.create({
    key:             `uploads/videos/${job_id}.mp4`,
    publicUrl,
    mimeType:        'video/mp4',
    sizeBytes:       videoBuffer.byteLength,
    name:            originalFilename,
    nodeId:          nodeId ?? undefined,
    uploadedBy:      userId,
    storageProvider: 'blob',
  })
  return NextResponse.json({ success: true, publicUrl })
} else {
  // Código R2 existente (PutObjectCommand) sin cambios
}
```

> **Nota:** verificar cómo el route handler actual acumula el stream del VPS antes de subirlo. Si usa `stream.pipe(PassThrough)` -> para Blob usar `arrayBuffer()` o adaptar. Si ya tiene el buffer -> `blob.put(path, buffer, type)` directo.

---

### 4. `lib/hooks/useMediaGallery.ts`

En la rama de video (bloque `else` después del bloque de imagen):

**a) Obtener proveedor al inicio del upload de video:**
```ts
const providerRes = await getActiveStorageProvider()
const activeProvider = providerRes.success ? providerRes.data : 'r2'
```

**b) En el bloque de fallback cuando VPS está skipped (`{ skipped: true }`):**
```ts
// Antes (solo R2):
// const urlRes = await getUploadUrl(...)  -> presigned -> PUT -> R2

// Nuevo:
if (activeProvider === 'blob') {
  if (file.size > BLOB_VIDEO_MAX_BYTES) {
    patchEntry(id, { status: 'error', error: labels.videoBlobTooLarge })
    return 'error'
  }
  patchEntry(id, { status: 'uploading', progress: 10, phaseLabel: labels.videoUploading })
  const buf = await file.arrayBuffer()
  const res = await uploadVideoBlobDirect({
    file: buf, mimeType: finalMime, filename: finalFilename, nodeId,
  })
  if (!res.success) {
    patchEntry(id, { status: 'error', error: labels.error })
    return 'error'
  }
  patchEntry(id, { status: 'done', progress: 100, publicUrl: res.data.publicUrl })
  return 'ok'
} else {
  // Flujo R2 presigned existente
}
```

**c) En el catch del bloque VPS (fallback por error):**
```ts
catch (err) {
  if (activeProvider === 'blob') {
    if (file.size > BLOB_VIDEO_MAX_BYTES) {
      patchEntry(id, { status: 'error', error: labels.videoBlobTooLarge })
    } else {
      // intentar subir a Blob
      const buf = await file.arrayBuffer()
      const res = await uploadVideoBlobDirect({ file: buf, mimeType: finalMime, filename: finalFilename, nodeId })
      if (res.success) {
        patchEntry(id, { status: 'done', progress: 100, publicUrl: res.data.publicUrl })
        return 'ok'
      }
      patchEntry(id, { status: 'error', error: labels.error })
    }
    return 'error'
  }
  // fallback R2 existente (sin cambios)
}
```

---

### 5. `locales/en.ts` + `locales/es.ts`

Agregar bajo `mediaGallery`:

**en.ts:**
```ts
videoBlobTooLarge:     'Video exceeds 50 MB. Use Cloudflare R2 or configure a VPS optimizer to upload larger videos.',
videoBlobFallbackFail: 'VPS error and video exceeds the 50 MB Blob limit. Cannot upload.',
```

**es.ts:**
```ts
videoBlobTooLarge:     'El video supera 50 MB. Usa Cloudflare R2 o configura un optimizador VPS para subir videos más grandes.',
videoBlobFallbackFail: 'Error de VPS y el video supera el límite de 50 MB para Blob. No se puede subir.',
```

Actualizar tipo `Dictionary['mediaGallery']` con ambas keys.

---

### 6. `next.config.ts`

Verificar que `serverActionsBodySizeLimit` permita el payload de 50 MB:

```ts
experimental: {
  serverActionsBodySizeLimit: '52mb',   // margen sobre 50 MB
  proxyClientMaxBodySize:     '100mb',  // ya existente
}
```

---

### 7. UI: advertencia al usuario (dos puntos de aparición)

**Condición de activación:** proveedor activo es Blob **y** VPS no configurado.

#### 7a. Banner estático en el área de upload
Antes de que el usuario seleccione archivos, mostrar un aviso fijo en el dropzone o en la cabecera del upload modal:

```
Blob storage activo sin VPS: los videos tienen un límite fijo de 50 MB.
Para videos más grandes configura un Optimizador VPS en Settings -> Storage.
```

Esta info la proporciona el server: `MediaGalleryPage.tsx` llama `getStorageStatus()` y pasa props `{ activeProvider, vpsConfigured }` al componente de upload.

**Archivo probable:** `components/ui/organisms/MediaGalleryPage.tsx` -> prop hacia el upload modal o hacia el componente de dropzone.

#### 7b. Error inmediato al seleccionar el archivo
Cuando el usuario selecciona (o arrastra) un video con la condición activa, **antes de añadir el archivo a la cola**:
- Si `file.size > BLOB_VIDEO_MAX_BYTES` -> toast de error inmediato + el archivo **no entra en la cola**
- El mensaje usa el locale `videoBlobTooLarge`
- Misma mecánica que el check `videoSizeError` de 500 MB ya implementado en `addFilesToQueue`

```ts
// En addFilesToQueue (useMediaGallery.ts), junto al check de 500 MB:
if (
  isVideo &&
  activeProvider === 'blob' &&
  !vpsConfigured &&
  file.size > BLOB_VIDEO_MAX_BYTES
) {
  toast.error(labels.videoBlobTooLarge)
  return   // no push a la cola
}
```

`activeProvider` y `vpsConfigured` llegan como parámetros de `UploadLabels` o como props del hook. Definir el mecanismo más limpio en implementación.

**Archivo:** `lib/hooks/useMediaGallery.ts` -> `addFilesToQueue`.

---

### 8. Documentación

#### 8a. `README.md` (mención breve)
En la sección "Opcionales" de variables de entorno, junto al bloque de Vercel Blob:

```
Nota: con Blob activo y sin VPS, los videos tienen un límite fijo de 50 MB por archivo.
Para videos más grandes usa Cloudflare R2 o configura el VPS de optimización.
```

En la tabla de "problemas que resuelve" (ES + EN): actualizar la fila de subida de imágenes/video para mencionar el límite si aplica.

#### 8b. `docs/media-storage.md` (detalle en sección developer)
Agregar subsección **"Límites de video por proveedor"** dentro de la sección existente de Storage Providers, tanto en ES como EN:

Contenido que debe incluir:
- Tabla comparativa de límites por proveedor/ruta (R2 sin VPS: 500 MB, R2 con VPS: 500 MB, Blob sin VPS: **50 MB fijo**, Blob con VPS: 500 MB)
- Explicación de por qué el límite de 50 MB es fijo para Blob sin VPS (Server Action, no chunking)
- Comportamiento cuando se supera el límite: error inmediato al seleccionar el archivo, no entra en cola
- Comportamiento cuando el VPS falla con Blob activo: si <= 50 MB hace fallback a Blob; si > 50 MB error sin fallback
- Referencia a la constante `BLOB_VIDEO_MAX_BYTES` en `lib/media/blob-client.ts`

---

## Limitaciones conocidas

- **50 MB es un límite duro de plataforma**, no de código. Subirlo requiere cambiar la infraestructura de Vercel, no solo la constante
- Para videos > 50 MB con Blob activo, el VPS es **obligatorio**, no hay fallback posible
- `BLOB_VIDEO_MAX_BYTES` está en código como constante de referencia; su valor no debe cambiarse sin cambiar también el plan de Vercel y `serverActionsBodySizeLimit`
- El route handler `/complete` (con VPS) usa streaming server-side, no aplica el límite de 50 MB; puede manejar outputs comprimidos de cualquier tamaño dentro de los límites de tiempo de ejecución de Vercel (10 s free, 60 s pro, ilimitado enterprise)

---

## Checklist de Auditoría

### A: Server / acciones
- [x] A.1 `BLOB_VIDEO_MAX_BYTES` re-exportada desde `blob-client.ts` (definida en `types/media.ts`, re-export en `blob-client.ts`)
- [x] A.2 `uploadVideoBlobDirect` implementada en `media.actions.ts` con validación de 50 MB
- [x] A.3 `getActiveStorageProvider` implementada como server action
- [x] A.4 `/complete` route detecta `getActiveProvider()` y brancha a `blob.put` o `PutObjectCommand`
- [x] A.5 `storageProvider: 'blob'` pasa a `mediaRepository.create` en la ruta `/complete` vía Blob
- [x] A.6 `next.config.ts` tiene `serverActions: { bodySizeLimit: '52mb' }` (propiedad correcta de Next.js 16)

### B: Hook
- [x] B.1 Hook tiene `activeProviderRef` + `vpsConfiguredRef` + `blobVideoTooLargeLabelRef` como refs estables
- [x] B.2 Fallback skip + Blob: valida 50 MB -> error `videoBlobTooLarge` o `uploadVideoBlobDirect`
- [x] B.3 Catch VPS error + Blob: valida tamaño -> error `videoBlobFallbackFail` (>50 MB) o fallback `uploadVideoBlobDirect` (<=50 MB)
- [x] B.4 Flujo R2 (skip + fallback) sin cambios cuando `provider !== 'blob'`

### C: Locales
- [x] C.1 `videoBlobTooLarge` en `en.ts` y `es.ts`
- [x] C.2 `videoBlobFallbackFail` en `en.ts` y `es.ts`
- [x] C.3 Tipo `Dictionary['mediaGallery']` actualizado con ambas keys

### D: UI
- [x] D.1 Banner amber en `MediaUploadModal` cuando `blobVideoWarning` prop es truthy (computado en `MediaGalleryPage` como `activeProvider === 'blob' && !vpsConfigured`)
- [x] D.2 `addFilesToQueue`: video > 50 MB + blob sin VPS -> toast `videoBlobTooLarge` + archivo no entra en cola
- [x] D.3 La validación de D.2 ocurre **antes** del check de 500 MB (línea 388 vs línea 393 en el hook)

### E: Tests manuales
- [ ] E.1 Blob activo, sin VPS, video 30 MB -> sube a Blob, `storageProvider: 'blob'` en DB
- [ ] E.2 Blob activo, sin VPS, video 80 MB -> error toast, no entra en cola
- [ ] E.3 Blob activo, con VPS, video 200 MB -> VPS flow -> `/complete` -> guardado en Blob
- [ ] E.4 Blob activo, VPS falla, video 30 MB -> fallback a Blob, sube correctamente
- [ ] E.5 Blob activo, VPS falla, video 80 MB -> error toast sin fallback
- [ ] E.6 R2 activo, sin VPS, video cualquier tamaño -> flujo R2 sin cambios
- [ ] E.7 API `?include=videoField` devuelve `storageProvider: 'blob'` para videos Blob

### F: Build
- [ ] F.1 `pnpm build` sin errores TypeScript
- [ ] F.2 `pnpm tsc --noEmit` sin errores

### G: Documentación
- [x] G.1 `README.md`: nota sobre límite de 50 MB para Blob sin VPS (ES línea 126, EN línea 385)
- [x] G.2 `docs/media-storage.md`: subsección "Límites de video por proveedor" con tabla comparativa, explicación del límite fijo, comportamiento en error y fallback, referencia a `BLOB_VIDEO_MAX_BYTES` (ES + EN)
- [x] G.3 In-app docs: `DocsPage.tsx` renderiza `storageVideoLimitsTitle/Blob/R2`; locales tienen los 3 strings en `en.ts` y `es.ts`; tipo `Dictionary` actualizado
