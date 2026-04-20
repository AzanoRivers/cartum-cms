# Feature: Vercel Blob Storage Support

**Fecha:** 2026-04-19  
**Scope:** Almacenamiento de medios — soporte dual R2 + Vercel Blob con selección de proveedor activo

---

## Objetivo

Agregar Vercel Blob como segunda opción de almacenamiento de imágenes/medios, manteniendo R2 como proveedor por defecto. Si ambos están configurados, el usuario elige el proveedor activo desde la configuración. La UI de almacenamiento se reorganiza con acordeones por proveedor.

---

## Arquitectura: Storage Router

Se introduce `lib/media/storage-router.ts` como capa de abstracción.  
Toda operación de media (upload, delete) pasa por él — nunca llama R2 o Blob directamente.

```
lib/actions/media.actions.ts
        ↓
lib/media/storage-router.ts   ← NUEVO — lee setting "storage_provider"
    ↓               ↓
r2-client.ts    blob-client.ts  ← NUEVO
```

El `storage-router` resuelve qué cliente usar según:
1. `storage_provider` setting (DB) → `'r2'` | `'blob'`
2. Si no hay setting → R2 por defecto
3. Si el proveedor activo no está configurado → error claro

---

## Archivos a crear

### `lib/media/blob-client.ts`
```ts
// Wrapper sobre @vercel/blob — análogo a r2-client.ts
// Expone: put(key, data, mimeType) → publicUrl
//         del(key) → void
// Lanza 'BLOB_NOT_CONFIGURED' si BLOB_READ_WRITE_TOKEN no disponible
// getSetting('blob_token', process.env.BLOB_READ_WRITE_TOKEN)
```

### `lib/media/storage-router.ts`
```ts
export type StorageProvider = 'r2' | 'blob'

// getActiveProvider(): Promise<StorageProvider>
//   - Lee setting 'storage_provider' (DB) con fallback 'r2'

// uploadMedia(params): Promise<{ key, publicUrl }>
//   - Según proveedor activo llama r2-client o blob-client

// deleteMedia(key): Promise<void>
//   - Según proveedor activo
```

---

## Archivos a modificar

### 1. `types/settings.ts`

Agregar a `StorageSettings`:
```ts
blobToken?:       string   // BLOB_READ_WRITE_TOKEN editable desde UI
storageProvider?: 'r2' | 'blob'  // proveedor activo
```

Agregar tipo auxiliar:
```ts
export type StorageProvider = 'r2' | 'blob'
```

---

### 2. `lib/boot/validate.ts`

Agregar check opcional después del bloque de R2 (sección 7–9):

```ts
// ── 10. Vercel Blob (optional) ─────────────────────────────────────────────
const blobToken = await getSetting('blob_token', process.env.BLOB_READ_WRITE_TOKEN)
if (blobToken) {
  ok('Vercel Blob — OK')
} else {
  info('CARTUM_I001', 'Vercel Blob not configured. Optional — set BLOB_READ_WRITE_TOKEN to enable.')
}
```

Usar `info` (no `warn`) porque es completamente opcional.  
Requiere agregar `info()` al logger si no existe, o reutilizar el existente.

---

### 3. `lib/boot/logger.ts`

Revisar si existe función `info()` — si solo hay `ok/warn/fatal`, agregar:
```ts
export function info(code: string, message: string): void
// Formato visual distinto de warn: cyan/azul, no amarillo
```

---

### 4. `lib/actions/settings.actions.ts`

`getStorageSettings`:
- Agregar `getSetting('blob_token', ...)` y `getSetting('storage_provider', 'r2')`
- Retornar en `StorageSettings`

`updateStorageSettings`:
- Agregar `setSetting('blob_token', ...)` y `setSetting('storage_provider', ...)`

Nuevo action `testBlobConnection`:
- Instancia blob client, hace un tiny put de texto + inmediato del
- Retorna `{ success, latencyMs }` — análogo a `testStorageConnection`

---

### 5. `lib/actions/media.actions.ts`

`getUploadUrl` (presigned para R2):
- Solo aplica cuando proveedor activo = R2
- Si proveedor = Blob → retornar `{ success: false, error: 'USE_BLOB_DIRECT' }` o redirigir a `uploadViaServer`

`uploadViaServer`:
- Reemplazar el PUT a R2 directo por `storageRouter.uploadMedia()`
- El resto (compresión VPS, optimización) no cambia

