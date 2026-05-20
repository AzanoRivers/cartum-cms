# Feature: Migración Web via DealerScraper

**Fecha:** 2026-05-20  
**Scope:** Integración con API DealerScraper VPS — scraping de URLs externas + importación de datos como mazos/cartas/registros en Cartum

---

## Objetivo

Agregar una sección **"Migración Web"** dentro del modal de ajustes que permita al usuario:

1. Configurar credenciales de la API DealerScraper (URL + API Key)
2. Ingresar una URL objetivo con opciones de scraping
3. Ver el progreso del job en tiempo real vía polling
4. Previsualizar los datos extraídos (negocio, páginas clave, cobertura)
5. Importar los datos como mazos, cartas y registros en Cartum

El flujo completo ocurre dentro del modal de ajustes — sin páginas dedicadas.

---

## API DealerScraper — Referencia

Base URL: configurable (default `https://scraper.azanolabs.com`)  
Auth: header `X-API-Key: <key>` en todas las llamadas autenticadas.

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/v1/status` | GET | Sí | Capacidad del servidor (`active_jobs`, `max_concurrent_jobs`) |
| `/api/v1/scrape` | POST | Sí | Crear job → `{ job_id, status: "queued" }` |
| `/api/v1/scrape/{id}/status` | GET | Sí | Polling del estado → `{ status, progress, error, ttl_remaining_seconds }` |
| `/api/v1/scrape/{id}/result` | GET | Sí | Resultado final → `{ business, content, assets, metadata }` |
| `/api/v1/scrape/{id}` | DELETE | Sí | Cancelar/eliminar job |

**Pipeline de estados:** `queued → exploring → fetching → extracting → auditing → analyzing → packaging → done / failed`

**TTL:** 15 minutos tras `done`/`failed` — el resultado se auto-elimina del servidor después.

**Request body `POST /api/v1/scrape`:**
```json
{
  "url": "https://example.com",
  "options": {
    "max_pages": 50,
    "download_images": false,
    "llm_provider": null,
    "llm_model": null
  }
}
```

**Response polling `GET /api/v1/scrape/{id}/status`:**
```json
{
  "job_id": "uuid",
  "status": "fetching",
  "progress": { "phase": "Fetching", "pages_done": 12, "pages_total": 30, "percent": 40 },
  "ttl_remaining_seconds": null,
  "error": null,
  "estimated_remaining_seconds": 45,
  "created_at": "...",
  "done_at": null
}
```

**Response result `GET /api/v1/scrape/{id}/result`:**
```json
{
  "job_id": "uuid",
  "url": "https://example.com",
  "scraped_at": "2026-05-20T10:00:00Z",
  "business": {
    "name": "ABC Dealership",
    "type": "car_dealer",
    "description": "...",
    "language": "es",
    "address": "...",
    "phone": "...",
    "email": "...",
    "social_links": ["https://facebook.com/..."]
  },
  "content": {
    "main_topics": ["cars", "service", "financing"],
    "key_pages": [
      {
        "url": "https://example.com/about",
        "title": "About Us",
        "summary": "...",
        "key_points": ["point1", "point2"]
      }
    ]
  },
  "assets": {
    "images": [{ "src": "...", "alt": "...", "local_path": null, "width": null, "height": null }]
  },
  "metadata": {
    "total_pages_discovered": 150,
    "pages_fetched": 50,
    "pages_analyzed": 45,
    "coverage_percent": 85.5
  }
}
```

**Códigos de error del job** (cuando `status === 'failed'`):

| Código | Causa | `retry_after` |
|--------|-------|---------------|
| `NO_ROUTES_FOUND` | Sitio solo JS sin SSR o bloqueado | null |
| `FETCH_ALL_FAILED` | 4xx/5xx/timeout en todas las páginas | 300s |
| `EXTRACTION_EMPTY` | HTML sin contenido útil | null |
| `AUDIT_CRITICAL_GAPS` | Cobertura < 30% | null |
| `LLM_TIMEOUT` | LLM inactivo > 5 min | 300s |
| `LLM_AUTH_ERROR` | API key del proveedor LLM inválida | null |
| `LLM_PARSE_ERROR` | JSON malformado del LLM | 60s |
| `JOB_TIMEOUT` | > 30 minutos totales | 600s |
| `INTERNAL_ERROR` | Fallo inesperado | 60s |

---

## Arquitectura

```
ScraperSection.tsx (settings panel — 'use client')
        ↓
