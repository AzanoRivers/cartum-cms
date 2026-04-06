# Part 07 — UI Foundation: Design System Tokens & Brand

## Goal
Set up the design token system — `app/theme.css` becomes the single source of truth for all visual values (colors, radii, typography, easings, animations, keyframes). Configure `globals.css` with base styles and containment utilities. Set up brand assets and the root `<Layout>` metadata. Part 08 uses these tokens to build the actual UI components.

## Prerequisites
- Part 01 (TailwindCSS v4 installed, folder structure exists)

---

## Design Tokens — Sistema de Tokens

> **Regla de oro**: `app/theme.css` es la **única fuente de verdad** para todos los valores de diseño (colores, radios, tipografía, easings, animaciones). Ningún otro archivo contiene hex values ni define tokens. Sin excepciones.

---

### Por qué `@theme` y no `:root` o `tailwind.config.ts`

En Tailwind v4 **no existe `tailwind.config.ts` para tokens**. Todo va en CSS.

El bloque `@theme` hace dos cosas a la vez:
1. **Registra el token como CSS variable** → `--color-primary` queda disponible en `:root`
2. **Genera automáticamente las utility classes** → `bg-primary`, `text-primary`, `border-primary`, `ring-primary`, etc.

Eso significa que al definir `--color-bg` en `@theme`, Tailwind genera `bg-bg`, `text-bg` y `border-bg` sin configuración adicional. Las clases referencian internamente `var(--color-bg)`, por lo que cuando se cambia el tema y se sobreescribe `--color-bg` bajo `[data-theme="light"]`, todas las clases se adaptan automáticamente — cero JS extra.

```
@theme   → registra token + genera utility class (usa var(--token) internamente)
              ↓
[data-theme="X"] { --color-bg: #xxx }  → overrides la variable en CSS
              ↓
En el DOM, bg-bg, text-bg, etc. muestran el nuevo valor — sin tocar el HTML
```

---

### `/app/theme.css` — Fuente Única de Verdad

Este archivo centraliza absolutamente todo. Se importa en `globals.css`. **Nunca** definir tokens en otro lugar.

