# Feature: Video Name Preservation & Preview en Media Picker

**Fecha:** 14/04/2026  
**Estado:** 🔲 Pendiente  
**Prioridad:** Media  
**Área:** Backend (DB + schema + actions) + Frontend (MediaLibraryPicker + nuevo modal)

---

## Contexto y Problema

### Problema 1 — Título del video es el UUID de R2

Actualmente, al guardar cualquier asset de media, la tabla `media` no tiene columna `name`.  
El nombre visible se deriva en runtime como `key.split('/').pop()`.  
El `key` tiene el formato `uploads/<UUID>.ext`, por lo que el nombre que ve el usuario en la galería es `<UUID>.mp4` en vez del nombre original del archivo.

Para imágenes esto es molesto. Para videos es especialmente dañino porque los videos suelen nombrarse con contexto (`hero-landing-final.mp4`, `tutorial-step-2.mp4`) y ese contexto se pierde completamente.

### Problema 2 — Sin forma de previsualizar un video seleccionado en el picker

Cuando el usuario abre `MediaLibraryPicker` con `filter="video"` (desde `VideoUploadField` en la edición de un nodo), las cards de video muestran solo un ícono de video + nombre truncado.

Al seleccionar una card, aparece el check de confirmación, pero **no hay forma de previsualizarlo antes de confirmar**. El usuario tiene que confirmar a ciegas o cancelar y abrir otra pantalla.

---

## Solución

### S1 — Columna `name` en tabla `media`

Agregar columna `name TEXT` (nullable para retrocompatibilidad) a la tabla `media`.  
El nombre se captura en cada punto de guardado usando el filename original del `File` o del `filename` param que ya circula por la pipeline.  
Donde `name` sea null (registros viejos), el fallback sigue siendo `key.split('/').pop()`.

### S2 — Ícono de ojo en cards de video seleccionadas (picker single-mode)

En `MediaLibraryPicker`, cuando:
- `filter === 'video'`
- El asset está seleccionado (`selectedId === asset.id`)
- No es modo multi-select (`!multiMode`)

Mostrar en el centro de la card un botón con ícono `Eye`.  
Al hacer clic, abrir `VideoQuickPreviewModal` — modal sin overlay de fondo, con `<VHSTransition>` en la entrada del contenido.

---

## Arquitectura Técnica

### Fase 1 — DB + Types + Repository

#### 1.1 Migración Drizzle

```sql
-- Nueva columna name, nullable, sin default
ALTER TABLE "media" ADD COLUMN "name" TEXT;
```

Archivo: `db/migrations/0009_media_name.sql` (nombre generado por Drizzle).

#### 1.2 Schema Drizzle (`db/schema/media.schema.ts`)

```ts
export const media = pgTable('media', {
  // ... columnas existentes ...
  name: text('name'),  // ← nueva, nullable
  // ...
})
```

#### 1.3 Type `MediaRecord` (`types/media.ts`)

```ts
export interface MediaRecord {
  // existentes...
  name: string | null  // ← nueva
}
```

#### 1.4 Type `SaveMediaInput` (`types/media.ts`)

```ts
export interface SaveMediaInput {
  // existentes...
  name?: string  // ← nueva, opcional para retrocompatibilidad
}
```

#### 1.5 Repository (`db/repositories/media.repository.ts`)

- `toMediaRecord()`: agregar `name: row.name ?? null`  
- `create()`: incluir `name: input.name ?? null` en el `.values({})`

---

### Fase 2 — Propagar `name` en todos los puntos de guardado

Hay 5 puntos de código que llaman `saveMediaRecord()` o `mediaRepository.create()`:

| # | Dónde | Nombre disponible |
|---|-------|------------------|
| A | `useMediaGallery.ts` — imagen (path R2 directo) | `entry.name` (nombre del `File`) |
| B | `useMediaGallery.ts` — video VPS path | `file.name` (ya está en scope) |
| C | `useMediaGallery.ts` — video fallback R2 | `file.name` |
| D | `VideoUploadField.tsx` — upload inline de campo | `file.name` y `optimized.name` |
| E | `app/api/internal/media/videos/complete/route.ts` | `filename` ya llega en el body del request |
| F | `lib/actions/media.actions.ts` → `uploadViaServer()` | `input.filename` o derivar del input |

> **Nota**: Los paths de imagen en `useMediaGallery.ts` usan `entry.file.name` que ya existe en `UploadEntry`.
> En el VPS complete route el `filename` ya viaja en el body JSON: `{ job_id, filename, mime_type, output_size }`.

#### Cambio en `SaveMediaInput` ya cubre esto

Al añadir `name?: string` a `SaveMediaInput`, cada caller solo necesita pasar `name: file.name` o `name: filename` según corresponda.

#### `uploadViaServer` en `media.actions.ts`

Esta action no recibe `filename` explícitamente hoy. Necesita recibir `filename?: string` en su `UploadViaServerInput` y propagarlo.

---