useWebMigration.ts (hook — state + polling loop)
        ↓
lib/actions/scraper.actions.ts ('use server' — añaden X-API-Key desde settings DB)
        ↓
lib/services/scraper.service.ts (HTTP client puro para DealerScraper API)

        ↓  (en importScrapedData)

lib/services/nodes.service.ts  ← crear mazo + cartas
lib/services/records.service.ts ← crear registros
```

---

## Archivos a crear

### `types/scraper.ts`

```ts
export type ScrapeOptions = {
  max_pages?: number
  download_images?: boolean
  llm_provider?: string
  llm_model?: string
}

export type ScrapeJobStatus =
  | 'queued'
  | 'exploring'
  | 'fetching'
  | 'extracting'
  | 'auditing'
  | 'analyzing'
  | 'packaging'
  | 'done'
  | 'failed'
  | 'expired'

export type ScrapeJobProgress = {
  phase: string
  pages_done: number
  pages_total: number
  percent: number
}

export type ScrapeJobError = {
  code: string
  message: string
  failed_at: string
  retry_after: number | null
}

export type ScrapeJobState = {
  job_id: string
  status: ScrapeJobStatus
  progress: ScrapeJobProgress | null
  ttl_remaining_seconds: number | null
  error: ScrapeJobError | null
  created_at: string
  started_at: string | null
  updated_at: string
  done_at: string | null
  estimated_remaining_seconds: number
}

export type ScrapeResultBusiness = {
  name: string | null
  type: string | null
  description: string
  language: string
  address: string | null
  phone: string | null
  email: string | null
  social_links: string[]
}

export type ScrapeResultKeyPage = {
  url: string
  title: string
  summary: string
  key_points: string[]
}

export type ScrapeResult = {
  job_id: string
  url: string
  scraped_at: string
  llm_provider: string
  llm_model: string
  business: ScrapeResultBusiness
  content: {
    main_topics: string[]
    key_pages: ScrapeResultKeyPage[]
  }
  assets: {
    images: Array<{
      src: string
      alt: string
      local_path: string | null
      width: number | null
      height: number | null
    }>
  }
  metadata: {
    total_pages_discovered: number
    pages_fetched: number
    pages_analyzed: number
    coverage_percent: number
  }
}

export type ScraperServerStatus = {
  name: string
  version: string
  active_jobs: number
  max_concurrent_jobs: number
  status: 'ok' | 'busy'
}

export type WebMigrationSettings = {
  scraperApiUrl?: string   // default: 'https://scraper.azanolabs.com'
  scraperApiKey?: string
}

// Estrategia de importación elegida por el usuario
export type ImportStrategy = 'business_only' | 'business_and_pages'

export type ImportedSummary = {
  businessNodeId: string
  businessRecordId: string
  pagesNodeId?: string
  pagesRecordIds?: string[]
}
```

---

### `lib/services/scraper.service.ts`

```ts
// HTTP client para DealerScraper API — sin dependencias Next.js
// Todos los métodos lanzan ScraperApiError en caso de fallo HTTP

export class ScraperApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus?: number
  )
}

