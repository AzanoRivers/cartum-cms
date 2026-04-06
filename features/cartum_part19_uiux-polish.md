# Part 19 — UI/UX Polish

## Goal
Final refinement pass across the entire Cartum UI. VHS transition fine-tuning, keyboard navigation, loading skeleton states, canvas performance, empty states, accessible focus management, and interaction micro-details. This part has no new features — only quality improvements.

## Prerequisites
- All previous parts (01–17) must be complete before this pass begins

---

## 1. VHS Transition Refinements

### Final keyframe set

```css
/* globals.css */

/* ─── Full VHS (600–800ms) — page transitions ─── */
@keyframes vhs-full-scan {
  0%   { opacity: 0; }
  5%   { opacity: 1; }
  100% { opacity: 1; }
}

@keyframes vhs-full-rgb {
  0%   { filter: blur(2px) brightness(1.6); text-shadow: 2px 0 0 rgba(255,0,0,.5), -2px 0 0 rgba(0,255,255,.5); }
  30%  { filter: blur(0.5px) brightness(1.1); text-shadow: 1px 0 0 rgba(255,0,0,.2), -1px 0 0 rgba(0,255,255,.2); }
  60%  { filter: none; text-shadow: none; }
  100% { filter: none; text-shadow: none; }
}

@keyframes vhs-full-glitch {
  0%   { transform: translateX(0); }
  10%  { transform: translateX(-4px); }
  20%  { transform: translateX(3px); }
  30%  { transform: translateX(-2px); }
  40%  { transform: translateX(1px); }
  50%  { transform: translateX(0); }
  100% { transform: translateX(0); }
}

.vhs-full {
  animation:
    vhs-full-scan 0.7s ease-out forwards,
    vhs-full-rgb 0.7s ease-in-out forwards,
    vhs-full-glitch 0.5s steps(1) forwards;
}

/* Scanline overlay via pseudo-element on parent */
.vhs-full::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 3px,
    rgba(0,0,0,0.08) 3px,
    rgba(0,0,0,0.08) 4px
  );
  pointer-events: none;
  animation: fade-scanlines 0.6s ease-out forwards;
  z-index: 1;
}

@keyframes fade-scanlines {
  0%   { opacity: 1; }
  70%  { opacity: 0.3; }
  100% { opacity: 0; }
}

/* ─── Panel VHS (300–400ms) — modals, drawers ─── */
.vhs-panel {
  animation:
    vhs-full-rgb 0.35s ease-in-out forwards,
    vhs-full-glitch 0.3s steps(1) forwards;
}

/* ─── Toast VHS (200ms) — alerts ─── */
@keyframes toast-in {
  0%   { opacity: 0; transform: translateX(12px) skewX(1deg); filter: brightness(2); }
  20%  { opacity: 1; filter: brightness(1.4); }
  60%  { transform: translateX(-2px) skewX(-0.5deg); }
  100% { transform: translateX(0) skewX(0); filter: brightness(1); }
}

.toast-enter {
  animation: toast-in 200ms ease-out forwards;
}
```

### VHSTransition component update

```tsx
// components/ui/transitions/VHSTransition.tsx
'use client'
type VHSVariant = 'full' | 'panel' | 'toast'

interface VHSTransitionProps {
  children: React.ReactNode
  trigger?: unknown         // change triggers re-animation
  variant?: VHSVariant
  className?: string
}
```

Re-triggering: when `trigger` prop changes, unmount and remount children via key to replay the animation.

---

## 2. Keyboard Navigation

### Global shortcuts

| Key | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open command palette (future — stub now with empty panel) |
| `Esc` | Close active modal, panel, or drawer |
| `G then H` | Go to Home (sequence style, 350ms window) |
| `G then S` | Go to Schema board |
| `G then C` | Go to Content |
| `G then ,` | Open Settings |

```ts
// lib/hooks/useKeyboardShortcuts.ts
'use client'
// Listen to keydown on document
// Esc → close any open overlay (settings, modals, bottom sheets)
// G sequences → use a small state machine with 350ms timeout reset
```

### Focus trap for modals/panels

```ts
// lib/hooks/useFocusTrap.ts
// On mount: save previously focused element
// Tab/Shift+Tab cycles within the container
// On unmount: restore focus to previously focused element
```

Apply to: `SettingsPanel`, all modals, `BottomSheet` on mobile.

### Focus visible styles