### Fase 3 — Consumir `name` en la UI (fallback seguro)

En todos los lugares que actualmente hacen:

```ts
const name = asset.key.split('/').pop() ?? asset.key
```

Reemplazar por:

```ts
const name = asset.name ?? asset.key.split('/').pop() ?? asset.key
```

Archivos afectados:
- `components/ui/organisms/MediaLibraryPicker.tsx` — `AssetCard` función interna
- `components/ui/molecules/MediaGalleryCard.tsx` — card de la galería principal
- `components/ui/organisms/MediaGalleryPage.tsx` — si tiene algún uso directo
- `components/ui/molecules/UploadFileRow.tsx` — no aplica (usa `entry.name` que ya es el filename)

---

### Fase 4 — Ícono de ojo + `VideoQuickPreviewModal`

#### 4.1 Nuevo componente `VideoQuickPreviewModal`

**Path:** `components/ui/organisms/VideoQuickPreviewModal.tsx`

```
Props:
  open:    boolean
  url:     string
  name:    string
  onClose: () => void
```

**Diseño:**
- No usa `createPortal` sobre overlay – el modal se posiciona como panel flotante anclado a la card, o como panel centrado sin backdrop oscuro (usa `pointer-events-none` en el overlay, solo el panel tiene `pointer-events-auto`)
- `<VHSTransition duration="fast">` envuelve el contenido del panel
- Contenido: `<video src={url} controls autoPlay className="rounded-md" />`
- Header con nombre del asset + botón `X` para cerrar
- Cierra también con `Escape`
- Dimensiones: `max-w-lg` en desktop, full-width en mobile

**Sin backdrop**: en vez de `bg-black/50` en el overlay, usar solo un `drop-shadow-2xl` en el panel. El usuario puede hacer clic fuera para cerrar (el overlay captura el clic pero es invisible).

#### 4.2 Ícono `Eye` en `AssetCard` del picker

Solo se muestra cuando ALL de estas condiciones son true:
- `asset.mimeType.startsWith('video/')`
- `selected === true`
- `!multiMode`

El botón está posicionado absolutamente en el centro de la card (`absolute inset-0 flex items-center justify-center`), sobre el check existente pero con z mayor.

Al hacer clic: `e.stopPropagation()` + llamar `onPreview(asset)`.

#### 4.3 Wiring en `MediaLibraryPicker`

Estado nuevo: `previewAsset: MediaRecord | null`  
- Cuando `AssetCard` llama `onPreview(asset)` → `setPreviewAsset(asset)`  
- `VideoQuickPreviewModal` se monta cuando `previewAsset !== null`  
- Al cerrar: `setPreviewAsset(null)`

---

## Archivos a Modificar / Crear

| Acción | Archivo |
|--------|---------|
| CREAR | `db/migrations/0009_media_name.sql` (via Drizzle generate) |
| EDITAR | `db/schema/media.schema.ts` |
| EDITAR | `types/media.ts` — `MediaRecord`, `SaveMediaInput` |
| EDITAR | `db/repositories/media.repository.ts` |
| EDITAR | `lib/actions/media.actions.ts` — `saveMediaRecord`, `uploadViaServer`, `UploadViaServerInput` |
| EDITAR | `app/api/internal/media/videos/complete/route.ts` — pasar `name: filename` |
| EDITAR | `lib/hooks/useMediaGallery.ts` — pasar `name` en las 3 ramas de guardado |
| EDITAR | `components/ui/molecules/VideoUploadField.tsx` — pasar `name` en `saveMediaRecord` |
| EDITAR | `components/ui/molecules/ImageUploadField.tsx` — pasar `name` en `saveMediaRecord` |
| EDITAR | `components/ui/organisms/MediaLibraryPicker.tsx` — fallback name, eye icon, onPreview, previewAsset state |
| EDITAR | `components/ui/molecules/MediaGalleryCard.tsx` — fallback name |
| CREAR | `components/ui/organisms/VideoQuickPreviewModal.tsx` |

---

## Criterios de Aceptación — Auditoría

### AC-01 — Migración aplicada
- [ ] Existe una migración Drizzle que agrega `name TEXT` nullable a la tabla `media`
- [ ] La migración se puede aplicar en una BD con registros existentes (sin errors por NOT NULL)
- [ ] Los registros pre-migración tienen `name = null` y en la UI muestran el fallback `key.split('/').pop()`

### AC-02 — Schema y types actualizados
- [ ] `media.schema.ts` incluye el campo `name: text('name')`
- [ ] `MediaRecord` tiene `name: string | null`
- [ ] `SaveMediaInput` tiene `name?: string`
- [ ] No hay errores de TypeScript en ningún archivo (`tsc --noEmit` limpio)

### AC-03 — Repository persiste el nombre
- [ ] `mediaRepository.create()` inserta el valor de `input.name ?? null`
- [ ] `toMediaRecord()` mapea `row.name ?? null` al campo `name`

### AC-04 — Nombre preservado en todos los puntos de guardado