```css
/* app/theme.css */

/*
  ================================================================
  STEP 1 — @theme block
  Registra semantic tokens + define valores del tema dark (default).

  Namespaces Tailwind v4 usados:
   --color-*     → bg-*, text-*, border-*, ring-*, fill-*, etc.
   --font-*      → font-* (font-family utilities)
   --radius-*    → rounded-* (border-radius utilities)
   --ease-*      → ease-* (transition-timing utilities)
   --animate-*   → animate-* utilities (@keyframes van dentro del bloque)
  ================================================================
*/

@theme {
  /* Resetear paleta Tailwind por defecto.
     Cartum usa nombres semánticos, no de escala (red-500, blue-300).
     Se conservan blanco, negro y transparente. */
  --color-*:           initial;
  --color-white:       #ffffff;
  --color-black:       #000000;
  --color-transparent: transparent;

  /* === COLORES SEMÁNTICOS (dark theme — default) === */
  --color-bg:           #0a0a0f;   /* fondo global */
  --color-surface:      #111118;   /* cards, paneles */
  --color-surface-2:    #1a1a24;   /* hover states, inputs */
  --color-border:       #2a2a38;   /* líneas divisoras, bordes */
  --color-primary:      #6366f1;   /* acción principal */
  --color-primary-glow: #6366f140; /* glow con opacidad */
  --color-accent:       #22d3ee;   /* nodos activos, highlights */
  --color-text:         #e2e8f0;   /* texto principal */
  --color-muted:        #64748b;   /* texto secundario */
  --color-danger:       #ef4444;
  --color-success:      #22c55e;
  --color-warning:      #f59e0b;

  /* === TIPOGRAFÍA === */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* === RADIOS (reset + valores propios) === */
  --radius-*:   initial;
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;
  --radius-full: 9999px;

  /* === EASING (genera ease-spring, ease-out-expo, etc. como utilities) === */
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);  /* slight bounce */
  --ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);       /* fast decel */
  --ease-in-expo:   cubic-bezier(0.7, 0, 0.84, 0);        /* fast accel */
  --ease-fold:      cubic-bezier(0.32, 0.72, 0, 1);        /* panel slide */

  /* === ANIMACIONES (genera animate-* utilities + inlines @keyframes) === */
  --animate-panel-unfurl:   panel-unfurl    220ms var(--ease-spring)   both;
  --animate-panel-fold:     panel-fold      150ms var(--ease-in-expo)  both;
  --animate-sheet-up:       panel-slide-up  280ms var(--ease-fold)     both;
  --animate-sheet-down:     panel-slide-down 200ms var(--ease-in-expo) both;
  --animate-vhs:            vhs-entry       700ms var(--ease-out-expo) both;
  --animate-toast-in:       toast-vhs-in    400ms var(--ease-out-expo) both;
  --animate-skeleton:       skeleton-shimmer 1500ms ease infinite;

  @keyframes panel-unfurl {
    0%   { clip-path: inset(0 0 100% 0 round var(--radius-lg)); opacity: 0; transform: scale(0.96); }
    60%  { opacity: 1; clip-path: inset(0 0 4% 0 round var(--radius-lg)); }
    100% { clip-path: inset(0 0 0% 0 round var(--radius-lg)); opacity: 1; transform: scale(1); }
  }
  @keyframes panel-fold {
    0%   { clip-path: inset(0 0 0% 0 round var(--radius-lg)); opacity: 1; transform: scale(1); }
    100% { clip-path: inset(0 0 100% 0 round var(--radius-lg)); opacity: 0; transform: scale(0.96); }
  }
  @keyframes panel-slide-up {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes panel-slide-down {
    from { transform: translateY(0); }
    to   { transform: translateY(100%); }
  }
  @keyframes skeleton-shimmer {
    from { background-position: -200% 0; }
    to   { background-position: 200% 0; }
  }
  /* VHS keyframes — solo las transformaciones base (scanlines via CSS en el componente) */
  @keyframes vhs-glitch {
    0%, 100% { transform: translateX(0); }
    15%       { transform: translateX(-4px); }
    30%       { transform: translateX(3px); }
    45%       { transform: translateX(-2px); }
    60%       { transform: translateX(5px); }
    75%       { transform: translateX(-1px); }
  }
  @keyframes vhs-focus-in {
    from { filter: blur(6px) brightness(2); opacity: 0; }
    60%  { filter: blur(1px) brightness(1.2); opacity: 1; }
    to   { filter: blur(0) brightness(1); opacity: 1; }
  }
  @keyframes toast-vhs-in {
    0%   { opacity: 0; transform: translateX(16px) skewX(1deg); filter: brightness(2); }
    25%  { opacity: 1; filter: brightness(1.4); }
    65%  { transform: translateX(-2px) skewX(-0.3deg); }
    100% { transform: translateX(0) skewX(0); filter: brightness(1); }
  }
}

/*
  ================================================================
  STEP 2 — Theme overrides
  Solo se sobreescriben los valores de color.
  Las utility classes (bg-primary, text-muted…) se adaptan
  automáticamente — no se toca el HTML ni los componentes.
  ================================================================
*/

[data-theme="cyber-soft"] {
  --color-bg:           #0d1117;
  --color-surface:      #161b27;
  --color-surface-2:    #1c2333;
  --color-border:       #21293d;
  --color-primary:      #818cf8;
  --color-primary-glow: #818cf820;
  --color-accent:       #38bdf8;
  --color-text:         #c9d1d9;
  --color-muted:        #58677b;
  --color-danger:       #f87171;
  --color-success:      #4ade80;
  --color-warning:      #fbbf24;
}

[data-theme="light"] {
  --color-bg:           #f8fafc;
  --color-surface:      #ffffff;
  --color-surface-2:    #f1f5f9;
  --color-border:       #e2e8f0;
  --color-primary:      #6366f1;
  --color-primary-glow: #6366f130;
  --color-accent:       #0ea5e9;
  --color-text:         #0f172a;
  --color-muted:        #64748b;
  --color-danger:       #dc2626;
  --color-success:      #16a34a;
  --color-warning:      #d97706;
}
```