`deleteMediaRecord`:
- `mediaRepository.delete(id)` ya maneja el delete a R2 internamente
- Mover lógica de delete al `storage-router` para ser agnóstico
- `media.repository.ts` → recibir `storageProvider` o llamar al router

> **Nota:** Para Vercel Blob el flujo de upload directo desde browser cambia.  
> Blob usa `@vercel/blob/client` con `upload()` + server token endpoint.  
> Considerar en implementación si se soporta presigned o solo server-side upload.  
> Recomendado: mantener server-side para Blob (igual que `uploadViaServer`),  
> evitar complejidad de endpoint de token temporal.

---

### 6. `components/ui/organisms/settings/StorageSection.tsx`

Rediseño completo con acordeones. Estructura visual:

```
┌─ Almacenamiento ──────────────────────────────┐
│                                               │
│  Proveedor activo: [R2 ▼] [Blob]             │
│  (selector radio/toggle — solo visible si     │
│   ambos proveedores están configurados)       │
│                                               │
│  ▼ Cloudflare R2              [●] Activo      │
│  ┌─────────────────────────────────────────┐ │
│  │ R2 Bucket Name  [____________]          │ │
│  │ R2 Public URL   [____________]          │ │
│  │ VPS URL         [____________]          │ │
│  │ VPS API Key     [●●●●●●] [Mostrar]     │ │
│  │              [Test conexión] [Guardar]  │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ▶ Vercel Blob                [○] Inactivo    │
│  (colapsado — expandir para configurar)       │
│                                               │
└───────────────────────────────────────────────┘
```

**Acordeón:**
- Usar transición `max-height` + `opacity` (mismo patrón que `MediaBulkBar` en el grid)
- Animación: 300ms ease-out stretch/collapse
- Estado abierto/cerrado por proveedor, independiente
- Ícono chevron que rota 180° al abrir

**Indicador de estado por proveedor:**
- Badge `●  Configurado` (success) / `○  No configurado` (muted) / `★  Activo` (primary)
- Visible en el header del acordeón siempre (abierto o cerrado)

**Selector de proveedor activo:**
- Solo se muestra si AMBOS proveedores están configurados (tienen token/credenciales)
- Radio buttons o toggle segmentado: `[Cloudflare R2] [Vercel Blob]`
- Al cambiar → guarda `storage_provider` setting inmediatamente (no espera "Guardar")

**Sección Vercel Blob:**
- Campo `BLOB_READ_WRITE_TOKEN` (tipo password, con toggle mostrar/ocultar)
- Botón test conexión
- Botón guardar
- Link a docs de Vercel Blob

---

### 7. `locales/en.ts` + `locales/es.ts`

Agregar en sección `settings.storage`:
```ts
// Títulos acordeón
r2SectionTitle:       'Cloudflare R2'
blobSectionTitle:     'Vercel Blob'
providerSectionTitle: 'Active provider'

// Provider selector
providerR2:           'Cloudflare R2'
providerBlob:         'Vercel Blob'
providerHint:         'Applies to all new uploads. Existing media stays on its original provider.'

// Blob fields
blobToken:            'Read/Write Token'
blobTokenPlaceholder: 'vercel_blob_rw_...'

// Status badges
statusConfigured:    'Configured'
statusNotConfigured: 'Not configured'
statusActive:        'Active'

// Test / save
testBlobOk:          'Blob OK ({latencyMs}ms)'
testBlobFail:        'Blob connection failed'
```

---

## Flujo de upload post-optimización (detalle por tier y proveedor)

> **Principio clave:** el VPS nunca habla con Vercel. El browser habla con el VPS directo
> usando un token de 2h (`X-Session-Token`). El resultado optimizado vuelve **al browser**.
> Vercel solo interviene en pasos diminutos (presigned URL, save metadata) — nunca toca bytes de imagen.

---

### Proveedor R2 — flujo completo (actual, sin cambios)

```
① Browser compress (Tier 1 — client, sin red)
        ↓
② [si VPS configurado] Browser → VPS directo (token 2h, sin Vercel)
        VPS devuelve webp optimizado → browser
        [si VPS no disponible → usar resultado Tier 1]
        ↓
③ getUploadUrl() → presigned PUT URL de R2
   (server action, solo metadata — 0 bytes de imagen por Vercel)
        ↓
④ Browser PUT directo a R2 via XHR + progress
   (sin Vercel — bytes van browser → R2)
        ↓
⑤ saveMediaRecord() → metadata en DB
   storageProvider: 'r2'
```