#### Sub-criterio: Galería — imagen
- [ ] Al subir una imagen via drag/drop o botón en la galería, el registro en DB tiene `name = nombre_original_del_archivo.ext`

#### Sub-criterio: Galería — video VPS
- [ ] Al subir un video que pasa por la pipeline VPS, el registro en DB (guardado en `/complete`) tiene `name = filename` enviado en el body

#### Sub-criterio: Galería — video fallback R2 directo
- [ ] Al subir un video que hace fallback a R2 directo (VPS no configurado), el registro tiene `name = nombre_original_del_archivo.ext`

#### Sub-criterio: Campo inline — VideoUploadField
- [ ] Al subir un video desde la edición de un nodo (VideoUploadField), el registro tiene `name = nombre_original_del_archivo.ext`

#### Sub-criterio: Campo inline — ImageUploadField
- [ ] Al subir una imagen desde la edición de un nodo (ImageUploadField), el registro tiene `name = nombre_original_del_archivo.ext`

### AC-05 — UI muestra el nombre correcto (no UUID)
- [ ] En `MediaLibraryPicker`, las cards de assets nuevos (post-migración) muestran el nombre original, no el UUID
- [ ] Las cards de assets viejos (pre-migración, `name = null`) muestran el fallback derivado del `key` — sin error ni crash
- [ ] En `MediaGalleryCard` (galería principal), igual que arriba
- [ ] En ninguna card de video se ve un UUID como nombre

### AC-06 — Ícono de ojo en `MediaLibraryPicker`
- [ ] En modo single-select (`filter="video"`), al seleccionar una card de video, aparece un ícono de ojo centrado sobre la card
- [ ] El ícono NO aparece en cards de imágenes
- [ ] El ícono NO aparece en modo multi-select
- [ ] El ícono NO aparece en cards no seleccionadas

### AC-07 — `VideoQuickPreviewModal` funciona correctamente
- [ ] Al hacer clic en el ícono de ojo, se abre `VideoQuickPreviewModal` con el video correcto
- [ ] El modal aparece con efecto `<VHSTransition duration="fast">`
- [ ] El modal NO tiene overlay oscuro con fondo bloqueante — el fondo permanece visible
- [ ] El video se reproduce con controles (`controls autoPlay`)
- [ ] El nombre del asset se muestra en el header del modal
- [ ] Presionar `Escape` cierra el modal
- [ ] Hacer clic fuera del panel (en el overlay invisible) cierra el modal
- [ ] Al cerrar el modal, la selección del asset en el picker se mantiene (no se deselecciona)
- [ ] El modal es responsive: ocupa `max-w-lg` en desktop, full-width en mobile

### AC-08 — Interacción ojo vs. selección
- [ ] Hacer clic en el ícono de ojo NO deselecciona el asset (usa `e.stopPropagation()`)
- [ ] El botón "Seleccionar" del picker sigue funcionando para confirmar tras previsualizar

### AC-09 — Sin regresiones
- [ ] El flujo de subida de imágenes en la galería sigue funcionando
- [ ] El flujo VPS para videos sigue funcionando (incluyendo cancelación implementada hoy)
- [ ] `MediaLibraryPicker` en `filter="image"` no muestra cambios visuales (sin ojo)
- [ ] `MediaLibraryPicker` en modo multi-select para imágenes/galería no muestra cambios
- [ ] `ImageUploadField` y `FieldMediaContent` no tienen regresiones
- [ ] `FieldGalleryContent` no tiene regresiones

### AC-10 — Calidad de código
- [ ] `VideoQuickPreviewModal` está en `/components/ui/organisms/` como indica la arquitectura
- [ ] Sin tipos inline en componentes — todos en `/types/media.ts`
- [ ] Sin valores de color hardcodeados — usar clases Tailwind del tema
- [ ] Sin errores de lint ni advertencias de TypeScript

---

## Notas de Implementación

### Drizzle migrate

Después de editar `media.schema.ts`, ejecutar:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Verificar que la migración generada usa `ALTER TABLE ... ADD COLUMN "name" TEXT` (sin `NOT NULL DEFAULT`).

### `complete/route.ts` — VPS path

El body que recibe ya incluye `filename`. Solo hay que pasarlo como `name: filename` al `mediaRepository.create()` o al `saveMediaRecord()` si se refactoriza para usar la action.

### Retrocompatibilidad name fallback

El patrón `asset.name ?? asset.key.split('/').pop() ?? asset.key` debe aplicarse en **todos** los puntos donde se muestra el nombre — no solo en algunos. AC-05 valida esto.

### Sin overlay oscuro en VideoQuickPreviewModal

El div wrapper del portal usa `pointer-events-auto` pero sin `bg-black/xx`. El panel interior tiene `shadow-2xl shadow-black/60` para dar profundidad sin bloquear visualmente el contexto. Esto es consistente con el estilo "node-board" de la app donde el usuario puede ver el contexto mientras edita.