---

### `/app/globals.css` — Solo imports y estilos globales

`globals.css` **no define tokens**. Solo importa, aplica base styles y declara las vars de duración (que no generan utilities en TW v4 y no son temables).

```css
/* app/globals.css */
@import "tailwindcss";
@import "./theme.css";

/* === DURATION SCALE (plain CSS vars — no Tailwind namespace) === */
:root {
  --dur-micro:   80ms;
  --dur-fast:    150ms;
  --dur-normal:  220ms;
  --dur-medium:  300ms;
  --dur-slow:    500ms;
  --dur-vhs:     700ms;
}

/* === BASE STYLES === */
body {
  @apply bg-bg text-text font-sans;
}

/* === THEME COLOR TRANSITION (CSS-only — zero JS) ===
   background-color y color son solo Paint — sin layout recalc. */
*, *::before, *::after {
  transition:
    background-color var(--dur-medium) var(--ease-out-expo),
    border-color     var(--dur-medium) var(--ease-out-expo),
    color            var(--dur-medium) var(--ease-out-expo);
}
/* Excluir elementos con sus propias transiciones */
.vhs-transition, canvas, .no-theme-transition {
  transition: none !important;
}

/* === REDUCED MOTION ===
   0.01ms preserva eventos animationend para cleanup hooks */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration:        0.01ms !important;
    animation-iteration-count: 1      !important;
    transition-duration:       0.01ms !important;
  }
  .vhs-transition { animation: none !important; filter: none !important; }
}

/* === CSS CONTAINMENT UTILITIES === */
.contain-panel  { contain: layout style paint; }
.contain-card   { contain: layout style; }
.contain-strict { contain: strict; }
```

---

### Tabla de Tokens → Utility Classes

| Token en `@theme`       | Clases Tailwind generadas                          |
|-------------------------|----------------------------------------------------|
| `--color-bg`            | `bg-bg`, `text-bg`, `border-bg`, `ring-bg`          |
| `--color-surface`       | `bg-surface`, `border-surface`, ...                |
| `--color-surface-2`     | `bg-surface-2`, ...                                |
| `--color-border`        | `border-border`, `divide-border`, ...              |
| `--color-primary`       | `bg-primary`, `text-primary`, `border-primary`, ... |
| `--color-accent`        | `bg-accent`, `text-accent`, ...                    |
| `--color-text`          | `text-text`, ...                                   |
| `--color-muted`         | `text-muted`, `bg-muted`, ...                      |
| `--color-danger`        | `bg-danger`, `text-danger`, ...                    |
| `--color-success`       | `bg-success`, `text-success`, ...                  |
| `--font-mono`           | `font-mono`                                        |
| `--font-sans`           | `font-sans`                                        |
| `--radius-sm/md/lg/xl`  | `rounded-sm`, `rounded-md`, `rounded-lg`, ...      |
| `--ease-spring`         | `ease-spring`                                      |
| `--ease-out-expo`       | `ease-out-expo`                                    |
| `--animate-panel-unfurl`| `animate-panel-unfurl`                             |
| `--animate-vhs`         | `animate-vhs`                                      |

---

### Regla absoluta — Tailwind primero, cero `style={}`

> Esta regla aplica a **todo** componente en Cartum, sin excepción.

