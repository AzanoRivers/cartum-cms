# Media Gallery & Field Content UX — Rediseño completo del flujo de medios

**Fecha:** 09/04/2026  
**Estado:** Planificación  
**Prioridad:** Alta  
**Área:** Frontend UX + Backend (routes + actions) + Limpieza de código

---

## Contexto y Problema

El sistema de gestión de imágenes y videos actual tiene una UX no apta para el usuario final:

1. **Flujo actual de medios**: Para subir una imagen/video a un campo hay que navegar a `/cms/content/[nodeId]/new`, lo que implica entender el concepto de "nodo contenedor" y "registro". Es una abstracción excesiva para simplemente subir un archivo.
2. **Página `/cms/content`**: Actualmente muestra una grilla de cards representando los nodos contenedores. El usuario necesita saber en qué "caja" está su imagen.
3. **FieldEditPanel para imagen/video**: Actualmente muestra solo un enlace de redirección a `content/[parentId]/new`. No hay acceso inline al archivo ni picker visual.
4. **No existe una galería global de medios**: Para ver todas las imágenes y videos cargados en el CMS no hay una vista dedicada y directa.

---

## Solución Propuesta

Cuatro cambios coordinados que juntos reemplazan el flujo antiguo por una experiencia directa, visual y minimalista:

1. **`/cms/content` → Media Gallery global** — tabs Imágenes/Videos, grid paginada, botón Subir con drag&drop.
2. **DockBar** → nuevo ícono `Contenido` entre `+` y `?`.
3. **FieldEditPanel** → acordeón de 2 secciones: "Tipo de campo" (colapsado) + "Contenido" (abierto por defecto), con picker inline para imagen/video.
4. **Limpieza** → eliminar rutas y componentes del flujo antiguo que quedan huérfanos.

---

## Arquitectura de Diseño

Principios que aplican a todas las piezas:

- **Dark-first**, paleta del sistema (sin valores hardcodeados)
- `<VHSTransition>` en toda pantalla nueva o panel que monte
- **Desktop**: grid de 12 cols, sidebar + contenido principal
- **Mobile**: 100% ancho, navegación inferior (DockBar), sin sidebars
- `cva()` para variantes de componentes
- Tipos nombrados en `/types/`, nunca inline
- Lógica en hooks `/lib/hooks/`, componentes solo reciben props

---

## Fase 1 — Media Gallery (nueva `/cms/content`)

### 1.1 Vista desktop

```
┌──────────────────────────────────────────────────────────────┐
│  BIBLIOTECA DE MEDIOS                                        │
│                                                              │
│  [  Imágenes  ]  [  Videos  ]              [ ↑ Subir ]      │
│  ─────────────────────────────────────────────────────────── │
│  Mostrando 1–10 de 47      [10 ▾]   [< Prev]  1 / 5  [Next >]│
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │      │ │      │ │      │ │      │ │      │              │
│  │ img  │ │ img  │ │ img  │ │ img  │ │ img  │              │
│  │      │ │      │ │      │ │      │ │      │              │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘              │
│  foto.jpg  banner   hero     avatar   thumb                 │
│  1.2 MB    340 KB   890 KB   55 KB    120 KB                │
│  Apr 8     Apr 7    Apr 6    Apr 5    Apr 4                 │
│                                                              │
│  (2 filas más de la grilla...)                               │
│  ─────────────────────────────────────────────────────────── │
│  Mostrando 1–10 de 47      [10 ▾]   [< Prev]  1 / 5  [Next >]│
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Vista mobile

- Tabs `Imágenes / Videos` como barra horizontal fija bajo el TopBar
- Grid de 3 columnas (`grid-cols-3`), thumbnails cuadrados (`aspect-square`)
- Nombre abreviado + peso debajo de cada thumb
- Paginación compacta debajo de la grilla: `< 1/5 >` con selector de página
- Botón "Subir" como `<DockIcon>` o botón flotante encima del DockBar

### 1.3 Lógica de datos

Reutilizar la Server Action existente `listMediaAssets()` (ya implementada en Part 14), extendiéndola con soporte de **paginación por offset** (en lugar de cursor) para soportar el selector de página:

```ts
// lib/actions/media.actions.ts — extend listMediaAssets
export interface ListMediaAssetsInput {
  filter:  'image' | 'video'
  page:    number          // 1-indexed
  perPage: number          // 10 | 20 | 40
  search?: string
}