export const scraperService = {
  getServerStatus(apiUrl: string, apiKey: string): Promise<ScraperServerStatus>

  startJob(
    apiUrl: string,
    apiKey: string,
    url: string,
    options?: ScrapeOptions
  ): Promise<{ job_id: string; status: string }>

  getJobStatus(
    apiUrl: string,
    apiKey: string,
    jobId: string
  ): Promise<ScrapeJobState>

  getJobResult(
    apiUrl: string,
    apiKey: string,
    jobId: string
  ): Promise<ScrapeResult>

  cancelJob(
    apiUrl: string,
    apiKey: string,
    jobId: string
  ): Promise<void>
}
// Cada método hace fetch() con header X-API-Key y maneja HTTP errors
// getJobResult lanza ScraperApiError('JOB_NOT_DONE') si status HTTP 425
```

---

### `lib/actions/scraper.actions.ts`

```ts
'use server'

// Cada action lee scraperApiUrl + scraperApiKey desde getSetting()
// La API key nunca se expone al cliente

export async function getScraperServerStatus(): Promise<ActionResult<ScraperServerStatus>>

export async function startScrapeJob(
  url: string,
  options?: ScrapeOptions
): Promise<ActionResult<{ job_id: string }>>

export async function getScrapeJobStatus(
  jobId: string
): Promise<ActionResult<ScrapeJobState>>

export async function getScrapeJobResult(
  jobId: string
): Promise<ActionResult<ScrapeResult>>

export async function cancelScrapeJob(
  jobId: string
): Promise<ActionResult<void>>

// Importación: crea mazo(s) + cartas + registros a partir del resultado
export async function importScrapedData(
  result: ScrapeResult,
  strategy: ImportStrategy
): Promise<ActionResult<ImportedSummary>>
```

**Lógica de `importScrapedData`:**

Strategy `business_only`:
1. `nodesService.createNode({ name: 'Business: {name}', type: 'container' })`
2. Crear cartas: `name`, `type`, `description`, `language`, `address`, `phone`, `email`, `social_links`, `main_topics`, `scraped_url`, `scraped_at` (todos tipo `string`)
3. `recordsService.createRecord({ nodeId, data: { ...business, social_links: JSON.stringify(...), main_topics: topics.join(', '), scraped_url: result.url, scraped_at: result.scraped_at } })`

Strategy `business_and_pages` — todo lo anterior PLUS:
1. `nodesService.createNode({ name: 'Pages: {name}', type: 'container' })`
2. Crear cartas: `url`, `title`, `summary`, `key_points` (tipo `string`)
3. Un `recordsService.createRecord()` por cada entrada en `content.key_pages`
   - `key_points`: `JSON.stringify(page.key_points)`

Valores `null` del scraper → string vacío `''` (nunca `null` en records).

---

### `lib/hooks/useWebMigration.ts`

```ts
'use client'

type MigrationStep =
  | 'idle'           // formulario vacío
  | 'running'        // job activo — polling
  | 'done'           // result disponible — esperando decisión de import
  | 'error'          // job fallido
  | 'importing'      // importScrapedData en curso
  | 'imported'       // importación completada

export function useWebMigration() {
  // State expuesto
  step: MigrationStep
  jobId: string | null
  jobState: ScrapeJobState | null
  result: ScrapeResult | null
  importSummary: ImportedSummary | null
  error: string | null
  isPending: boolean  // useTransition

  // Actions
  startMigration(url: string, options?: ScrapeOptions): void
  cancelMigration(): void
  importResult(strategy: ImportStrategy): void
  reset(): void
}

