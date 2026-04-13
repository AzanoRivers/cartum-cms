# Gallery Field Node — Tipo de campo multi-imagen con grid de miniaturas

**Fecha:** 10/04/2026  
**Estado:** Planificación  
**Prioridad:** Media  
**Área:** Frontend UX + Backend (types + actions) + MediaLibraryPicker multi-select

---

## Contexto y Problema

El sistema actual de campo de imagen (`fieldType: 'image'`) solo permite una imagen por campo. No existe una forma nativa de asociar un conjunto ordenado de imágenes a un nodo (carrusel, galería de producto, slider, etc.).

El flujo de selección en `MediaLibraryPicker` tampoco admite selección múltiple — solo devuelve un `MediaRecord` al hacer click.

---

## Solución Propuesta

Nuevo `fieldType: 'gallery'` que almacena un array ordenado de referencias de imagen. La interfaz de edición presenta una grid de miniaturas con un tile `+` al final para agregar más. La lógica de media (subida, optimización) reutiliza íntegramente la pipeline existente.

---

## Arquitectura de Diseño

Principios aplicables a todas las piezas de esta feature:

- **Dark-first**, paleta del sistema (sin valores hardcodeados)
- `<VHSTransition>` en toda pantalla nueva o panel que monte
- Tipos en `/types/`, nunca inline
- Grid responsive con `auto-fill` para no romper en breakpoints intermedios
- `cva()` para variantes del tile de miniatura (idle / hover / dragging)
- Auto-guardado inmediato en DB al cambiar el array (igual que `image`/`video`)

---

## Fase 1 — Tipos y Schema

### 1.1 Nuevo `FieldType`

```ts
// types/nodes.ts
export type FieldType = 'text' | 'number' | 'boolean' | 'image' | 'video' | 'relation' | 'gallery'
```

### 1.2 Migración de base de datos requerida

Existe un `CHECK` constraint en la tabla `field_meta` que restringe los valores de `field_type`:

```sql
-- Constraint actual (nodes.schema.ts línea 37)
CHECK (field_type IN ('text', 'number', 'boolean', 'image', 'video', 'relation'))
```

Agregar `'gallery'` requiere una **migración** para actualizar ese constraint:

**`db/schema/nodes.schema.ts`** — actualizar el check:
```ts
check('field_meta_type_check',
  sql`${t.fieldType} IN ('text', 'number', 'boolean', 'image', 'video', 'relation', 'gallery')`
),
```

**`lib/actions/nodes.schemas.ts`** — actualizar el enum de Zod:
```ts
fieldType: z.enum(['text', 'number', 'boolean', 'image', 'video', 'relation', 'gallery'])
```

Luego ejecutar con los scripts del proyecto:
```bash
pnpm db:generate   # detecta el cambio en el CHECK y genera el .sql en db/migrations/
pnpm db:migrate    # aplica la migración a la base de datos
```

El SQL generado será algo como:
```sql
ALTER TABLE "field_meta" DROP CONSTRAINT "field_meta_type_check";
ALTER TABLE "field_meta" ADD CONSTRAINT "field_meta_type_check"
  CHECK ("field_meta"."field_type" IN ('text', 'number', 'boolean', 'image', 'video', 'relation', 'gallery'));
```

> **Nota:** `"prebuild": "drizzle-kit migrate"` está definido en `package.json`, lo que significa que `pnpm build` aplica las migraciones pendientes automáticamente. Aun así, en desarrollo es mejor correr `pnpm db:migrate` de forma explícita antes de arrancar el servidor.

> **No se crean tablas nuevas.** La columna `config jsonb` ya existe y admite el array `items` sin cambios adicionales.

---

### 1.4 `GalleryFieldConfig`

```ts
// types/nodes.ts
export interface GalleryItem {
  url:     string
  mediaId: string | null
}

export interface GalleryFieldConfig {
  items: GalleryItem[]       // orden preservado, índice = posición en grid
  maxItems?: number          // opcional: límite de imágenes (undefined = sin límite)
}
```

