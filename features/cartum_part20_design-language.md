# Part 20 — Theme System

## Goal
Implement the three-theme system (dark / cyber-soft / light) for Cartum — flash-free server-side hydration, instant client-side switching, and persistence via DB. Add the "Appearance" section to the Settings panel (Part 17). Implement the DB column, Server Action, and service for theme management.

## Prerequisites
- Part 07 (design tokens: `app/theme.css` must have `[data-theme]` override blocks already defined)
- Part 08 (UI atoms — ThemeSwatch uses Button + Icon atoms)
- Part 09 (useUIStore — extended with theme slice)
- Part 17 (Settings panel — gains the "Appearance" tab)

---

## 1. Theme System

### 1.1 Three Themes — Referencia de Colores

> **Nota**: los bloques completos `@theme` y `[data-theme]` están **consolidados en `app/theme.css`** (definido en Part 07). Este documento solo sirve de referencia visual rápida. **No duplicar estas variables en ningún otro archivo.**

| Token | `dark` | `cyber-soft` | `light` |
|---|---|---|---|
| `--color-bg` | `#0a0a0f` | `#0d1117` | `#f8fafc` |
| `--color-surface` | `#111118` | `#161b27` | `#ffffff` |
| `--color-surface-2` | `#1a1a24` | `#1c2333` | `#f1f5f9` |
| `--color-border` | `#2a2a38` | `#21293d` | `#e2e8f0` |
| `--color-primary` | `#6366f1` | `#818cf8` | `#6366f1` |
| `--color-primary-glow` | `#6366f140` | `#818cf820` | `#6366f130` |
| `--color-accent` | `#22d3ee` | `#38bdf8` | `#0ea5e9` |
| `--color-text` | `#e2e8f0` | `#c9d1d9` | `#0f172a` |
| `--color-muted` | `#64748b` | `#58677b` | `#64748b` |
| `--color-danger` | `#ef4444` | `#f87171` | `#dc2626` |
| `--color-success` | `#22c55e` | `#4ade80` | `#16a34a` |
| `--color-warning` | `#f59e0b` | `#fbbf24` | `#d97706` |

**Conceptos de cada tema:**
- **`dark`** — Deep cyberpunk. Fondo casi negro con tinte azul. Máximo contraste, intensidad total.
- **`cyber-soft`** — Azul-gris profundo, primario índigo suavizado, acento sky. Pro mode, menos agresivo.
- **`light`** — Slate claro/blanco. Misma paleta primaria para consistencia de marca. Entornos brillantes.

---

### 1.2 Arquitectura de Tokens con Tailwind v4 `@theme`

#### Cómo funciona (en un párrafo)

En Tailwind v4, un token definido en `@theme` hace **dos cosas a la vez**: crea la CSS variable en `:root` **y** genera automáticamente todas las utility classes que la usan. Por eso `--color-primary` en `@theme` da acceso a `bg-primary`, `text-primary`, `border-primary`, `ring-primary`, etc. — sin `tailwind.config.ts`, sin mapping manual.

Cuando `[data-theme="light"]` sobreescribe `--color-bg: #f8fafc`, todas las clases `bg-bg` en el DOM reflejan el nuevo valor **sin tocar HTML ni componentes**.

```
app/theme.css
│
├── @theme { --color-bg: #0a0a0f; ... }   ← registra token + genera bg-bg, text-bg...
│                                              valores = dark theme (default)
└── [data-theme="cyber-soft"] {           ← solo sobreescribe los valores
      --color-bg: #0d1117;               ← bg-bg ahora usa este color en ese contexto
    }
```

#### Qué va en cada lugar (tabla definitiva)

| Qué | Dónde | Por qué |
|---|---|---|
| Tokens semánticos de color | `app/theme.css` — dentro de `@theme` | Genera utility classes automáticamente |
| Overrides por tema | `app/theme.css` — bajo `[data-theme="X"]` | CSS variable override que TW recoge |
| Animations `@keyframes` | `app/theme.css` — dentro de `@theme` junto a `--animate-*` | Se incluyen en el CSS de salida solo si el token se usa |
| Easing curves | `app/theme.css` — `--ease-*` en `@theme` | Genera `ease-spring`, `ease-out-expo` como utilities |
| Duration scale (`--dur-*`) | `app/globals.css` — en `:root` | No necesitan utility class — se usan en `@keyframes` directamente |
| Color theme transition global | `app/globals.css` | Estilo base, no token |
| `reduced-motion`, containment utils | `app/globals.css` | Estilos base globales |
| Hex values, colores concretos | **Solo** `app/theme.css` | Fuente única de verdad |
| Colors en componentes | **Nunca hex** — solo clases Tailwind | `bg-primary`, `text-muted`, `border-border` |