// Polling:
// - useEffect + setInterval (5000ms) mientras step === 'running'
// - Llama getScrapeJobStatus() dentro de startTransition (no bloquea UI)
// - Para cuando status ∈ ['done', 'failed', 'expired']
// - Cuando done → getScrapeJobResult() → step = 'done', result = data
// - Cleanup: clearInterval en return del useEffect
```

---

### `components/ui/organisms/settings/ScraperSection.tsx`

Panel único dentro del modal de ajustes. Organizado en sub-secciones que se muestran/ocultan según `step`.

**Sub-sección A: Configuración API** (siempre visible)

```
┌─ Migración Web ─────────────────────────────────────┐
│                                                     │
│  API URL  [https://scraper.azanolabs.com_________]  │
│  API Key  [●●●●●●●●●●●●●●] [Mostrar]              │
│                                                     │
│  [Test conexión]                      [Guardar]     │
│                                                     │
│  ○ Servidor no configurado                         │
│  ● Servidor disponible (0 / 1 jobs activos)        │
│  ● Servidor ocupado — espera un momento            │
└─────────────────────────────────────────────────────┘
```

**Sub-sección B: Formulario de migración** (visible si API configurada y step === 'idle')

```
┌─ Nueva migración ───────────────────────────────────┐
│                                                     │
│  URL objetivo  [https://___________________]        │
│                                                     │
│  Páginas máx.  [50____]   Descargar imgs  [  ]     │
│                                                     │
│                          [▶ Iniciar migración]      │
└─────────────────────────────────────────────────────┘
```

**Sub-sección C: Progreso** (visible cuando step === 'running')

```
┌─ Scraping en progreso ──────────────────────────────┐
│                                                     │
│  [████████████░░░░░░░░░░░░░░░]  40%               │
│  Fase: Fetching pages (12 / 30)                    │
│  Tiempo restante est.: ~45s                        │
│                                                     │
│                              [✕ Cancelar]          │
└─────────────────────────────────────────────────────┘
```

**Sub-sección D: Resultado + selección de estrategia** (visible cuando step === 'done')

```
┌─ Resultado ─────────────────────────────────────────┐
│  ● ABC Dealership — car_dealer — es                │
│  Cobertura: 85% · 45 páginas analizadas            │
│  ⚠ Expira en 12 min                               │
│                                                     │
│  Importar como:                                    │
│  (●) Solo datos del negocio   (1 mazo, 1 registro) │
│  (○) Negocio + páginas clave  (2 mazos, 9 regs.)   │
│                                                     │
│                        [↓ Importar a Cartum]        │
└─────────────────────────────────────────────────────┘
```

**Sub-sección E: Confirmación** (visible cuando step === 'imported')

```
┌─ Importación completada ────────────────────────────┐
│  ✓ Mazo "Business: ABC Dealership" creado          │
│  ✓ 1 registro importado                            │
│  ✓ Mazo "Pages: ABC Dealership" creado             │
│  ✓ 8 registros importados                         │
│                                                     │
│  [Nueva migración]            [Ver en tablero]      │
└─────────────────────────────────────────────────────┘
```

**Sub-sección F: Error** (visible cuando step === 'error')

```
┌─ Error ─────────────────────────────────────────────┐
│  ✕ FETCH_ALL_FAILED                                │
│  No se pudo acceder al sitio.                      │
│  Reintenta en ~5 minutos.                          │
│                                                     │
│                       [↺ Intentar de nuevo]         │
└─────────────────────────────────────────────────────┘
```

Animaciones:
- Cada sub-sección usa `<VHSTransition duration="fast">` al aparecer
- Barra de progreso: `transition-all duration-500` en `width`
- Transición entre sub-secciones: `grid-rows-[0fr→1fr]` (mismo patrón acordeón del proyecto)

---

## Archivos a modificar

### 1. `types/settings.ts`

Agregar:
```ts
export type WebMigrationSettings = {
  scraperApiUrl?: string
  scraperApiKey?: string
}
```

No modificar tipos existentes — `WebMigrationSettings` es un tipo independiente.

---

### 2. `lib/actions/settings.actions.ts`

Agregar al final del archivo:
```ts
export async function getWebMigrationSettings(): Promise<ActionResult<WebMigrationSettings>>
// Lee 'scraper_api_url' y 'scraper_api_key' desde getSetting()
// scraper_api_url fallback: 'https://scraper.azanolabs.com'

export async function updateWebMigrationSettings(
  settings: WebMigrationSettings
): Promise<ActionResult<void>>
// setSetting('scraper_api_url', ...) y setSetting('scraper_api_key', ...)
```

---

### 3. `lib/boot/validate.ts`

Agregar check opcional después del bloque de Vercel Blob:

```ts
// ── N. DealerScraper (optional) ────────────────────────────────────────────
const scraperKey = await getSetting('scraper_api_key', process.env.SCRAPER_API_KEY)
if (scraperKey) {
  ok('DealerScraper — OK')
} else {
  info('CARTUM_I002', 'DealerScraper not configured. Optional — configure in Settings > Web Migration.')
}
```

Usar `info` (no `warn`) — es completamente opcional.

---

### 4. Panel de settings — registro de la sección

Identificar durante implementación el archivo que organiza las secciones del modal (probablemente `SettingsPanel.tsx` o `SettingsSidebar.tsx`). Agregar `ScraperSection` como nueva entrada con la misma estructura que las secciones existentes.

---

### 5. `locales/en.ts` + `locales/es.ts`

Nueva sección `webMigration`:

```ts
// Sección principal
title:                 'Web Migration'

// Config API
apiUrl:                'API URL'
apiKey:                'API Key'
testConnection:        'Test connection'
save:                  'Save'
serverAvailable:       'Server available ({active}/{max} active jobs)'
serverBusy:            'Server busy — try again in a few minutes'
serverNotConfigured:   'Server not configured'
connectionOk:          'Connection OK ({latencyMs}ms)'
connectionFail:        'Connection failed'

// Formulario
urlLabel:              'Target URL'
urlPlaceholder:        'https://example.com'
maxPages:              'Max pages'
downloadImages:        'Download images'
startMigration:        'Start migration'

// Progreso
progressTitle:         'Scraping in progress'
phaseLabel:            'Phase: {phase}'
pagesProgress:         '{done} / {total} pages'
estimatedTime:         '~{seconds}s remaining'
cancel:                'Cancel'

// Resultado
resultTitle:           'Result'
coverage:              'Coverage: {pct}% · {pages} pages analyzed'
ttlWarning:            'Expires in {minutes} min'

// Estrategia de importación
importTitle:           'Import as:'
strategyBusinessOnly:  'Business data only (1 mazo, 1 record)'
strategyWithPages:     'Business + key pages ({n} mazos, {m} records)'
importButton:          'Import to Cartum'

// Confirmación
importedTitle:         'Import completed'
mazoCreated:           'Mazo "{name}" created'
recordsImported:       '{n} record(s) imported'
newMigration:          'New migration'
viewOnBoard:           'View on board'

// Errores
errorJobFailed:        'Scraping failed: {message}'
errorRetryAfter:       'Retry after ~{seconds}s'
errorImport:           'Import failed. Try again.'
errorNotConfigured:    'Configure API credentials first'
errorServerBusy:       'Server is busy. Try again later.'
```

---

## Flujo completo

```
① Usuario abre Settings → Migración Web
        ↓
② [Si no configurado] Ingresa scraperApiUrl + scraperApiKey → Test → Guardar
   [Si configurado]   Ver badge de estado del servidor (disponible / ocupado)
        ↓
③ Ingresa URL objetivo + opciones (max_pages, download_images)
   Click "Iniciar migración"
        ↓
④ startMigration() → startScrapeJob() → { job_id }
   step: 'idle' → 'running'
        ↓
⑤ Polling cada 5s → getScrapeJobStatus(jobId)
   → jobState.progress actualiza barra de progreso + texto de fase
   → [Si failed] → step = 'error', mostrar error.code + error.message
   → [Si done]   → getScrapeJobResult(jobId) → result → step = 'done'
        ↓
⑥ Usuario ve preview del resultado
   Selecciona estrategia de importación
   Click "Importar a Cartum"
   step: 'done' → 'importing'
        ↓
⑦ importScrapedData(result, strategy)
   → Crea nodo(s) + cartas + registros en DB
   → step = 'imported', importSummary = { ... }
        ↓
⑧ Confirmación con resumen
   [Nueva migración] → reset() → step = 'idle'
   [Ver en tablero]  → navegar al canvas (router.push a board)
```

---

## Estrategia de importación — nodos creados

### `business_only`

**Mazo creado:** `Business: {business.name ?? 'Unnamed'}`

| Carta | Tipo campo | Valor |
|-------|-----------|-------|
| `name` | string | `business.name ?? ''` |
| `type` | string | `business.type ?? ''` |
| `description` | string | `business.description` |
| `language` | string | `business.language` |
| `address` | string | `business.address ?? ''` |
| `phone` | string | `business.phone ?? ''` |
| `email` | string | `business.email ?? ''` |
| `social_links` | string | `JSON.stringify(business.social_links)` |
| `main_topics` | string | `content.main_topics.join(', ')` |
| `scraped_url` | string | `result.url` |
| `scraped_at` | string | `result.scraped_at` |

1 record con todos los valores anteriores.

---

### `business_and_pages`

Todo lo anterior PLUS:

**Mazo creado:** `Pages: {business.name ?? 'Unnamed'}`

| Carta | Tipo campo | Valor |
|-------|-----------|-------|
| `url` | string | `page.url` |
| `title` | string | `page.title` |
| `summary` | string | `page.summary` |
| `key_points` | string | `JSON.stringify(page.key_points)` |

N records — uno por cada entrada en `content.key_pages`.

---

## Orden de implementación

1. `types/scraper.ts` — todos los tipos
2. `types/settings.ts` — agregar `WebMigrationSettings`
3. `lib/services/scraper.service.ts` — HTTP client (sin `importScrapedData` aún)
4. `lib/actions/settings.actions.ts` — `getWebMigrationSettings` + `updateWebMigrationSettings`
5. `lib/boot/validate.ts` — check opcional `SCRAPER_API_KEY`
6. `lib/actions/scraper.actions.ts` — actions de job (sin `importScrapedData` aún)
7. `lib/hooks/useWebMigration.ts` — hook completo con polling (sin import aún)
8. `locales/en.ts` + `locales/es.ts` — sección `webMigration`
9. `components/ui/organisms/settings/ScraperSection.tsx` — UI completa
10. Registrar `ScraperSection` en el panel de settings
11. `lib/actions/scraper.actions.ts` — agregar `importScrapedData` (depende de nodes.service + records.service)
12. Conectar `importResult()` en `useWebMigration` con el componente
13. "Ver en tablero": navegación post-import al canvas

---

## Decisiones de diseño

| Decisión | Razonamiento |
|----------|-------------|
| Todo dentro del modal de settings | Flujo puntual y esporádico — no justifica página dedicada |
| Server Actions para todas las llamadas | La API key nunca llega al cliente — mismo patrón que VPS key |
| Polling con `setInterval` (no SSE/WebSocket) | La API del scraper es REST pura, sin streaming; polling es suficiente |
| Intervalo de polling: 5s | Recomendación explícita del propio scraper (`cada 5-10 segundos`) |
| Parar polling en `done/failed/expired` | Evita llamadas inútiles post-completion |
| Fetch del result solo cuando `status === done` | `result` solo existe cuando `done` — 1 llamada puntual, no se pollea |
| 2 estrategias de importación predefinidas | Equilibrio entre flexibilidad y complejidad; mapping custom es v2 |
| `social_links` y `key_points` como string | Cartum no tiene campo `array` nativo — string JSON es el patrón existente |
| Mazo con prefijo `Business:` / `Pages:` | Distingue visualmente mazos importados en el tablero |
| `scraperApiKey` en settings DB | Configurable en runtime desde la UI — mismo patrón que `vpsApiKey` |
| Warning de TTL visible en resultado | Resultado expira en 15 min — el usuario necesita saber que debe importar pronto |
| Cancelación disponible durante scraping | El scraper soporta `DELETE {job_id}` — siempre ofrecer escape |
| Valores `null` → string vacío en records | Evita `null` en JSONB de records — consistente con el resto del CMS |

---

## Out of scope (v1)

- Descarga de imágenes scrapeadas a storage de Cartum (R2/Blob)
- Mapping custom de campos (drag-to-map UI)
- Múltiples jobs simultáneos
- Historial de migraciones pasadas
- Re-importación de un resultado ya importado
- Creación de vínculos (relaciones FK) entre mazos Business y Pages
- ZIP download del resultado del job
- Override manual de `llm_provider` / `llm_model` desde la UI

---

## Checklist pre-merge

### A. TypeScript strict
- [ ] `pnpm tsc --noEmit` — 0 errores
- [ ] Todos los tipos en `types/scraper.ts` — nunca inline en componentes
- [ ] Server Actions con tipo retorno explícito `Promise<ActionResult<T>>`
- [ ] `scraperService` sin `any` — tipado con tipos de `types/scraper.ts`

### B. API Key — nunca en cliente
- [ ] `scraperApiKey` y `scraperApiUrl` solo se leen en Server Actions
- [ ] Hook `useWebMigration` nunca recibe ni almacena la API key
- [ ] `ScraperSection` muestra el campo masked (`type="password"` con toggle) — no el valor raw

### C. Polling
- [ ] `useEffect` cleanup cancela el `setInterval` al desmontar
- [ ] Polling usa `startTransition` — no bloquea renders
- [ ] Polling para cuando `status` ∈ `['done', 'failed', 'expired']`
- [ ] Polling para al cancelar job o al desmontar componente

### D. UI — tokens del sistema
- [ ] Cero colores hex inline — solo tokens semánticos del sistema
- [ ] Tokens válidos: `bg-bg`, `bg-surface`, `bg-surface-2`, `bg-border`, `text-text`, `text-muted`, `text-primary`, `text-accent`, `text-success`, `text-danger`, `text-warning`
- [ ] Barra de progreso: fill `bg-primary`, track `bg-surface-2`, transición `duration-500`
- [ ] `<VHSTransition duration="fast">` en sub-secciones C/D/E/F al aparecer
- [ ] Transiciones entre sub-secciones con patrón `grid-rows-[0fr→1fr]` (igual que acordeones existentes)

### E. Arquitectura MVC
- [ ] `ScraperSection.tsx` — `'use client'`, solo UI + hook. Cero lógica directa
- [ ] `useWebMigration.ts` — toda la lógica, sin JSX
- [ ] `scraper.actions.ts` — `'use server'`, sin estado local
- [ ] `scraper.service.ts` — sin imports de Next.js (usable fuera de server actions)

### F. Locales
- [ ] Todos los strings via `t('webMigration.xxx')` — cero strings hardcodeados en componente
- [ ] Claves en `en.ts` Y `es.ts` — ambos archivos sincronizados

### G. Settings integration
- [ ] `ScraperSection` registrada en el panel de settings igual que otras secciones
- [ ] Keys en DB: `scraper_api_url`, `scraper_api_key`
- [ ] `getWebMigrationSettings` / `updateWebMigrationSettings` en `settings.actions.ts`

### H. Import correctness
- [ ] `importScrapedData` llama `nodes.service` con los tipos de campo correctos
- [ ] Valores `null` del scraper → `''` antes de crear records
- [ ] Mazo se crea antes que los records (orden de dependencia)
- [ ] Fallo en import retorna `ActionResult` con `success: false` — no rompe estado del CMS
- [ ] Si `strategy === 'business_only'` → solo 1 mazo creado (no se crea mazo Pages)