El array `items` se guarda en el JSONB `field_meta.config`. No se requiere migración nueva: el tipo `jsonb` ya admite arrays.

### 1.5 Unión `FieldConfig`

```ts
// types/nodes.ts — actualizar union
export type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | BooleanFieldConfig
  | RelationFieldConfig
  | ImageFieldConfig
  | VideoFieldConfig
  | GalleryFieldConfig          // ← nuevo
  | Record<string, never>
```

---

## Fase 2 — `FieldTypePicker`

El componente `FieldTypePicker` debe incluir `gallery` como opción seleccionable.

```
Icono sugerido (Lucide): `LayoutGrid` o `GalleryHorizontal`
Label EN: 'Gallery'
Label ES: 'Galería'
```

### 2.1 Actualizar `fieldTypePicker` en locales

```ts
// locales/en.ts — fieldTypePicker
gallery: 'Gallery'

// locales/es.ts — fieldTypePicker
gallery: 'Galería'
```

### 2.2 Actualizar tipo en `en.ts`

```ts
fieldTypePicker: {
  text: string; number: string; boolean: string
  image: string; video: string; relation: string
  gallery: string   // ← nuevo
}
```

---

## Fase 3 — `MediaLibraryPicker` con multi-selección

El picker actual devuelve un solo `MediaRecord`. Necesita un modo de selección múltiple para gallery.

### 3.1 Props actualizadas

```ts
// components/ui/organisms/MediaLibraryPicker.tsx
export type MediaLibraryPickerProps = {
  open:       boolean
  filter:     'image' | 'video'
  onClose:    () => void
  // Modo single (comportamiento actual)
  onSelect?:  (asset: MediaRecord) => void
  // Modo multi
  multiSelect?:   boolean
  onSelectMulti?: (assets: MediaRecord[]) => void
}
```

- Cuando `multiSelect: true` el click en un asset **no cierra** el picker — lo marca con un check overlay
- Footer sticky con: `X seleccionadas` + botón `Confirmar` + botón `Cancelar`
- El estado de selección es local al picker y se limpia al cerrar

### 3.2 UX del check overlay

```
┌──────────────┐
│ ╔══════════╗ │
│ ║  ✓       ║ │   ← overlay semi-transparente con checkmark cuando seleccionada
│ ║  [img]   ║ │
│ ╚══════════╝ │
│  foto.jpg    │
└──────────────┘
```

- Check overlay: `bg-primary/60` + `CheckCircle2` centrado, blanco
- Borde de la card seleccionada: `border-primary`
- No seleccionada: `border-border hover:border-primary/50`

### 3.3 Footer del picker en modo multi

```
┌─────────────────────────────────────────────┐
│  3 seleccionadas          [Cancelar] [Añadir]│
└─────────────────────────────────────────────┘
```

---

## Fase 4 — Componente `FieldGalleryContent`

Nuevo componente en `/components/ui/molecules/FieldGalleryContent.tsx`.

Equivalente a `FieldMediaContent` pero para arrays de imágenes.

### 4.1 Props

```ts
// types/nodes.ts — ya existe GalleryFieldConfig, reutilizar
export type FieldGalleryContentProps = {
  nodeId?:   string
  items:     GalleryItem[]
  maxItems?: number
  onChange:  (items: GalleryItem[]) => Promise<void>
  labels:    GalleryContentLabels   // i18n labels
}

export type GalleryContentLabels = {
  addImage:      string   // 'Add image' / 'Agregar imagen'
  removeImage:   string   // 'Remove' / 'Eliminar'
  confirmRemove: string   // 'Confirm?' / '¿Confirmar?'
  selectFromLib: string   // 'From library' / 'De librería'
  uploadNew:     string   // 'Upload' / 'Subir'
  empty:         string   // 'No images yet' / 'Sin imágenes aún'
  maxReached:    string   // 'Max images reached' / 'Límite de imágenes alcanzado'
  uploading:     string
  optimizing:    string
  uploadError:   string
}
```

### 4.2 Grid de miniaturas