```css
/* globals.css */
/* Remove browser default outline, replace with system-consistent one */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Skip-to-content link (visually hidden until focused) */
.skip-link {
  position: absolute;
  left: -9999px;
  z-index: 9999;
}
.skip-link:focus {
  left: 1rem;
  top: 1rem;
}
```

---

## 3. Loading Skeleton States

Every view that loads async data must show a skeleton before data is ready. Use Server Components with `<Suspense>` boundaries.

### `Skeleton` atom

```tsx
// components/ui/atoms/Skeleton.tsx
import { cva } from 'class-variance-authority'

const skeletonVariants = cva(
  'animate-pulse rounded bg-surface-2',
  {
    variants: {
      size: {
        sm:   'h-4',
        md:   'h-6',
        lg:   'h-10',
        full: 'h-full',
      },
    },
    defaultVariants: { size: 'md' },
  }
)
```

### Skeleton components per view

```
NodeCardSkeleton       → placeholder node card (rect + 2 lines)
RecordListSkeleton     → 5 placeholder record rows
RecordFormSkeleton     → label + input × fields count
SettingsSectionSkeleton → label + input × 3
```

### Suspense boundary placement

```tsx
// Example: board page
<Suspense fallback={<NodeBoardSkeleton />}>
  <InfiniteCanvas parentNodeId={nodeId} />
</Suspense>
```

All Server Component data fetches must be wrapped with `Suspense` from the parent page.

---

## 4. Canvas Performance

The infinite canvas can have many nodes. Optimizations:

### Off-screen culling

Do not render nodes outside the visible viewport + a 200px buffer zone:

```ts
// lib/hooks/useVisibleNodes.ts
// Takes: nodes[], canvasOffset (x, y), viewportSize (w, h)
// Returns: visible nodes (with 200px buffer)
// Runs in useMemo — recomputes on scroll
```

### Canvas pan throttle

`mousemove` pan handler must be throttled to 60fps:

```ts
import { throttle } from '@/lib/utils/throttle'
const handleMouseMove = throttle((e: MouseEvent) => { /* pan logic */ }, 16)
```

### SVG connection layer

The `<svg>` element rendering rope connections must use `pointer-events: none` and be rendered on a separate layer from node cards (positioned behind cards via z-index).

### Node card memoization

```tsx
const NodeCard = memo(NodeCardInner, (prev, next) => {
  return prev.node.id === next.node.id &&
    prev.node.name === next.node.name &&
    prev.node.positionX === next.node.positionX &&
    prev.node.positionY === next.node.positionY &&
    prev.isSelected === next.isSelected
})
```

---

## 5. Empty States

Every list view needs an empty state component with an icon, a message, and (where appropriate) a CTA.

```tsx
// components/ui/molecules/EmptyState.tsx
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}
```

| View | Empty state |
|---|---|
| Node board (no nodes) | `+` icon, "No nodes yet. Create your first one." + CTA |
| Record list (no records) | Paper icon, "No records yet." + New record CTA |
| Users list | People icon, "No users yet." + Invite CTA |
| Roles list | Badge icon, "No custom roles." + New role CTA |
| API tokens | Key icon, "No tokens yet." + New token CTA |

---

## 6. Sonner Toast — Custom Animation via `classNames`

Sonner v2 exposes `classNames` on `<Toaster />` for full CSS control. The VHS entry animation is applied via the `toast` class name:

```css
/* globals.css */
@keyframes toast-vhs-in {
  0%   { opacity: 0; transform: translateX(16px) skewX(1deg); filter: brightness(2); }
  25%  { opacity: 1; filter: brightness(1.4); }
  65%  { transform: translateX(-2px) skewX(-0.3deg); }
  100% { transform: translateX(0) skewX(0); filter: brightness(1); }
}
```

In the `<Toaster>` config (root layout):
```tsx
toastOptions={{
  classNames: {
    toast: 'font-mono text-sm border bg-surface border-border [animation:toast-vhs-in_200ms_ease-out_forwards]',
    // ...other classNames
  },
}}
```

This runs on **every** new toast automatically — no mount/unmount tracking needed. For `prefers-reduced-motion`, override:
```css
@media (prefers-reduced-motion: reduce) {
  [data-sonner-toast] { animation: none !important; }
}
```

---

## 7. Color Contrast Audit

All text/background color combinations must meet WCAG AA (4.5:1 for normal text, 3:1 for large):