**Vercel toca bytes de imagen:** nunca.

---

### Proveedor Blob — flujo completo (nuevo)

```
① Browser compress (Tier 1 — client, sin red)
        ↓
② [si VPS configurado] Browser → VPS directo (token 2h, sin Vercel)
        VPS devuelve webp optimizado → browser
        [si VPS no disponible → usar resultado Tier 1]
        ↓
③ Browser envía blob final al servidor Next.js  ← único paso distinto vs R2
   (Blob no soporta presigned PUT — escritura es siempre server-side)
        ↓
④ Servidor hace PUT a Vercel Blob via @vercel/blob
        ↓
⑤ saveMediaRecord() → metadata en DB
   storageProvider: 'blob'
```

**Vercel toca bytes de imagen:** sí, en el paso ③→④. Unavoidable — limitación de Blob API.  
**VPS sigue siendo directo (sin Vercel)** — mismo token 2h, mismo endpoint directo.  
La única diferencia con R2 es el destino final de los bytes ya optimizados.

---

### Comparativa por proveedor

| Paso | R2 | Blob |
|------|----|------|
| Tier 1 compress | browser (sin red) | browser (sin red) |
| Tier 2 VPS | browser → VPS directo (token 2h) | browser → VPS directo (token 2h) |
| Storage write | browser → R2 presigned (sin Vercel) | browser → Next.js → Blob (pasa por Vercel) |
| Vercel toca imagen | nunca | solo en write final |
| Progress XHR | sí (XHR + presigned) | no (fetch server action) |

---

### Impacto en `useMediaGallery.ts`

El hook detecta el proveedor activo antes de `getUploadUrl()`:

```ts
// Pseudo-código del cambio
const provider = await getActiveStorageProvider()  // nueva server action

if (provider === 'blob') {
  // Pasos ①② igual que R2
  // Paso ③: enviar blob final al servidor
  const res = await uploadBlobDirect(finalBlob, finalMime, finalFilename)
  // res.publicUrl viene de Vercel Blob
} else {
  // Flujo R2 actual — sin cambios
  const urlRes = await getUploadUrl({ filename: finalFilename, mimeType: finalMime })
  await uploadFileWithProgress(finalBlob, uploadUrl, finalMime, onProgress)
}
```

Nueva server action `uploadBlobDirect(file, mimeType, filename)`:
- Recibe el blob ya optimizado del browser
- Llama `blob-client.put()`
- Llama `saveMediaRecord()` con `storageProvider: 'blob'`
- Retorna `{ publicUrl, key }`

> No hay progress XHR en flujo Blob — el browser hace un `fetch` POST al server action.  
> Mostrar spinner indeterminado en lugar de barra de porcentaje durante este paso.

---

## Resolución de campos `media` en el API público de nodos

**Problema actual:** campos de tipo `media` en un nodo almacenan solo el UUID del media record.
`flattenRecord` devuelve ese UUID crudo — el consumer no puede mostrar la imagen sin otra llamada.
`expandRelations` en `lib/api/utils.ts` solo resuelve campos `relation`, ignora `media`.

**Solución:** extender `expandRelations` para resolver también campos `media`:

```ts
// lib/api/utils.ts — extender expandRelations
// Agregar rama para fieldType === 'media'
const field = fields.find((f) => f.name === fieldName &&
  (f.fieldType === 'relation' || f.fieldType === 'media'))

if (field?.fieldType === 'media') {
  const mediaId = record.data[fieldName]
  if (!mediaId || typeof mediaId !== 'string') continue
  const mediaRow = await mediaRepository.findById(mediaId)
  if (!mediaRow) continue
  result[fieldName] = {
    url:             mediaRow.publicUrl,
    mimeType:        mediaRow.mimeType,
    storageProvider: mediaRow.storageProvider,
    sizeBytes:       mediaRow.sizeBytes,
  }
}
```

**Respuesta API con media resuelto** (via `?include=foto`):
```json
{
  "id": "record-uuid",
  "nombre": "Producto A",
  "foto": {
    "url": "https://xxx.public.blob.vercel-storage.com/uploads/imagen.webp",
    "mimeType": "image/webp",
    "storageProvider": "blob",
    "sizeBytes": 48200
  }
}
```

La `url` es HTTPS pública del CDN — usable directamente en `<img src="...">` sin conversión.
Vercel Blob retorna URLs HTTPS estándar, no `blob:` URLs de browser — son la misma cosa visualmente.