```
Desktop (xl: ≥1280px)
┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│img │ │img │ │img │ │img │ │ +  │   ← tile "añadir" siempre al final
└────┘ └────┘ └────┘ └────┘ └────┘

Tablet (md: 768–1279px)
┌────┐ ┌────┐ ┌────┐
│img │ │img │ │img │
└────┘ └────┘ └────┘
┌────┐ ┌────┐
│img │ │ +  │
└────┘ └────┘

Mobile (sm: <768px)
┌────┐ ┌────┐
│img │ │img │
└────┘ └────┘
┌────┐ ┌────┐
│img │ │ +  │
└────┘ └────┘
```

### 4.3 Clases Tailwind para la grid

```tsx
// Grid adaptativa con auto-fill — nunca rompe en breakpoints intermedios
// El panel del FieldEditPanel tiene ~340px en mobile, ~600px en desktop
// Tamaño mínimo de tile: 80px; máximo: 1fr

<div className="grid gap-2"
     style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
  {items.map((item, i) => (
    <Thumbnail key={item.url} item={item} index={i} onRemove={...} />
  ))}
  {(!maxItems || items.length < maxItems) && (
    <AddTile onAdd={...} />
  )}
</div>
```

> Se usa `auto-fill` con `minmax` para que la grid se adapte sola a cualquier ancho del panel sin necesidad de breakpoints explícitos. En un panel de 340px caben ~3–4 tiles; en 600px ~6–7.

### 4.4 Tile de miniatura (Thumbnail)

```tsx
// Estado: idle
┌──────────────┐
│              │
│    [img]     │   aspect-square, object-cover, rounded-md
│              │
└──────────────┘

// Estado: hover — overlay con botón eliminar
┌──────────────┐
│  ╔════════╗  │
│  ║   ×    ║  │   bg-black/50, botón × arriba-derecha
│  ║ [img]  ║  │
│  ╚════════╝  │
└──────────────┘

// Estado: confirming remove (doble click)
┌──────────────┐
│  ╔════════╗  │
│  ║   ✓?   ║  │   bg-danger/80, texto "¿Confirmar?"
│  ║ [img]  ║  │
│  ╚════════╝  │
└──────────────┘
```

Variantes con `cva()`:
```ts
const thumbnailVariants = cva(
  'relative overflow-hidden rounded-md border aspect-square cursor-default transition-all',
  {
    variants: {
      state: {
        idle:       'border-border',
        hover:      'border-border',
        confirming: 'border-danger',
      },
    },
    defaultVariants: { state: 'idle' },
  }
)
```

### 4.5 Tile "Añadir" (`AddTile`)

```tsx
// Idle
┌──────────────┐
│              │
│      +       │   border-dashed border-border text-muted
│              │   hover: border-primary/50 text-text
└──────────────┘
```

Al hacer click abre un pequeño menú (dropdown o dos botones):
- `De librería` → abre `MediaLibraryPicker` en modo `multiSelect: true`
- `Subir archivo` → abre input de file

### 4.6 Subida de múltiples archivos

Cuando el usuario selecciona N archivos desde `<input type="file" multiple>`:
- Se encolan en secuencia (no en paralelo, para no saturar el pipeline)
- Cada archivo muestra una miniatura "placeholder" con barra de progreso
- Al completar, reemplaza el placeholder por la imagen real
- Los errores muestran el placeholder en rojo con icono de advertencia (no bloquean el resto)

---

## Fase 5 — Integración en `FieldEditPanel`

### 5.1 `renderTypeConfig` para gallery

En la sección **Tipo** del acordeón: solo mostrar la opción de límite máximo (opcional).

```tsx
if (fieldType === 'gallery') {
  return (
    <div className="flex flex-col gap-3">
      <Input
        label={d?.fieldEdit.gallery.maxItems ?? 'Max images (optional)'}
        type="number"
        min={1}
        size="sm"
        placeholder="e.g. 10"
        value={galleryMaxItems}
        onChange={(e) => setGalleryMaxItems(e.target.value)}
      />
    </div>
  )
}
```