export interface MediaAssetsPage {
  assets:     MediaRecord[]
  total:      number       // total rows (for calculating pages)
  page:       number
  totalPages: number
}
```

### 1.4 Estado "Subir" (reemplaza la grilla)

Cuando el usuario pulsa "Subir":
- El contenido principal de la página se reemplaza por un panel drag&drop (`MediaUploadZone`)
- Botón "← Volver a la galería" en la parte superior del panel
- Permite arrastrar o seleccionar 1..N archivos (imágenes y/o videos simultáneamente)
- Máximo por archivo: `MAX_IMAGE_SIZE_BYTES` (50 MB) para imágenes, `MAX_VIDEO_SIZE_BYTES` (500 MB) para videos
- Se dispara la pipeline completa de 2 tiers (existente en `lib/media/`)
- Progreso por archivo: barra individual con porcentaje + nombre + estado (`Comprimiendo... | Subiendo... | ✓ Listo | ✗ Error`)
- Al terminar todos: botón "Ver en galería" + auto-volver después de 2 s
- Manejo de errores:
  - Toast por cada archivo fallido (no bloquea los demás)
  - Estado visual `error` en la barra del archivo específico
  - Panel de resumen al final: "X de Y archivos subidos correctamente"

### 1.5 Componentes a crear

```
app/cms/content/page.tsx                          ← REEMPLAZAR por la nueva Media Gallery
components/ui/organisms/MediaGalleryPage.tsx      ← Organism (desktop + mobile unificado)
components/ui/molecules/MediaGalleryTabs.tsx      ← Tabs Imágenes/Videos
components/ui/molecules/MediaGalleryGrid.tsx      ← Grid paginada de thumbnails
components/ui/molecules/MediaGalleryPagination.tsx← Paginación (top+bottom) + selector perPage
components/ui/molecules/MediaGalleryCard.tsx      ← Card de un asset (imagen o video)
components/ui/organisms/MediaUploadZone.tsx       ← Zona drag&drop multi-archivo con progreso
components/ui/molecules/UploadFileRow.tsx         ← Barra de progreso individual por archivo
types/media.ts                                    ← Extender ListMediaAssetsInput + MediaAssetsPage
lib/actions/media.actions.ts                      ← Extender listMediaAssets con offset-pagination
```

---

## Fase 2 — Botón "Contenido" en DockBar

### 2.1 Posición

Entre el botón `+` (crear nodo) y el botón `?` (ayuda):

```
[ 🏠 ]  [ + ]  [ 📁 Contenido ]  [ ? ]  [ ⚙ ]
```

### 2.2 Comportamiento

- Ícono: `Images` o `FolderOpen` de Lucide (por confirmar preferencia visual)
- Tooltip: `d?.dock.content` (`'Biblioteca de medios'` en es, `'Media library'` en en)
- `onClick`: `router.push('/cms/content')`
- Solo visible si el usuario tiene permisos de lectura sobre medios (misma lógica de `canAccessBuilder` o nueva flag `canAccessMedia`)
- En mobile: idéntico comportamiento (DockBar es compartido)

### 2.3 Archivos a modificar

```
components/ui/organisms/DockBar.tsx    ← Añadir DockIcon de contenido
lib/stores/uiStore.ts                  ← Posiblemente añadir canAccessMedia flag
locales/en.ts                          ← dock.content: 'Media library'
locales/es.ts                          ← dock.content: 'Biblioteca de medios'
```

---

## Fase 3 — FieldEditPanel: Acordeón + Picker Inline

### 3.1 Nueva estructura del panel

Actualmente el `FieldEditPanel` muestra todos los controles en una lista plana. Se reorganiza en **2 secciones tipo acordeón**:

**Sección 1: "Edición de Tipo de Campo"** — colapsada por defecto al abrir
- Nombre del campo
- Toggle "Campo requerido"
- Selector de tipo (`FieldTypePicker`)
- Configuración específica del tipo (texto largo, rango numérico, booleano, relación)
- Botón "Guardar cambios de tipo"

**Sección 2: "Edición de Contenido"** — abierta por defecto al abrir
- Para `image`: muestra la imagen actual como tarjeta thumbnail prominente (o estado vacío interactivo si no tiene valor), con controles para cambiar o eliminar
- Para `video`: muestra preview del video actual o estado vacío equivalente
- Para otros tipos (`text`, `number`, `boolean`, `relation`): mensaje informativo: *"El contenido de este campo se edita en los registros del nodo."*

### 3.2 Sección de Contenido para imagen/video — Diseño visual

El valor que se guarda y muestra aquí es el **`defaultMediaUrl`** del campo (almacenado en `config.defaultUrl` dentro de `FieldNode`). Es la imagen/video por defecto que tiene ese campo antes de ser sobreescrito en un registro específico. Si el campo ya tiene un valor por defecto asignado, se muestra prominentemente.

---

#### Estado vacío (sin imagen asignada)

El placeholder es un área interactiva que invita a la acción. Responde al hover y al drag&drop:

```
┌──────────────────────────────────────────────┐
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │                                      │   │
│   │    ┌───┐                             │   │  ← bg-surface-2
│   │    │ ▦ │  Sin imagen por defecto     │   │     border-dashed border-border
│   │    └───┘                             │   │     hover: border-primary/60
│   │                                      │   │     hover: bg-surface-2/80
│   │   Arrastra aquí o elige una opción   │   │
│   │                                      │   │
│   └──────────────────────────────────────┘   │
│                                              │
│   ┌──────────────────┐  ┌─────────────────┐  │
│   │ 📁 De librería   │  │ ↑ Subir archivo │  │  ← botones secundarios
│   └──────────────────┘  └─────────────────┘  │     variant="outline" size="sm"
│                                              │
└──────────────────────────────────────────────┘
```

- El área dashed ocupa todo el ancho disponible con `aspect-[4/3]` (aprox. 4:3) para no ser demasiado larga
- El ícono central es `ImageIcon` de Lucide, color `text-muted`, tamaño 28px
- El texto secundario `text-[11px] font-mono text-muted` debajo del ícono
- En hover del área: `border-primary/60` + `bg-primary/5` + el ícono sube ligeramente (`translate-y-[-2px]` transition)
- En drag-over activo: `border-accent` + `bg-accent/5` + texto cambia a "Suelta aquí"

---

#### Estado con imagen — tarjeta "polaroid" / card prominente

La imagen se presenta como una tarjeta de preview dominante, tipo Polaroid (imagen grande + metadata debajo), no como una miniatura pequeña:

```
┌──────────────────────────────────────────────┐
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │                                      │   │  ← aspect-[4/3], object-cover
│   │                                      │   │     rounded-md border border-border
│   │           [IMAGEN COMPLETA]          │   │     bg-surface-2 (mientras carga)
│   │                                      │   │
│   │                                      │   │
│   └──────────────────────────────────────┘   │
│   foto-banner.webp                           │  ← text-xs font-mono text-text truncate
│   1.2 MB  ·  WebP  ·  Subida Apr 8          │  ← text-[10px] font-mono text-muted
│                                              │
│   ┌──────────────────┐  ┌─────────────────┐  │
│   │ ✎ Cambiar        │  │ ✕ Eliminar      │  │  ← "Cambiar": outline · "Eliminar": ghost/danger
│   └──────────────────┘  └─────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