**Sin `?include`:** campo devuelve UUID crudo (comportamiento actual — no rompe consumidores existentes).
**Con `?include=foto`:** devuelve objeto completo con `url` lista para consumir.

**Archivos a modificar:**
- `lib/api/utils.ts` — `expandRelations` agrega rama `fieldType === 'media'`
- `db/repositories/media.repository.ts` — `findById` ya existe, no cambia

---

## Campo `storageProvider` en DB y API

### Cambio en schema DB (`media` table)

Agregar columna:
```sql
storage_provider  VARCHAR(10)  NOT NULL  DEFAULT 'r2'
-- valores: 'r2' | 'blob'
```

Migración Drizzle:
```ts
storageProvider: varchar('storage_provider', { length: 10 }).notNull().default('r2')
```

Registros existentes (sin columna) → migración setea `'r2'` por defecto. Correcto — todos los medios actuales están en R2.

### Cambio en `MediaRecord` type

```ts
// types/media.ts
export type MediaRecord = {
  // ... campos actuales ...
  storageProvider: 'r2' | 'blob'   // ← NUEVO
}
```

### API pública — respuesta enriquecida

Los endpoints REST autogenerados que retornan campos de tipo `media` incluirán:

```json
{
  "id": "uuid",
  "publicUrl": "https://cdn.example.com/uploads/foto.webp",
  "mimeType": "image/webp",
  "sizeBytes": 48200,
  "storageProvider": "blob",
  "name": "foto-producto.webp"
}
```

**Por qué es útil para el frontend consumer:**

| `storageProvider` | Comportamiento recomendado en consumer |
|-------------------|-----------------------------------------|
| `'blob'`          | Puede usar `?w=800&q=80` de Vercel Image Optimization directamente en la URL |
| `'r2'`            | URL CDN directa — no soporta transform params nativos |

El consumer ya tiene `mimeType` para saber si es `image/webp` vs original.  
No hace falta campo extra de formato — `mimeType` es suficiente.

### Impacto en `mediaRepository`

```ts
// toMediaRecord() — agregar campo
storageProvider: row.storageProvider as 'r2' | 'blob',

// create() — recibir storageProvider en SaveMediaInput
storageProvider: input.storageProvider ?? 'r2',

// delete() — usar row.storageProvider para llamar al router correcto
// (en vez de asumir siempre R2)
```

---

## Orden de implementación

1. `db/schema.ts` — columna `storage_provider` en tabla `media`
2. Migración Drizzle — `pnpm db:migrate`
3. `types/media.ts` — `storageProvider` en `MediaRecord` y `SaveMediaInput`
4. `types/settings.ts` — tipos settings nuevos
5. `lib/media/blob-client.ts` — cliente Blob
6. `lib/media/storage-router.ts` — router
7. `lib/boot/validate.ts` + `logger.ts` — check boot
8. `lib/actions/settings.actions.ts` — actions storage
9. `lib/actions/media.actions.ts` — routing upload/delete + manejo `USE_SERVER_UPLOAD`
10. `lib/hooks/useMediaGallery.ts` — detectar `USE_SERVER_UPLOAD` en tier 1
11. `db/repositories/media.repository.ts` — incluir `storageProvider` + delete agnóstico
12. `StorageSection.tsx` — UI acordeón
13. `locales/` — textos

---

## Decisiones de diseño

| Decisión | Razonamiento |
|----------|-------------|
| R2 default si ambos configurados | Backwards compatible, sin romper deployments existentes |
| Blob solo server-side upload | No hay presigned URL en Blob — toda escritura pasa por Next.js server |
| Tier 1 con Blob redirige a `uploadViaServer` | Reutiliza pipeline existente, mínimo código nuevo |
| `storage_provider` en cada `media` row | Saber en qué storage está cada archivo para delete correcto y API hints |
| `storageProvider` expuesto en API | Consumer puede aplicar Vercel Image Optimization solo en URLs Blob |
| `mimeType` suficiente para formato | Ya existe — no duplicar info con campo `format` |
| `storage_provider` guardado en DB (settings) | Configurable en runtime sin redeploy |
| `blob_token` editable en UI | Mismo patrón que VPS key — consistencia |
| Acordeón por proveedor | Reduce cognitive load — solo expandes lo que configuras |
| Selector proveedor activo oculto si solo uno | No confundir cuando solo hay un proveedor |
| Media existente → default `'r2'` en migración | Todos los registros actuales están en R2 — correcto |