### 5.2 Sección Contenido para gallery

Igual que `image`/`video`, la sección "Contenido" se abre por defecto.

```tsx
} : fieldType === 'gallery' ? (
  <FieldGalleryContent
    nodeId={field?.parentId ?? undefined}
    items={galleryItems}
    maxItems={galleryMaxItems !== '' ? Number(galleryMaxItems) : undefined}
    onChange={async (newItems) => {
      setGalleryItems(newItems)
      if (!field) return
      const result = await updateFieldMeta({
        nodeId: field.id,
        fieldType,
        config: { items: newItems, ...(galleryMaxItems !== '' ? { maxItems: Number(galleryMaxItems) } : {}) },
      })
      if (result.success) {
        setNodes(nodes.map((n) => (n.id === result.data.id ? result.data : n)))
      }
    }}
    labels={galleryLabels}
  />
)
```

### 5.3 Nuevos estados en `FieldEditPanel`

```ts
const [galleryItems,    setGalleryItems]    = useState<GalleryItem[]>([])
const [galleryMaxItems, setGalleryMaxItems] = useState('')
```

### 5.4 `buildConfig` para gallery

```ts
if (fieldType === 'gallery') {
  return {
    items: galleryItems,
    ...(galleryMaxItems !== '' ? { maxItems: Number(galleryMaxItems) } : {}),
  } satisfies GalleryFieldConfig
}
```

### 5.5 `hasInlineContent` — incluir gallery

```ts
const hasInlineContent =
  field.fieldType === 'text'    ||
  field.fieldType === 'number'  ||
  field.fieldType === 'image'   ||
  field.fieldType === 'video'   ||
  field.fieldType === 'gallery'
```

---

## Fase 6 — i18n

### 6.1 Nuevas keys en `fieldEdit`

```ts
// en.ts
gallery: {
  maxItems:            'Max images (optional)',
  maxItemsPlaceholder: 'e.g. 10',
}

// es.ts
gallery: {
  maxItems:            'Máximo de imágenes (opcional)',
  maxItemsPlaceholder: 'ej. 10',
}
```

### 6.2 Labels del componente `FieldGalleryContent`

```ts
// en.ts — dentro de fieldEdit.mediaContent (o nuevo bloque galleryContent)
galleryContent: {
  addImage:      'Add image',
  removeImage:   'Remove',
  confirmRemove: 'Confirm?',
  selectFromLib: 'From library',
  uploadNew:     'Upload',
  empty:         'No images yet. Add the first one.',
  maxReached:    'Maximum number of images reached.',
  uploading:     'Uploading…',
  optimizing:    'Optimizing…',
  uploadError:   'Upload failed.',
}

// es.ts
galleryContent: {
  addImage:      'Agregar imagen',
  removeImage:   'Eliminar',
  confirmRemove: '¿Confirmar?',
  selectFromLib: 'De librería',
  uploadNew:     'Subir',
  empty:         'Sin imágenes aún. Agrega la primera.',
  maxReached:    'Se alcanzó el límite de imágenes.',
  uploading:     'Subiendo…',
  optimizing:    'Optimizando…',
  uploadError:   'Error al subir.',
}
```

---

## Fase 7 — Responsive: análisis de breakpoints

### 7.1 Contexto del panel

El `FieldEditPanel` tiene dos modos:
- **Modal** (desktop, `asSheet: false`): ancho fijo `w-85` → `sm:w-150` (340px → 600px)
- **Sheet** (mobile, `asSheet: true`): 100vw

La grid usa `auto-fill minmax(80px, 1fr)` — se calcula automáticamente:

| Ancho del panel | Tiles por fila (aprox.) |
|---|---|
| 340 px (mobile modal) | 3–4 tiles |
| 420 px (tablet/landscape) | 4–5 tiles |
| 600 px (desktop modal) | 6–7 tiles |
| 100vw / 390px (iPhone 14) | 4 tiles |
| 100vw / 768px (iPad) | 8–9 tiles |