Detalles de la tarjeta:
- La imagen usa `object-cover` para llenar el área sin deformarse, `aspect-[4/3]` consistente con el placeholder
- Al hacer hover sobre la imagen (cuando hay valor): aparece un overlay oscuro semitransparente `bg-black/40` con 2 iconos centrados: `ChangeIcon` + `TrashIcon`, ambos blancos, como acceso rápido alternativo a los botones
- La metadata de abajo (nombre, peso, formato, fecha) viene del `MediaRecord` asociado al `defaultMediaUrl`, recuperado con una query al montar la sección
- El botón "Cambiar" dispara el mismo flujo que el estado vacío (librería o upload)
- El botón "Eliminar" limpia `config.defaultUrl` a `null` y guarda (con confirm dialog inline, no modal separado: el botón cambia a "¿Confirmar?" en rojo por 3s antes de ejecutar)

---

#### Estado con imagen — overlay hover

```
┌──────────────────────────────────────────────┐
│   ┌──────────────────────────────────────┐   │
│   │  bg-black/40 (overlay en hover)      │   │
│   │                                      │   │
│   │        [ ✎ ]      [ ✕ ]             │   │  ← iconos blancos centrados
│   │                                      │   │     opacity-0 → opacity-100 en hover
│   └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

---

#### Estado de upload en progreso (inline)

Cuando se arrastra un archivo sobre el placeholder o se inicia upload, la tarjeta entra en modo progreso. Reemplaza el contenido visual del área sin desmontar el contenedor:

```
┌──────────────────────────────────────────────┐
│   ┌──────────────────────────────────────┐   │
│   │  bg-surface-2                        │   │
│   │                                      │   │
│   │  [   spinner   ]  Optimizando…       │   │  ← Tier 1 activo
│   │  ──────────────────────────          │   │  ← barra de progreso primary
│   │  foto.jpg  ·  64%                    │   │
│   │                                      │   │
│   └──────────────────────────────────────┘   │
│   (botones deshabilitados durante upload)    │
└──────────────────────────────────────────────┘
```

Fases del progreso comunicadas visualmente:
| Fase | Texto | Ícono |
|------|-------|-------|
| Tier 1 imagen | "Optimizando imagen…" | spinner |
| Tier 1 video | "Procesando video (puede tardar)…" | spinner |
| Subiendo a servidor | "Subiendo…  64%" | barra animada |
| Guardando | "Guardando…" | spinner |
| Éxito | `<VHSTransition>` → aparece thumbnail | — |
| Error | estado de error inline + botón Reintentar | ícono danger |

---

#### Estado de video

Equivalente al de imagen con estas diferencias:
- `aspect-video` (16:9) en lugar de `aspect-[4/3]`, ya que los videos generalmente son panorámicos
- Si hay thumbnail disponible: se muestra como imagen preview con overlay de play `▶` centrado
- Si no hay thumbnail: fondo `bg-surface-2` con ícono `Video` (Lucide) + nombre del archivo
- El overlay hover muestra los mismos `[ ✎ ]  [ ✕ ]`

---

### 3.3 Cómo se persiste el `defaultMediaUrl`

El sistema actual de `FieldNode` guarda configuración en la columna `config` (JSONB). Se extiende el esquema de configuración para imagen y video:

```ts
// types/nodes.ts — añadir
export interface ImageFieldConfig {
  defaultUrl?: string | null    // URL pública R2 del valor por defecto
  defaultMediaId?: string | null // FK opcional a media.id
}