---

## Out of scope (para esta feature)

- Migración de medios existentes entre proveedores
- Upload directo desde browser a Vercel Blob (client-side `upload()`)
- Múltiples buckets R2 o múltiples stores Blob
- Vercel Blob para videos (por ahora solo imágenes)
- Transform params de Vercel Image Optimization (eso lo maneja el consumer)

---

## Checklist de Auditoría (pre-merge obligatorio)

Verificar cada punto antes de considerar la feature completa.

---

### A. Tailwind — sin tokens hardcodeados ni clases inexistentes

- [x] **Cero colores hex inline** — ningún `#xxxxxx` en className ni style. Solo tokens del sistema
- [x] **Solo tokens semánticos existentes:**
  ```
  bg-bg · bg-surface · bg-surface-2 · bg-border
  text-text · text-muted · text-primary · text-accent
  text-danger · text-success · text-warning
  border-border · border-primary · border-danger · border-success · border-warning
  bg-primary · bg-danger · bg-success · bg-warning · bg-accent
  ```
- [x] **Opacidades válidas** — solo con `/` modifier: `bg-primary/15`, `text-warning/80`, `border-success/30`
- [x] **Fuentes** — solo `font-mono` o `font-sans`. Nunca `font-['Inter']` hardcodeado
- [x] **Radios** — `rounded-sm` (4px) · `rounded-md` (8px) · `rounded-lg` (12px) · `rounded-xl` (16px) · `rounded-full`
- [x] **Transiciones** — no se usó `ease-[cubic-bezier(...)]` custom — solo `transition-all`, `transition-colors`, `transition-transform`
- [x] **Duraciones de animación** — no se requirió `var(--dur-*)` en StorageSection; `duration-200` Tailwind estándar
- [x] **Animaciones predefinidas** — no aplica en StorageSection (no hay entrada animada propia)
- [ ] Ejecutar `pnpm build` sin warnings de Tailwind en consola _(pendiente — verificar antes de deploy)_

---

### B. Acordeón — patrón correcto del proyecto

El proyecto usa `grid-rows` animation, **no** `max-height`. Verificar:

- [x] El acordeón de StorageSection usa exactamente este patrón: ✓
  ```tsx
  // Wrapper externo — transición de altura
  className={`grid ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
  style={{ transition: 'grid-template-rows 280ms cubic-bezier(0.4, 0, 0.2, 1)' }}

  // Wrapper interno — clip + opacidad
  className={`min-h-0 overflow-hidden transition-opacity duration-200 ${
    open ? 'opacity-100 delay-75' : 'opacity-0'
  }`}
  ```
- [x] Ícono chevron rota con `transition-transform duration-300` + `rotate-180` cuando `open` ✓
- [x] Header del acordeón cambia: `bg-primary/10 text-primary` (open) ↔ `hover:bg-surface-2` (closed) ✓
- [x] **No usar** `max-height` con valores arbitrarios — usa `grid-rows-[1fr]/[0fr]` ✓

---

### C. VHSTransition — aplicada donde corresponde

- [x] `StorageSection` refactorizada **no** necesita VHSTransition propia — ya la aplica `SettingsPanel`
- [x] Si se agrega algún modal de confirmación nuevo → `<VHSTransition duration="fast">` — no se agregaron modales nuevos
- [x] Si se agrega algún panel/sección de contenido significativo → `<VHSTransition duration="normal">` — no aplica
- [x] **No aplicar** VHSTransition a micro-interacciones — ninguna aplicada en badges/botones/tooltips
- [x] Props válidas: `duration="fast"|"normal"|"full"` · `trigger={value}` · `className="..."` — no se usa VHS aquí directamente

---

### D. Arquitectura MVC

- [x] `StorageSection.tsx` en `components/ui/organisms/settings/` — correcto
- [x] `blob-client.ts` en `lib/media/` — correcto
- [x] `storage-router.ts` en `lib/media/` — correcto
- [x] **Cero** fetch/async en componentes UI — toda lógica vía Server Actions en `useTransition`
- [x] Nuevos tipos (`StorageProvider`, campos nuevos de `StorageSettings`, `MediaRecord`) en `types/` — nunca inline
- [x] Server Actions nuevas (`testBlobConnection`, `uploadBlobDirect`, `updateStorageProvider`, `getStorageStatus`) con `'use server'` al tope del archivo
- [x] `StorageSection.tsx` mantiene `'use client'` — correcto (usa `useState`, `useTransition`)

---

### E. cva() — variantes de componentes

- [x] Badges de estado → `Badge` atom con variantes `primary` (activo) / `success` (configurado) / `muted` (sin configurar) ✓
- [x] Selector de proveedor → `cva()` con variante `active: true | false` (`providerBtn`) ✓
- [x] Ninguna prop booleana suelta para estilos — `AccordionProps.badgeVariant` es tipo discriminado; `providerBtn({ active })` usa `cva()` ✓

---

### F. Patrones de Settings existentes — consistencia visual

Verificar que los nuevos campos de Blob en `StorageSection` usan exactamente las mismas clases que los campos R2 existentes:

```
// Input fields
'w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors'