> No se necesitan clases `sm:`, `md:`, `lg:` — el `auto-fill` adapta solo.

### 7.2 Casos extremos

- **1 sola imagen**: la grid muestra 1 tile + tile `+`, alineados al inicio (no centrados ni estirados)
- **0 imágenes**: solo se muestra el tile `+` con el texto `empty` debajo
- **maxItems alcanzado**: el tile `+` desaparece; aparece un badge `Límite alcanzado`
- **Imagen cargando**: placeholder gris animado (`animate-pulse`) del mismo tamaño que un tile normal

### 7.3 Aspect ratio y height

Todos los tiles son `aspect-square`. El contenedor no tiene altura fija — crece con la grid.
En el modal con scroll (`overflow-y-auto`), una galería de 20 imágenes genera ~4–5 filas scrolleables.

---

## Archivos a crear

| Archivo | Descripción |
|---|---|
| `components/ui/molecules/FieldGalleryContent.tsx` | Componente principal de la grid de galería |
| `components/ui/molecules/FieldGalleryContent.types.ts` | (opcional) si los tipos se vuelven grandes |

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `db/schema/nodes.schema.ts` | Actualizar CHECK constraint de `field_type` para incluir `'gallery'` |
| `lib/actions/nodes.schemas.ts` | Actualizar `z.enum` de `fieldType` para incluir `'gallery'` |
| `types/nodes.ts` | Agregar `'gallery'` a `FieldType`, `GalleryItem`, `GalleryFieldConfig`, actualizar unión `FieldConfig` |
| `locales/en.ts` | Keys `fieldTypePicker.gallery`, `fieldEdit.gallery`, `fieldEdit.galleryContent` + tipo |
| `locales/es.ts` | Ídem en español |
| `components/ui/molecules/FieldTypePicker.tsx` | Agregar opción `gallery` con icono `LayoutGrid` |
| `components/ui/organisms/MediaLibraryPicker.tsx` | Props `multiSelect` + `onSelectMulti`, check overlay, footer de confirmación |
| `components/ui/organisms/FieldEditPanel.tsx` | Estados gallery, `renderTypeConfig`, sección Contenido, `buildConfig`, `hasInlineContent` |

---

## Orden de implementación sugerido

```
1. db/schema/nodes.schema.ts   → actualizar CHECK constraint
   lib/actions/nodes.schemas.ts → actualizar z.enum
   → ejecutar: pnpm db:generate && pnpm db:migrate
2. types/nodes.ts              → tipos base (sin UI)
3. locales/en.ts + es.ts       → i18n antes de tocar UI
4. FieldTypePicker.tsx         → aparece el nuevo tipo en el selector
5. MediaLibraryPicker.tsx      → multi-select (bloque reutilizable)
6. FieldGalleryContent.tsx     → componente principal (usa el picker)
7. FieldEditPanel.tsx          → integración final
```

---

## Checklist de entrega

- [ ] Migración ejecutada — CHECK constraint incluye `'gallery'`
- [ ] `GalleryItem` y `GalleryFieldConfig` definidos en `/types/nodes.ts`
- [ ] `'gallery'` visible en `FieldTypePicker` con icono correcto
- [ ] `MediaLibraryPicker` acepta `multiSelect` y devuelve array
- [ ] Grid de miniaturas con `auto-fill minmax(80px, 1fr)` — sin breakpoints hardcodeados
- [ ] Tile `+` siempre al final en secuencia, desaparece al alcanzar `maxItems`
- [ ] Eliminar imagen: confirmación de 2 pasos (igual que imagen única)
- [ ] Auto-guardado en DB al cambiar el array (igual que `image`/`video`)
- [ ] Pre-carga de items al reabrir el panel desde `field.config`
- [ ] `<VHSTransition>` aplicado al montar `FieldGalleryContent`
- [ ] Sin valores de color hardcodeados
- [ ] TypeScript strict — sin `any`
- [ ] i18n completo en `en.ts` y `es.ts` incluyendo tipo estático