| Combination | Contrast | Status |
|---|---|---|
| `--text` (#e2e8f0) on `--background` (#0a0a0f) | ~16:1 | ✓ |
| `--text-muted` (#64748b) on `--surface` (#111118) | ~4.5:1 | ✓ (borderline) |
| `--primary` (#6366f1) on `--surface` (#111118) | ~4.8:1 | ✓ |
| `--danger` (#ef4444) on `--surface` (#111118) | ~4.6:1 | ✓ |
| `--accent` (#22d3ee) on `--background` (#0a0a0f) | ~10:1 | ✓ |

If `--text-muted` fails in practice at certain font sizes, bump it to `#8896a8`.

---

## 8. ARIA Labels & Roles

All interactive elements without visible text labels must have `aria-label`:

```tsx
// DockBar button
<button aria-label="Open settings"><SettingsIcon /></button>

// Node card dismiss
<button aria-label={`Delete node ${node.name}`}>✕</button>

// Canvas
<div role="application" aria-label="Node board canvas" tabIndex={0}>
```

Connector port dots:
```tsx
<div
  role="button"
  tabIndex={0}
  aria-label={`Connect from ${node.name}`}
  onKeyDown={(e) => e.key === 'Enter' && startConnection(node.id)}
/>
```

---

## 9. Reduced Motion Support

For users with `prefers-reduced-motion: reduce`, skip all VHS effects:

```css
@media (prefers-reduced-motion: reduce) {
  .vhs-full,
  .vhs-panel,
  .toast-enter {
    animation: none;
  }

  .vhs-full::after {
    display: none;
  }
}
```

Also disable canvas pan inertia and drag spring animations.

---

## 10. Final Polish Checklist

Before marking Part 19 done, verify each item:

**Typography**
- [ ] Monospace font applied to: field names, node IDs, API keys, code snippets, form field keys
- [ ] No raw HTML default font rendering anywhere (ensure `font-family` is set in `body`)

**Interactions**
- [ ] All buttons have `cursor: pointer`
- [ ] All disabled elements have `cursor: not-allowed` and visual dimming
- [ ] Drag handles show `cursor: grab` / `cursor: grabbing`
- [ ] Loading buttons: disable button + show spinner during async action

**Transitions**
- [ ] `<VHSTransition variant="full">` on all page-level entries
- [ ] `<VHSTransition variant="panel">` on settings, modals, drawer
- [ ] Toast VHS entry animation (`toast-vhs-in`) runs on every new Sonner toast
- [ ] `prefers-reduced-motion` disables Sonner toast animation (`[data-sonner-toast] { animation: none }`)
- [ ] Sonner toast appearance matches Cartum palette (font-mono, surface bg, semantic borders)

**Accessibility**
- [ ] Skip-to-content link exists in root layout
- [ ] All modals trap focus and restore on close
- [ ] All images have `alt` text (or `alt=""` if decorative)
- [ ] Color is never the sole indicator of meaning (always pair with text/icon)
- [ ] Touch targets are min 44×44px (WCAG 2.5.5)

**Performance**
- [ ] Canvas off-screen culling active
- [ ] Node card memoized
- [ ] No `console.log` in production builds (`next.config.ts` `compiler.removeConsole`)
- [ ] `ffmpeg.wasm` is lazy-loaded (imported only when a video file is selected)
- [ ] `browser-image-compression` is lazy-loaded (imported only when an image is selected)

---

## Acceptance Criteria

- [ ] VHS animations visually match spec (scanlines + RGB shift + glitch, correct durations per variant)
- [ ] `prefers-reduced-motion` disables all VHS effects
- [ ] `Esc` closes any open overlay in any part of the app
- [ ] All page transitions show VHS entry — no plain opacity fades
- [ ] Canvas with 50+ nodes maintains 60fps pan
- [ ] All list views show skeleton during load, then real data (no flash of empty state)
- [ ] Empty states appear only when data has loaded AND is genuinely empty
- [ ] All interactive icon-only buttons have `aria-label`
- [ ] Modal focus trap works: Tab cycles within modal, Esc closes
- [ ] Keyboard shortcuts `Esc`, `G+H`, `G+S`, `G+C`, `G+,` all function
- [ ] Toast dismiss countdown pauses on hover
- [ ] No raw color values remain hardcoded in components (all via CSS variables)
- [ ] Minimum touch target size 44px met on all mobile interactive elements