// Primary button (Guardar)
'rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed'

// Secondary button (Test / Mostrar)
'rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-text hover:border-border/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

// Título de sección
'font-mono text-xs text-muted uppercase tracking-widest'

// Nota/aviso
'font-mono text-[11px] text-muted/60'
```

- [x] Input class idéntico al existente ✓
- [x] Primary button idéntico ✓
- [x] Secondary button idéntico (`ghostBtnCls`) ✓
- [x] Espaciado entre grupos de campos: `space-y-5` (outer) / `space-y-4` (dentro del acordeón)
- [x] Espaciado entre label e input: `space-y-1.5` en `Field` helper ✓
- [x] Label: `block font-mono text-xs text-text-muted` en `Field` helper ✓

---

### G. API y DB — integridad

- [x] Migración Drizzle crea columna `storage_provider VARCHAR(10) NOT NULL DEFAULT 'r2'` — `0010_brainy_shinko_yamashiro.sql` ✓
- [x] `pnpm db:migrate` ejecutado exitosamente ✓
- [x] `toMediaRecord()` en `media.repository.ts` mapea `storageProvider` correctamente ✓
- [x] `expandRelations` en `lib/api/utils.ts` resuelve `fieldType === 'image' | 'video'` sin romper campos `relation` existentes ✓ _(nota: el plan decía `'media'` pero el tipo real del proyecto es `'image'`/`'video'` — implementado correctamente)_
- [x] Campos `relation` siguen funcionando igual — path `relation` sin cambios en `expandRelations` ✓
- [x] `storageProvider` se incluye en la respuesta del API público — `MediaRecord` retornado por `expandRelations` lo incluye ✓

---

### H. Boot check

- [x] `lib/boot/validate.ts` imprime `ok(...)` cuando `BLOB_READ_WRITE_TOKEN` está configurado ✓
- [x] Usa `info(...)` (no `warn`) cuando no está configurado ✓
- [x] El mensaje de `info` tiene código `CARTUM_I001` ✓
- [x] `info()` existe en `lib/boot/logger.ts` con color distinto de `warn` ✓

---

### I. TypeScript strict — cero errores

- [x] `pnpm tsc --noEmit` — 0 errores ✓
- [x] `StorageProvider` type exportado desde `types/settings.ts` — no redefinido en otros archivos ✓
- [x] `storageProvider` en `MediaRecord` tipado como `'r2' | 'blob'` — no `string` ✓
- [x] Server actions nuevas tienen tipos de retorno explícitos: `Promise<ActionResult<T>>` ✓
- [x] `blob-client.ts` no usa `any` — tipado con `ArrayBuffer | Blob | Buffer` ✓

---

### J. UX — verificación manual en navegador

- [x] Con solo R2 configurado: selector de proveedor **no visible** — `bothConfigured = r2Configured && blobConfigured` ✓
- [x] Con solo Blob configurado: selector de proveedor **no visible** — misma condición ✓
- [x] Con ambos configurados: selector aparece, cambio guarda inmediatamente vía `updateStorageProvider` ✓
- [x] Acordeón R2 abierto por defecto si R2 es el proveedor activo — `setR2Open(provider === 'r2')` ✓
- [x] Acordeón Blob abierto por defecto si Blob es el proveedor activo — `setBlobOpen(provider === 'blob')` ✓
- [x] Badge de estado actualiza en tiempo real al guardar el token — `getStorageStatus()` recargado post-save ✓
- [ ] Con proveedor Blob activo: upload de imagen funciona end-to-end — _pendiente test manual_
- [ ] Con proveedor R2 activo: comportamiento idéntico al actual (no regresión) — _pendiente test manual_
- [ ] `storageProvider` correcto en respuesta del API tras upload con cada proveedor — _pendiente test manual_