export interface VideoFieldConfig {
  defaultUrl?: string | null
  defaultMediaId?: string | null
}
```

Cuando el usuario selecciona o sube una imagen en el acordeón de Contenido:
1. Se guarda en `config.defaultUrl` via `updateFieldMeta()` (acción ya existente, solo agregar manejo de `config` para estos tipos)
2. La `MediaRecord` del asset queda enlazada opcionalmente por `defaultMediaId` para poder mostrar metadata (nombre, tamaño, fecha)

Al abrir el panel:
- Se lee `field.config.defaultUrl` para saber si hay valor
- Si hay `defaultMediaId`, se hace una query `getMediaById(id)` para obtener nombre, tamaño y fecha
- Si solo hay `defaultUrl` pero no `defaultMediaId` (ej. datos legacy), se muestra la imagen pero sin metadata

---

### 3.4 Modal de selección desde librería

Al pulsar "De librería" → abre el `MediaLibraryPicker` existente (Part 14), filtrado por `'image'` o `'video'`.

**Desktop**: modal rectangular centrado, `max-w-4xl sm:max-h-[80vh]`, con `<VHSTransition duration="modal">`

**Mobile**: bottom sheet, `fixed inset-x-0 bottom-0 z-50 h-[92dvh] rounded-t-2xl`, con handle de arrastre visual arriba (`w-10 h-1 bg-border rounded-full mx-auto mt-2`), `<VHSTransition duration="fast">`

---

### 3.5 Drag & drop directo sobre el área de placeholder / tarjeta

Tanto el placeholder vacío como la tarjeta con imagen aceptan `dragover` + `drop`.

Al entrar un archivo arrastrado al área:
- El borde cambia a `border-accent` + `bg-accent/5` → señal visual de "zona activa"
- Texto del placeholder cambia a "Suelta para subir"
- Al soltar: valida tipo/tamaño → entra en modo progreso inline (ver 3.2 arriba)

Al completar la subida con éxito:
- El `defaultMediaUrl` se guarda automáticamente (sin necesidad de pulsar "Guardar")
- Se muestra la nueva imagen con `<VHSTransition duration="fast">` para la transición placeholder→thumbnail

---

### 3.6 Componentes a crear/modificar

```
components/ui/organisms/FieldEditPanel.tsx          ← MODIFICAR: añadir acordeón + estado defaultMediaUrl
components/ui/molecules/FieldAccordionSection.tsx   ← NUEVO: sección colapsable con animación CSS
components/ui/molecules/FieldMediaContent.tsx       ← NUEVO: tarjeta prominente + placeholder + progress
components/ui/molecules/FieldMediaProgress.tsx      ← NUEVO: estado de upload inline dentro de la tarjeta
types/nodes.ts                                      ← Añadir ImageFieldConfig + VideoFieldConfig
lib/actions/media.actions.ts                        ← Añadir getMediaById(id) action
lib/actions/nodes.actions.ts                        ← updateFieldMeta ya existente, verificar que persiste config.defaultUrl
locales/en.ts                                       ← fieldEdit.accordion.* + fieldEdit.mediaContent.*
locales/es.ts                                       ← ídem
```

---

### 3.7 Claves i18n a agregar

```ts
fieldEdit: {
  // ...claves existentes...
  accordion: {
    typeSection:        'Tipo de campo',
    contentSection:     'Contenido',
  },
  mediaContent: {
    noImage:            'Sin imagen por defecto',
    noVideo:            'Sin video por defecto',
    dragOrSelect:       'Arrastra aquí o elige una opción',
    dropHere:           'Suelta para subir',
    selectFromLib:      'De librería',
    uploadNew:          'Subir archivo',
    changeMedia:        'Cambiar',
    removeMedia:        'Eliminar',
    confirmRemove:      '¿Confirmar?',
    overlayChange:      'Cambiar',
    overlayRemove:      'Eliminar',
    optimizingImage:    'Optimizando imagen…',
    processingVideo:    'Procesando video (puede tardar)…',
    uploadingPercent:   'Subiendo… {percent}%',
    saving:             'Guardando…',
    retryUpload:        'Reintentar',
    metaSeparator:      '·',
    otherTypesMsg:      'El contenido de este campo se edita en los registros del nodo.',
  }
}
```

---

## Fase 4 — Limpieza de Rutas y Código Huérfano

### Principio arquitectónico confirmado

> **Todo se edita desde el tablero.** Los nodos, campos y sus valores se gestionan directamente en el board mediante paneles y modales que montan sobre el canvas. No existe ningún flujo que requiera navegar fuera del tablero para editar contenido de nodos. Las rutas `/cms/content/[nodeId]/*` eran la implementación anterior de ese flujo y quedan completamente huérfanas.

### 4.1 Rutas a eliminar

| Ruta | Estado | Motivo |
|------|--------|--------|
| `/cms/content` | ✅ Se mantiene | Reemplazada completamente por la Media Gallery |
| `/cms/content/[nodeId]` | 🗑 **Eliminar** | El flujo de registros vive en el tablero, no en rutas separadas |
| `/cms/content/[nodeId]/new` | 🗑 **Eliminar** | Reemplazado por el acordeón de Contenido en `FieldEditPanel` |
| `/cms/content/[nodeId]/[recordId]` | 🗑 **Eliminar** | La edición de registros ocurre en modales del tablero |

Archivos a borrar:
```
app/cms/content/[nodeId]/page.tsx
app/cms/content/[nodeId]/new/page.tsx
app/cms/content/[nodeId]/[recordId]/page.tsx
app/cms/content/[nodeId]/          ← directorio completo
```

Verificar antes de borrar que no quede ningún `router.push` o `<Link href>` apuntando a estas rutas en toda la codebase:
```bash
grep -r "cms/content/" app components lib --include="*.tsx" --include="*.ts"
```
Si aparece alguna referencia, eliminarla o redirigirla antes de borrar las páginas.

### 4.2 Guards RBAC que protegen rutas eliminadas

El feature `08_04_2026_rbac-roles-ux.md` planificaba guards server-side para:
- `app/cms/content/[nodeId]/page.tsx` → `requirePermission(nodeId, 'read')`
- `app/cms/content/[nodeId]/new/page.tsx` → `requirePermission(nodeId, 'create')`
- `app/cms/content/[nodeId]/[recordId]/page.tsx` → `requirePermission(nodeId, 'read')`

Dado que esas páginas se eliminan, **esos guards no se implementan**. Los checks de permisos para la edición de nodos en el tablero ya están cubiertos por las Server Actions existentes.

### 4.3 Código a eliminar en FieldEditPanel

En `renderTypeConfig()`, bloque `fieldType === 'image' || fieldType === 'video'`:
- Eliminar el `<button>` con `router.push('/cms/content/${parentId}/new')` — reemplazado por el acordeón de Contenido
- Eliminar los bloques de texto "Storage configured / not configured" de ese bloque — se moverán al acordeón como estado informativo compacto (un badge verde/amarillo en el header de la sección "Contenido")
- Eliminar el import de `useRouter` si deja de usarse en el componente
- Eliminar el import de `ArrowRight` de lucide

### 4.4 Verificación de imports huérfanos

```
FieldEditPanel.tsx        → useRouter, ArrowRight (verificar si quedan sin uso)
app/cms/content/[nodeId]/ → todos los imports internos (se eliminan con los archivos)
```

Cualquier componente que importe desde esas páginas eliminadas debe revisarse.

---

## Plan de Implementación por Fases

### Fase 1 — Media Gallery `/cms/content`

- [x] Extender `listMediaAssets()` con paginación por offset + total count
- [x] Crear `types/media.ts` actualización: `ListMediaAssetsInput` con `page`/`perPage`, `MediaAssetsPage` con `total`/`totalPages`
- [x] Crear `MediaGalleryCard.tsx` (atom-molecule): thumbnail cuadrado, nombre, peso, fecha
- [x] Crear `MediaGalleryGrid.tsx`: grid responsiva + estado vacío + estado loading (skeleton)
- [x] Crear `MediaGalleryPagination.tsx`: paginación top+bottom + selector perPage
- [x] Crear `MediaGalleryTabs.tsx`: tabs Imágenes/Videos con estado activo via `cva()`
- [x] Crear `UploadFileRow.tsx`: fila de progreso individual (nombre, barra, estado, peso)
- [x] Crear `MediaUploadZone.tsx`: zona D&D multi-archivo, conectada a pipeline de medios
- [x] Crear `MediaGalleryPage.tsx` organism: composición de tabs + grid + paginación + modo upload
- [x] Reemplazar `app/cms/content/page.tsx` por la nueva Media Gallery
- [x] Añadir claves i18n `mediaGallery.*` en `en.ts` y `es.ts`
- [x] Verificar `<VHSTransition>` en mount de la página y al cambiar de tab

### Fase 2 — DockBar: botón Contenido

- [x] Añadir `DockIcon` de "Contenido" en `DockBar.tsx` entre `+` y `?`
- [x] Añadir `dock.content` en `en.ts` y `es.ts`
- [x] Evaluar y añadir flag `canAccessMedia` al `uiStore` si es necesario para RBAC

### Fase 3 — FieldEditPanel: acordeón + picker inline

- [x] Crear `FieldAccordionSection.tsx` molecule: header clicable + contenido colapsable con animación
- [x] Crear `FieldMediaContent.tsx` molecule: placeholder / thumbnail + botones + D&D inline
- [x] Modificar `FieldEditPanel.tsx`:
  - Envolver controles actuales en Sección 1 (acordeón "Tipo de campo", colapsada)
  - Añadir Sección 2 (acordeón "Contenido", abierta)
  - Sección 2 muestra `FieldMediaContent` para image/video, mensaje informativo para otros tipos
- [x] Conectar "Seleccionar de librería" al `MediaLibraryPicker` existente (modo `'image'` o `'video'`)
- [x] Conectar drag&drop del placeholder a la pipeline de upload de media
- [x] Ajustar `MediaLibraryPicker` para mobile: `fixed inset-0 z-50 rounded-t-xl` cuando `isMobile`
- [x] Añadir claves i18n `fieldEdit.accordion.*` y `fieldEdit.mediaContent.*` en `en.ts` y `es.ts`

### Fase 4 — Limpieza

- [x] Ejecutar grep de referencias a `cms/content/` en toda la codebase (app, components, lib)
- [x] Eliminar cualquier `router.push` o `<Link>` que apunte a rutas `content/[nodeId]/*`
- [x] Eliminar `app/cms/content/[nodeId]/page.tsx`
- [x] Eliminar `app/cms/content/[nodeId]/new/page.tsx`
- [x] Eliminar `app/cms/content/[nodeId]/[recordId]/page.tsx`
- [x] Eliminar el directorio `app/cms/content/[nodeId]/` completo
- [x] Eliminar el `<button>` de "ir a contenido" en `FieldEditPanel` (bloque image/video)
- [x] Eliminar imports `ArrowRight` y `useRouter` de `FieldEditPanel.tsx` si quedan sin uso
- [ ] Marcar en `08_04_2026_rbac-roles-ux.md` los guards de `content/[nodeId]` como **cancelados** (rutas eliminadas)

---

## Gestión de Estado

### Estado de la Media Gallery (client)

```ts
// lib/hooks/useMediaGallery.ts
export function useMediaGallery() {
  // filter: 'image' | 'video'
  // page, perPage
  // assets[], total, totalPages
  // isLoading
  // mode: 'gallery' | 'upload'
  // fetchPage(filter, page, perPage) → Server Action
}
```

### Estado del FieldEditPanel (client)

El panel ya usa estado local con `useState`. Se añade:

```ts
// Estado nuevo en FieldEditPanel
const [openSection, setOpenSection] = useState<'type' | 'content'>('content')
// Solo 'content' abierto por defecto

// Para campos image/video:
const [defaultMediaUrl,  setDefaultMediaUrl]  = useState<string | null>(null)
const [defaultMediaMeta, setDefaultMediaMeta] = useState<MediaMeta | null>(null)
// MediaMeta = { id: string; name: string; sizeBytes: number; mimeType: string; createdAt: Date }

const [uploadPhase, setUploadPhase] = useState<
  'idle' | 'tier1' | 'uploading' | 'saving' | 'error'
>('idle')
const [uploadProgress, setUploadProgress] = useState(0)
const [isDragOver,     setIsDragOver]     = useState(false)
const [confirmRemove,  setConfirmRemove]  = useState(false)
```

Pre-llenado al abrir el panel (dentro del `useEffect` existente):
```ts
if (field.fieldType === 'image' || field.fieldType === 'video') {
  const cfg = field.config as ImageFieldConfig | VideoFieldConfig
  setDefaultMediaUrl(cfg?.defaultUrl ?? null)
  if (cfg?.defaultMediaId) {
    getMediaById(cfg.defaultMediaId).then((res) => {
      if (res.success) setDefaultMediaMeta(res.data)
    })
  }
}
```

Al guardar el valor por defecto (inline, sin botón explícito):
```ts
// Se llama updateFieldMeta con el config actualizado
// inmediatamente después de que la upload pipeline retorna publicUrl
await updateFieldMeta({
  nodeId: field.id,
  // ...resto de props sin cambio...
  config: { ...currentConfig, defaultUrl: publicUrl, defaultMediaId: savedMediaId }
})
```

---

## Diseño Visual de Componentes Nuevos

### MediaGalleryCard

```
┌─────────────────────┐
│                     │ ← aspect-square, object-cover
│   [thumbnail/img]   │    border border-border rounded-md
│                     │    hover: ring-2 ring-primary/60
└─────────────────────┘
  foto.jpg             ← text-[11px] font-mono text-text truncate
  1.2 MB · Apr 8       ← text-[10px] font-mono text-muted
```

Videos sin thumbnail → icono de video centrado sobre `bg-surface-2`.

### UploadFileRow

```
foto.jpg           ████████░░  78%    1.2 MB     [Comprimiendo...]
banner.png         ██████████  100%   340 KB     ✓ Listo
video.mp4          ██░░░░░░░░  18%    90 MB      [Optimizando video...]
error.gif          ░░░░░░░░░░  —      —          ✗ Tipo no permitido
```

- Barra de progreso: `bg-primary` sobre `bg-surface-2`, `rounded-full`
- Estado "Optimizando video" tiene ícono de spinner `animate-spin`
- Error en `text-danger`, fondo `bg-danger/10 border-danger/30`

### FieldAccordionSection

```
┌──────────────────────────────────────────┐
│  Tipo de campo               [▼ / ▲]    │  ← header clicable
│  ──────────────────────────────────────  │
│  (contenido colapsable)                  │
└──────────────────────────────────────────┘
```

Animación: `max-height` transition (CSS), no JS timers.

---

## Notas Técnicas

- **Paginación**: La Server Action `listMediaAssets` usa keyset (cursor) hoy. Para la galería con selector de página se necesita offset-based. Implementar nueva variante `listMediaAssetsPaged` que no rompa el `MediaLibraryPicker` (que sigue usando cursor).
- **Multi-upload**: La `MediaUploadZone` procesa archivos en **serie** (no paralelo) para no saturar el cliente con múltiples instancias de `ffmpeg.wasm`. Cola FIFO con estado por archivo.
- **FieldMediaContent y el valor actual**: El `FieldNode` no almacena un "valor por defecto" de imagen — el valor está en los registros. El panel de contenido del acordeón, para imagen/video, sirve para asignar un **valor default del campo** (si se decide implementar esa funcionalidad) o simplemente como punto de acceso rápido a la librería. Aclarar con el usuario cuál es la semántica exacta antes de la Fase 3.
- **No usar transacciones con Neon HTTP** — todas las operaciones DB en secuencia.
- **VHSTransition**: Aplicar al mount de `MediaGalleryPage`, al cambio de tab, al enter de `MediaUploadZone` y al open de `FieldAccordionSection` (duración `'section'` 300–400ms).
- **COOP/COEP headers** ya están configurados en `next.config.ts` para `ffmpeg.wasm` — verificar que apliquen a la ruta `/cms/content`.

---

## Archivos Afectados / A Crear

```
── NUEVOS ─────────────────────────────────────────────────────────
app/cms/content/page.tsx                                [REEMPLAZAR]
components/ui/organisms/MediaGalleryPage.tsx            [NUEVO]
components/ui/organisms/MediaUploadZone.tsx             [NUEVO]
components/ui/molecules/MediaGalleryTabs.tsx            [NUEVO]
components/ui/molecules/MediaGalleryGrid.tsx            [NUEVO]
components/ui/molecules/MediaGalleryPagination.tsx      [NUEVO]
components/ui/molecules/MediaGalleryCard.tsx            [NUEVO]
components/ui/molecules/UploadFileRow.tsx               [NUEVO]
components/ui/molecules/FieldAccordionSection.tsx       [NUEVO]
components/ui/molecules/FieldMediaContent.tsx           [NUEVO — tarjeta prominente + placeholder + D&D]
components/ui/molecules/FieldMediaProgress.tsx          [NUEVO — progreso inline dentro de la tarjeta]
lib/hooks/useMediaGallery.ts                            [NUEVO]

── MODIFICAR ──────────────────────────────────────────────────────
components/ui/organisms/DockBar.tsx                     [+ botón Contenido]
components/ui/organisms/FieldEditPanel.tsx              [acordeón + estado defaultMediaUrl + limpieza]
components/ui/organisms/MediaLibraryPicker.tsx          [ajuste mobile: casi fullscreen]
lib/actions/media.actions.ts                            [+ listMediaAssetsPaged()]
types/media.ts                                          [extender interfaces de paginación]
types/nodes.ts                                          [+ ImageFieldConfig + VideoFieldConfig con defaultUrl/defaultMediaId]
lib/actions/media.actions.ts                            [+ listMediaAssetsPaged() + getMediaById()]
locales/en.ts                                           [+ dock.content + mediaGallery.* + fieldEdit.accordion.* + fieldEdit.mediaContent.*]
locales/es.ts                                           [ídem]

── ELIMINAR (post-auditoría) ──────────────────────────────────────
app/cms/content/[nodeId]/new/page.tsx                   [CANDIDATO — verificar primero]
(El resto de content/[nodeId] a confirmar según uso activo)
```

---

## Criterios de Aceptación

### CA-1 — Media Gallery: página principal
- [x] `/cms/content` muestra una galería de medios (no una lista de nodos)
- [x] Tab "Imágenes" muestra solo archivos de tipo `image/*`
- [x] Tab "Videos" muestra solo archivos de tipo `video/*`
- [x] Cada card muestra thumbnail, nombre, peso y fecha de subida
- [x] Los videos sin thumbnail muestran un ícono de video genérico
- [x] La página monta con `<VHSTransition duration="full">`
- [x] Cambiar de tab aplica `<VHSTransition duration="section">`

### CA-2 — Paginación
- [x] La paginación aparece tanto encima como debajo de la grilla
- [x] El selector de registros por página tiene opciones 10, 20, 40 (default 10)
- [x] Los botones Anterior/Siguiente navegan correctamente
- [x] Al cambiar el perPage, se vuelve a la página 1
- [x] Si hay 0 resultados, se muestra un estado vacío con mensaje descriptivo

### CA-3 — Upload desde la gallery
- [x] El botón "Subir" reemplaza la grilla por la zona `MediaUploadZone`
- [x] `MediaUploadZone` acepta drag&drop y click-to-browse
- [x] Acepta múltiples archivos simultáneamente (imágenes y/o videos en la misma operación)
- [x] Cada archivo tiene su propia barra de progreso con nombre y estado
- [x] Se respetan los límites: `MAX_IMAGE_SIZE_BYTES` para imágenes, `MAX_VIDEO_SIZE_BYTES` para videos
- [x] Archivos de tipo no permitido muestran error inmediato sin bloquear los demás
- [x] La pipeline completa (Tier 1 + Tier 2 si configurado) se ejecuta para imágenes
- [x] Videos solo usan Tier 1 (ffmpeg.wasm), sin intentar Tier 2
- [x] Al completar todos los archivos: banner de resumen ("X de Y archivos subidos")
- [x] Botón "Ver en galería" disponible tras la subida
- [x] Todos los errores visibles: inline en la fila del archivo + toast de error
- [x] Los mensajes de progreso/error siguen el toast map del Part 14

### CA-4 — DockBar: botón Contenido
- [x] Aparece un nuevo ícono entre `+` y `?` en la DockBar
- [x] Tooltip muestra `'Biblioteca de medios'` en español, `'Media library'` en inglés
- [x] Click navega a `/cms/content`
- [x] Visible en desktop y mobile con el mismo comportamiento

### CA-5 — FieldEditPanel: acordeón
- [x] Al abrir el panel de un campo, la sección "Tipo de campo" está **colapsada**
- [x] Al abrir el panel de un campo, la sección "Contenido" está **expandida**
- [x] Hacer click en el header de cualquier sección la expande o colapsa
- [x] La animación de colapso/expansión es suave (CSS `max-height` transition, sin JS timers)
- [x] Solo una sección puede estar expandida a la vez (acordeón exclusivo)
- [x] La sección "Tipo de campo" contiene todos los controles existentes (nombre, required, tipo, config específica, guardar)
- [x] La sección "Contenido" para tipos `text`, `number`, `boolean`, `relation` muestra mensaje informativo
- [x] La funcionalidad de guardar cambios de tipo se mantiene intacta

### CA-6 — FieldMediaContent: imagen
- [x] Cuando el campo tipo `image` ya tiene `config.defaultUrl`, la sección Contenido muestra la imagen como tarjeta prominente (aspect-[4/3], object-cover, bordes redondeados)
- [ ] La tarjeta con imagen muestra debajo: nombre del archivo, peso, formato y fecha de subida
- [x] Hover sobre la imagen muestra overlay oscuro con ícono "Cambiar" e ícono "Eliminar" centrados
- [x] Cuando no hay imagen, muestra placeholder dashed con ícono de imagen y texto invitacional
- [x] El placeholder responde al hover: borde `border-primary/60` + fondo `bg-primary/5` + ícono sube 2px
- [x] El placeholder responde al drag-over: borde `border-accent` + fondo `bg-accent/5` + texto "Suelta para subir"
- [x] Botón "De librería" abre `MediaLibraryPicker` filtrado por `'image'`
- [x] Botón "Subir archivo" dispara el file picker o se puede arrastrar el archivo directamente
- [x] Al soltar un archivo en D&D, inicia la pipeline de upload sin pasos extra
- [x] Durante el upload, el área muestra el estado de progreso inline: fase (Tier1/subiendo/guardando) + barra + porcentaje
- [x] Al completar el upload, el valor se persiste en `config.defaultUrl` **automáticamente** (sin pulsar guardar)
- [x] La transición de placeholder→thumbnail usa `<VHSTransition duration="fast">`
- [x] El botón "Eliminar" muestra texto "¿Confirmar?" (en rojo) durante 3s antes de ejecutar; si no se confirma, vuelve al estado normal
- [x] Eliminar limpia `config.defaultUrl` y `config.defaultMediaId` en DB (no elimina el asset de R2)

### CA-7 — FieldMediaContent: video
- [x] Comportamiento equivalente al CA-6 pero para tipo `video`
- [x] La tarjeta usa `aspect-video` (16:9) en lugar de `aspect-[4/3]`
- [x] Si hay thumbnail disponible, se muestra con overlay de play `▶` centrado en la tarjeta
- [x] Si no hay thumbnail, muestra ícono `Video` de Lucide + nombre sobre `bg-surface-2`
- [x] El picker está filtrado por `'video'`
- [x] Durante el upload de video, el texto de fase muestra "Procesando video (puede tardar)…" en Tier1

### CA-8 — MediaLibraryPicker en mobile
- [x] En viewport mobile, el picker se presenta como bottom sheet: `fixed inset-x-0 bottom-0 z-50 h-[92dvh] rounded-t-2xl`
- [x] Incluye handle visual arriba (`w-10 h-1 bg-border rounded-full mx-auto mt-2`)
- [x] El cierre es con botón X en la parte superior del sheet
- [x] En desktop mantiene el comportamiento actual (modal centrado `max-w-4xl`)
- [x] El mount del picker usa `<VHSTransition duration="fast">`

### CA-9 — Limpieza de código
- [x] El `button` de "ir a crear registro" en `FieldEditPanel` (bloque image/video) ha sido eliminado
- [x] La import `ArrowRight` de lucide en `FieldEditPanel` ha sido eliminada
- [x] `types/nodes.ts` incluye `ImageFieldConfig` y `VideoFieldConfig` con `defaultUrl` y `defaultMediaId`
- [x] `lib/actions/media.actions.ts` incluye `getMediaById(id)` action
- [x] Las rutas huérfanas han sido auditadas y eliminadas o documentadas con su motivo de permanencia
- [x] No hay referencias a `content/[nodeId]/new` desde la UI principal

### CA-10 — Calidad y consistencia visual
- [x] Todos los componentes nuevos usan variables CSS del sistema de color (sin hardcode)
- [x] Todos los textos visibles al usuario tienen clave i18n en `en.ts` y `es.ts`
- [x] Los estados loading usan skeletons (`animate-pulse bg-surface-2`) o spinners
- [x] Los estados error tienen estilo `text-danger` / `border-danger/30` / `bg-danger/10`
- [x] Los estados success tienen estilo equivalente con `text-success`
- [ ] La experiencia es consistente en Chrome, Firefox y Safari (no tests formales, solo verificación manual)
- [ ] Responsive verificado: desktop (1280px+), tablet (768px), mobile (375px)