#### Regla de component authoring (Tailwind-first, non-negotiable)

```tsx
// ✅ Correcto — Tailwind tokens del @theme
<div className="bg-surface border border-border rounded-lg p-4">
  <p className="text-text font-sans">Contenido</p>
  <span className="text-muted font-mono text-xs">ID: {id}</span>
  <button className="bg-primary text-white rounded-md px-4 py-2 hover:brightness-110
                     transition-colors ease-out-expo duration-150">
    Guardar
  </button>
</div>

// ❌ Incorrecto — inline style con variable
<div style={{ backgroundColor: 'var(--color-surface)' }}>

// ❌ Incorrecto — valor hardcodeado en clase arbitraria
<div className="bg-surface">

// ❌ Incorrecto — string interpolation con hex
<div className={`bg-[${colors.surface}]`}>
```

**Excepción legítima**: `ThemeSwatch` muestra los colores de *otros temas* (no el activo). Para ese caso específico, inline style con los valores del `THEMES` constant es correcto — son datos de visualización, no estilo de chrome:

```tsx
// ThemeSwatch.tsx — EXCEPCIÓN JUSTIFICADA
// Los hex vienen del array THEMES en types/theme.ts (datos, no estilos)
<div style={{ backgroundColor: theme.preview.bg }}>
  <div style={{ backgroundColor: theme.preview.surface }} />
</div>
```

---

### 1.3 Flash-Free Server Hydration

Theme is stored in the DB `project_settings` table and read server-side in the root layout:

```tsx
// app/layout.tsx (Server Component)
import { getTheme } from '@/lib/services/settings.service'

export default async function RootLayout({ children }) {
  const theme = await getTheme()      // DB read, returns 'dark' | 'cyber-soft' | 'light'
  return (
    <html lang="en" data-theme={theme}>
      <body>
        {/* ... */}
      </body>
    </html>
  )
}
```

Client-side theme switching happens by mutating `document.documentElement.dataset.theme` + triggering the Server Action to persist. The CSS variable transition (Section 4.5) ensures a smooth cross-fade with zero FOUC.

---

### 1.4 Theme Transition (CSS-only, zero JS)

Cuando `data-theme` cambia, todos los colores hacen cross-fade suavemente. El CSS está en `app/globals.css` (definido en Part 07):

```css
/* Ya incluido en globals.css — no duplicar */
*, *::before, *::after {
  transition:
    background-color var(--dur-medium) var(--ease-out-expo),
    border-color     var(--dur-medium) var(--ease-out-expo),
    color            var(--dur-medium) var(--ease-out-expo);
}
.vhs-transition, canvas, .no-theme-transition { transition: none !important; }
```

**Por qué es seguro hacerlo global**: `background-color` y `color` solo disparan la fase *Paint* (no Layout). En hardware medio, una transición de color sobre toda la app cuesta ~0.5ms de frame. El costo visual supera con creces ese número.

**Por qué no `fill` y `stroke`**: Los iconos SVG en Cartum usan `currentColor` — se animan vía `color`. Agregar `fill` y `stroke` a la regla global causaría falsas transiciones en SVGs animados del board.

---

### 1.5 TypeScript Types

```ts
// types/theme.ts
export type ThemeId = 'dark' | 'cyber-soft' | 'light'

export interface ThemeDefinition {
  id:          ThemeId
  label:       string        // Display name in settings
  description: string        // One-line pitch
  // preview: valores hex para el mini-swatch en ThemeSwatch.
  // Son DATOS (representan otros temas), no estilos del chrome actual.
  // Único lugar válido para hex values fuera de theme.css.
  preview: {
    bg:      string
    surface: string
    primary: string
    accent:  string
  }
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'dark',
    label: 'Dark',
    description: 'Deep cyberpunk — maximum contrast, full intensity.',
    preview: { bg: '#0a0a0f', surface: '#111118', primary: '#6366f1', accent: '#22d3ee' },
  },
  {
    id: 'cyber-soft',
    label: 'Cyber Soft',
    description: 'Muted deep blue — focused, professional, less aggressive.',
    preview: { bg: '#0d1117', surface: '#161b27', primary: '#818cf8', accent: '#38bdf8' },
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Clean slate — full contrast for bright environments.',
    preview: { bg: '#f8fafc', surface: '#ffffff', primary: '#6366f1', accent: '#0ea5e9' },
  },
]
```