```tsx
// ✅ CORRECTO — solo clases Tailwind
<div className="bg-surface border border-border rounded-lg p-4 text-text">
  <span className="text-muted font-mono text-sm">campo</span>
</div>

// ❌ INCORRECTO — inline style con var
<div style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

// ❌ INCORRECTO — valor hardcodeado en clase arbitraria
<div className="bg-surface">

// ❌ INCORRECTO — className dinámico con template literal de hex
<div className={`bg-[${theme.surface}]`}>
```

**La única excepción permitida**: propiedades CSS que no tienen utility en Tailwind (ej. `clip-path` complejo durante animación JS en tiempo real). En ese caso se aplica via `ref.current.style` — nunca en el JSX estático.

---

## Brand Assets & Favicon

### Archivos de origen (raíz del repositorio)

Los siguientes archivos viven en la raíz durante la fase de planificación. Al crear la arquitectura se mueven a sus rutas definitivas:

| Archivo origen | Destino | Uso |
|---|---|---|
| `icon.svg` | `app/icon.svg` | Favicon automático — Next.js sirve `/favicon.svg` |
| `azanolabs-logo-1000.png` | `public/images/brand/logo-1000.png` | OG Image, splash screens |
| `azanolabs-logo-500.png` | `public/images/brand/logo-500.png` | Uso general (versión con glow neon) |
| `azanolabs-logo-500-dark.png` | `public/images/brand/logo-dark.png` | Sidebar en tema `dark` / `cyber-soft` |
| `azanolabs-logo-500-light.png` | `public/images/brand/logo-light.png` | Sidebar en tema `light` |

> **Nunca** importar estos archivos desde la raíz del repo en el código. Solo sus rutas en `app/` o `public/` son válidas.

### Next.js App Router — Favicon automático

Next.js App Router detecta automáticamente `app/icon.svg` como favicon sin configuración extra:
- Ruta servida: `/favicon.svg`
- No se necesita `<link rel="icon">` manual en `layout.tsx`
- Para Apple Touch Icon: agregar `app/apple-icon.png` (usar `public/images/brand/logo-500.png` redimensionado a 180×180)

### `app/layout.tsx` — Metadata con OG Image

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Cartum CMS', template: '%s — Cartum' },
  description: 'Serverless-first headless CMS with visual data modeling',
  icons: {
    icon: '/favicon.svg',
    apple: '/images/brand/apple-icon.png',
  },
  openGraph: {
    title: 'Cartum CMS',
    description: 'Serverless-first headless CMS with visual data modeling',
    images: [{ url: '/images/brand/logo-1000.png', width: 1000, height: 1000 }],
    type: 'website',
  },
}
```

### Logo en Sidebar

El componente `Sidebar` (organism) renderiza el logo adaptado al tema activo:

```tsx
// components/ui/organisms/Sidebar.tsx — usar next/image, nunca <img>
import Image from 'next/image'

function SidebarLogo() {
  const { theme } = useThemeStore()
  const src = theme === 'light'
    ? '/images/brand/logo-light.png'
    : '/images/brand/logo-dark.png'

  return (
    <Image
      src={src}
      alt="Cartum"
      width={32}
      height={32}
      priority
      className="h-8 w-8 object-contain"
    />
  )
}
```

---

## Acceptance Criteria

- [x] `app/theme.css` es la única fuente de verdad: nada de hex values en otros archivos
- [x] Todos los tokens del `@theme` generan utility classes correctas (`bg-primary`, `text-muted`, `rounded-lg`, `ease-spring`, etc.)
- [x] All CSS tokens in `theme.css` are accessible as Tailwind classes (`bg-surface`, `text-muted`, `border-border`, etc.)
- [x] `app/icon.svg` is recognized as favicon by Next.js App Router (served at `/favicon.svg`)
- [x] `public/images/brand/` folder contains the 4 logo variants (logo-dark.png, logo-light.png, logo-500.png, logo-1000.png)
- [x] `app/layout.tsx` exports correct `metadata` object with `icons` and `openGraph` configured
- [x] Cero `style={{ color: '...' }}` o `bg-[#hex]` en archivos de componentes — solo utility classes de los tokens
