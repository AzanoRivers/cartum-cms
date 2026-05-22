# iOS Safari Compatibility — Guía de Estándares

Aplica a proyectos con: **Astro**, **Next.js**, **React**, **Tailwind CSS v3/v4**.
Síntoma clásico: página en blanco en iPhone, funciona en Android y desktop.

---

## 1. Causa raíz más común — Página en blanco

### `overflow-x: clip` — NO soportado en iOS Safari < 16

```css
/* ❌ Rompe render en iOS Safari < 16 */
html, body { overflow-x: clip; }

/* ✅ Siempre usar esto */
html, body { overflow-x: hidden; }
```

> `clip` no genera scrollbar igual que `hidden`, pero en iOS el browser lo ignora o rompe el layout completo. `hidden` es funcionalmente equivalente para el 99% de los casos.

---

## 2. `backdrop-filter` — Requiere prefijo `-webkit-`

iOS Safari requiere prefijo hasta versiones recientes.

### En CSS / archivos `.css`, `.astro`, `.module.css`

```css
/* ❌ */
.elemento { backdrop-filter: blur(10px); }

/* ✅ */
.elemento {
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
```

### En React inline styles (`.tsx`, `.jsx`)

El build **NO autoprefija inline styles**. Hay que hacerlo manualmente:

```tsx
/* ❌ */
style={{ backdropFilter: 'blur(16px)' }}

/* ✅ */
style={{ WebkitBackdropFilter: 'blur(16px)', backdropFilter: 'blur(16px)' }}
```

### En Tailwind CSS

Tailwind genera `backdrop-blur-*` → agrega ambos prefijos automáticamente via Lightning CSS (v4) o autoprefixer (v3). Usar clases de Tailwind es preferible a inline styles por esta razón.

---

## 3. `clip-path` — Prefijo `-webkit-` para animaciones

En iOS Safari antiguo, `clip-path` animado puede fallar sin prefijo:

```css
/* ❌ */
clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);

/* ✅ */
-webkit-clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
```

---

## 4. `100vh` — Comportamiento distinto en iOS

iOS Safari incluye la barra de dirección en `100vh`. Al hacer scroll la barra se oculta, causando layout shift.

```css
/* ⚠️ Puede causar overflow/shift en iOS */
height: 100vh;
min-height: 100vh;

/* ✅ Para iOS 15.4+ */
height: 100dvh; /* dynamic viewport height */

/* ✅ Para compatibilidad amplia */
min-height: 100vh;  /* fallback */
min-height: 100dvh; /* override donde sea soportado */
```

> Sidebars y elementos `hidden lg:block` (solo desktop) → no afectan móvil, dejar con `100vh`.

---

## 5. Inputs — Auto-zoom en iOS

iOS Safari hace zoom automático en inputs con `font-size < 16px`.

```css
/* ❌ Activa auto-zoom en iOS */
input { font-size: 14px; }

/* ✅ Sin auto-zoom */
input { font-size: 16px; }
```

En Tailwind: inputs deben tener al menos `text-base` (16px). `text-sm` (14px) en un `<input>` dispara zoom.

---

## 6. `position: sticky` — No funciona dentro de `overflow: hidden`

```css
/* ❌ sticky no funciona si padre tiene overflow: hidden */
.parent { overflow: hidden; }
.child  { position: sticky; top: 0; }

/* ✅ Padre con overflow: auto o visible */
.parent { overflow: auto; }
.child  { position: sticky; top: 0; }
```

---

## 7. `user-select: none`

### En CSS / Tailwind (`select-none`)
Tailwind v4 con Lightning CSS y Tailwind v3 con autoprefixer → autoprefixan automáticamente. Sin acción.

### En React inline styles
```tsx
/* ❌ */
style={{ userSelect: 'none' }}

/* ✅ */
style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
```

---

## 8. `@keyframes` y `animation`

iOS Safari 12+ soporta sintaxis estándar. **No se necesitan prefijos** `-webkit-animation` ni `@-webkit-keyframes` en proyectos modernos.

---

## 9. `overscroll-behavior`

No soportado en iOS Safari. Ignorado silenciosamente — no rompe nada, pero el efecto no aplica.

---

## Checklist rápido para nuevo proyecto

```
[ ] overflow-x: hidden (nunca clip) en html y body
[ ] -webkit-backdrop-filter en todo uso de backdrop-filter en CSS
[ ] WebkitBackdropFilter en todo inline style de React con backdrop-filter
[ ] -webkit-clip-path en clip-path animados
[ ] inputs con font-size >= 16px (text-base en Tailwind)
[ ] position: sticky no tiene padre con overflow: hidden
[ ] 100dvh para elementos full-height en móvil (iOS 15.4+)
[ ] WebkitUserSelect en inline styles con userSelect: none
```

---

## Propiedades seguras — No requieren acción

| Propiedad | Soporte iOS |
|---|---|
| `gap` en flexbox | iOS 14.5+ ✅ |
| `aspect-ratio` | iOS 15+ ✅ |
| CSS Grid | iOS 10.3+ ✅ |
| `transform`, `transition` | iOS 9+ ✅ |
| `filter: drop-shadow()` | iOS 9+ ✅ |
| `object-fit` | iOS 10+ ✅ |
| CSS Custom Properties | iOS 9.3+ ✅ |
| `IntersectionObserver` | iOS 12.2+ ✅ |
| `ResizeObserver` | iOS 13.4+ ✅ |
| `@keyframes` (sin prefijo) | iOS 9+ ✅ |
| `scrollbar-width` | Firefox only, ignorado en iOS sin daño ✅ |

---

## Nota sobre `build.target` y `browserslist`

### `build.target: 'es2018'` en Vite — ⚠️ No recomendado con React 18+

Vite **no transpila `node_modules`** (React, Next.js, etc.). Solo transpila tu código.
React 18+ y React 19 usan internamente `?.`, `??`, y otras features ES2020+ — si el
browser no las soporta, falla de todas formas aunque tu código esté en ES2018.
Bajar el target puede generar bundles más grandes sin resolver el problema real.

**Conclusión: No agregar. El problema de iOS era CSS, no JS.**

### `browserslist` — Solo para CSS autoprefixing

| Framework | Efecto |
|---|---|
| Tailwind v3 + autoprefixer | Lee browserslist → agrega prefijos CSS automáticamente |
| Tailwind v4 + Lightning CSS | Lee browserslist → agrega prefijos CSS automáticamente |
| Vite `build.target` JS | **No** usa browserslist — son configuraciones separadas |

Si agregas browserslist, solo afecta CSS. No toca JS ni node_modules.
Útil si quieres autoprefixing automático en lugar de agregar `-webkit-` manualmente.

```json
"browserslist": [
  "defaults",
  "not IE 11",
  "ios >= 12",
  "safari >= 12"
]
```

> Con React 19 o Next.js 14+: agregar `browserslist` es seguro para CSS.
> **No** combinar con `build.target: 'es2018'` — eso sí puede romper React 19.