---

### 1.6 Settings Panel — "Appearance" Section (extends Part 16)

Part 17 defines 6 sections. Add a 7th: **Appearance**. Insert between “Project” and “Storage” in the tab list.

**UI: Theme Picker**

```
┌─────────────────────────────────────────────────────┐
│  Appearance                                          │
│  ──────────────────────────────────────────────     │
│  Theme                                               │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  ██████  │  │  ██████  │  │  □□□□□□  │           │
│  │  ██████  │  │  ██████  │  │  □□□□□□  │           │
│  │  ● Dark  │  │  Cyber   │  │  Light   │           │
│  │  ✓ active│  │  Soft    │  │          │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│                                                      │
│  Deep cyberpunk — maximum contrast, full intensity.  │
└─────────────────────────────────────────────────────┘
```

Each card is a `ThemeSwatch` molecule:

```tsx
// components/ui/molecules/ThemeSwatch.tsx
'use client'
// Small preview card:
// - Top 60%: mini mock of bg/surface/border colors (pure CSS, no canvas)
// - Bottom 40%: theme name + description
// - Active state: primary-colored border + checkmark badge
// - Hover: scale(1.02) — 120ms ease
// - onClick: immediately applies data-theme client-side + debounced Server Action save
```

**Immediate client-side apply (no loading state needed for the color switch):**

```ts
// lib/hooks/useTheme.ts
export function useTheme() {
  const applyTheme = (theme: ThemeId) => {
    document.documentElement.dataset.theme = theme
    // fire-and-forget persist — user sees change instantly
    void updateAppearanceSettings({ theme })
  }
  return { applyTheme }
}
```

---


## 4. Appearance Settings — Server Action & DB

### 4.1 DB Field

The `project_settings` table (defined in Part 02) gains a `theme` column:

```ts
// db/schema/settings.ts (amendment)
theme: text('theme').notNull().default('dark')
  .$type<ThemeId>()
```

### 4.2 Server Action

```ts
// lib/actions/settings.actions.ts (new export)
export async function updateAppearanceSettings(
  input: { theme: ThemeId }
): Promise<ActionResult> {
  // 1. Validate: input.theme must be in ['dark', 'cyber-soft', 'light']
  // 2. requireRole('editor') — only editors+ can change theme
  // 3. Drizzle update: project_settings.theme
  // 4. revalidatePath('/') — root layout will re-read theme on next RSC render
  //    (this affects SSR for next page load; client already applied it immediately)
}
```

### 4.3 `getTheme` Service

```ts
// lib/services/settings.service.ts (new export)
export async function getTheme(): Promise<ThemeId> {
  const settings = await db.query.projectSettings.findFirst({
    columns: { theme: true },
  })
  return (settings?.theme as ThemeId) ?? 'dark'
}
```

---

## New Files to Create

```
types/
  theme.ts                    <- ThemeId, ThemeDefinition, THEMES constant

components/ui/molecules/
  ThemeSwatch.tsx             <- theme preview card for settings

lib/hooks/
  useTheme.ts                 <- client-side theme switch + persist

lib/actions/
  settings.actions.ts         <- updateAppearanceSettings() export

lib/services/
  settings.service.ts         <- getTheme() export
```

**Amended files:**
- `db/schema/settings.ts` — add `theme` column to `project_settings`
- `app/theme.css` — theme override blocks for `[data-theme="cyber-soft"]` and `[data-theme="light"]`

---

## Acceptance Criteria

- [ ] `<html data-theme="dark">` is present in the DOM before first paint, set server-side
- [ ] Switching theme in Settings applies the color change within 50ms on screen (immediate client mutation)
- [ ] Theme persists after page reload (DB-backed)
- [ ] All 3 themes pass WCAG AA contrast ratio for text/bg combinations
- [ ] Theme cross-fade animation runs without jank on mid-range mobile (60fps verified in DevTools)
- [ ] ThemeSwatch preview cards show correct colors for each theme without using style={{}} — static hex only in THEMES constant
- [ ] `updateAppearanceSettings` validates that input.theme is a valid ThemeId before DB write
