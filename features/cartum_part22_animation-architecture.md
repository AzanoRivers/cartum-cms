# Part 22 — Animation Architecture: Performance Rules & Governance

## Goal
Establish the animation governance rules for the entire Cartum codebase. Document what can be animated, how to animate it without blocking the main thread, the timing budget for every interaction, when to use CSS vs JS, and how to handle prefers-reduced-motion and board canvas performance.

## Prerequisites
- Part 07 (animation tokens: `--ease-*`, `--animate-*`, `@keyframes` in `app/theme.css`)
- Part 08 (VHSTransition — first implementation of the rules)
- Part 21 (NodePanel — primary consumer of the performance rules)

---

## 1. Absolute Rules (non-negotiable)

1. **Only `transform` and `opacity` are animated via CSS keyframes** — they run on the compositor thread, never blocking the main thread.
2. **Never animate** `width`, `height`, `max-height`, `top`, `left`, `margin`, `padding` — these force layout recalculation every frame.
3. **`clip-path` is safe** — Chromium and Firefox composite clip-path on the GPU for rectangular/rounded shapes. Complex SVG paths are not used.
4. **`will-change` is opt-in, not default** — added via JS immediately before an animation starts, removed in the `animationend` / `transitionend` handler. Never set it in CSS on idle elements.
5. **`contain: layout style paint`** — set on every interactive overlay (NodePanel, SettingsPanel, toasts). Creates a containment boundary that prevents visual changes inside from triggering layout in the rest of the tree.
6. **`content-visibility: auto`** — applied to off-screen NodeCards on the board. The browser skips rendering cards outside the viewport entirely.
7. **`prefers-reduced-motion`** — every animation checks this. Reduce to a flat `opacity` fade or remove entirely.

---

## 2. Animation Duration Budget

| Interaction | Duration | Easing | Animated Props | Notes |
|---|---|---|---|---|
| Page transition (VHS) | 700ms | `ease-out-expo` | `opacity`, `transform`, filters | Full VHS effect |
| NodePanel open | 220ms | `ease-spring` | `clip-path`, `opacity`, `transform` | Unfurl from anchor |
| NodePanel close | 150ms | `ease-in-expo` | `clip-path`, `opacity`, `transform` | Fold back |
| Mobile sheet open | 280ms | `ease-fold` | `transform: translateY` | Slide from bottom |
| Mobile sheet close | 200ms | `ease-in-expo` | `transform: translateY` | Slide down |
| Mobile drag-to-dismiss | real-time | — | `transform: translateY` (via ref) | 0 React renders |
| Theme switch | 300ms | `ease-out-expo` | `background-color`, `color` (global) | CSS vars crossfade |
| Toast entry (Sonner) | 400ms | `ease-out` | `transform`, `opacity` | VHS classNames |
| Settings panel open | 250ms | `ease-spring` | `clip-path`, `opacity` | Same as NodePanel |
| ThemeSwatch hover | 120ms | `ease` | `transform: scale(1.02)` | CSS only |
| ThemeSwatch active | 80ms | `ease` | `transform: scale(0.98)` | Button press |
| Button press | 80ms | `ease` | `transform: scale(0.97)` | CSS: active pseudo |
| Hover (generic) | 120ms | `ease` | `background-color`, `border-color` | CSS only |
| Icon button hover | 150ms | `ease` | `background-color`, `transform: scale(1.08)` | CSS only |
| Node selection ring | 180ms | `ease-out` | `box-shadow` | CSS var glow |
| Connection rope draw | 250ms | `ease-out-expo` | SVG `stroke-dashoffset` | Perceived speed |
| Dock badge appear | 200ms | `ease-spring` | `transform: scale`, `opacity` | |
| Tooltip | 150ms | `ease` | `opacity`, `transform: scale(0.95→1)` | CSS only |
| Skeleton shimmer | 1500ms | infinite | `background-position` | `animation-iteration-count: infinite` |

---

## 3. `will-change` Pattern

```ts
// lib/utils/animateWithWillChange.ts
// Utility for applying will-change safely before JS-triggered animations.

export function animateWithWillChange(
  el: HTMLElement,
  properties: string,       // e.g. 'transform, opacity'
  animate: () => void
) {
  el.style.willChange = properties
  requestAnimationFrame(() => {
    animate()
    el.addEventListener('animationend', () => {
      el.style.willChange = 'auto'
    }, { once: true })
  })
}
```

Used only for:
- Drag start on NodeCard (add `will-change: transform`)
- NodePanel initial open (add `will-change: clip-path, transform, opacity`)
- Mobile sheet drag (add `will-change: transform`)

---

## 4. CSS Animation vs JS Animation Decision Tree

```
Is the animation triggered by a CSS state change (hover, focus, active)?
  → YES → pure CSS transition on the element. No JS.

Is the animation a one-shot entrance/exit on mount?
  → YES → CSS @keyframes in `app/theme.css` as `--animate-*` token,
           applied via class `animate-panel-unfurl` in the component.

Is the animation driven by real-time user input (drag, pinch, scroll)?
  → YES → JS via requestAnimationFrame, apply via ref.current.style (0 React renders).

Is the animation a complex multi-property sequence?
  → YES → CSS @keyframes with multiple steps. No JS animation library.

Does it need spring physics or gesture velocity?
  → YES → Custom velocity calculation in useDragDismiss.ts.
  → NEVER → JS animation library (framer-motion, gsap, etc.) for anything in Cartum.
```

---

## 5. `prefers-reduced-motion` Strategy

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all keyframe animations */
  *, *::before, *::after {
    animation-duration:        0.01ms !important;
    animation-iteration-count: 1      !important;
    transition-duration:       0.01ms !important;
    scroll-behavior:           auto   !important;
  }

  /* NodePanel: replace unfurl with instant opacity fade */
  [data-panel-open="true"] {
    animation: none !important;
    opacity: 1;
  }

  /* VHS transition: skip all effects */
  .vhs-transition {
    animation: none !important;
    filter: none   !important;
  }
}
```

> **Note**: Setting duration to `0.01ms` (not `0`) preserves `animationend` events so JS cleanup hooks still fire correctly.

---

## 6. Board Canvas Performance

Rules that complement Part 09 (Node Board) Zustand transient subscriptions:

- **Node cards use `content-visibility: auto` + `contain-intrinsic-size`** — off-screen cards have zero rendering cost.
- **Connection SVGs are culled** — only connections where at least one endpoint is within the viewport + 200px buffer are rendered.
- **`devicePixelRatio` capping** — board canvas never renders at > 2.0 DPR, even on 3x retina displays. The visual difference is imperceptible; the GPU cost is not.
- **`pointer-events: none`** on the SVG connection layer during drag — prevents hit-testing overhead on every `mousemove`.

```css
/* board performance classes */
.node-card {
  content-visibility: auto;
  contain-intrinsic-size: 0 200px;  /* estimated height hint */
  contain: layout style;
}

.connection-layer {
  pointer-events: none;  /* always — clicks handled by nodes directly */
}

.node-card[data-dragging="true"] {
  will-change: transform;    /* set by JS on drag start, removed on dragend */
  z-index: 50;
}
```

---

## 7. Intersection Observer — Progressive Card Detail

Cards that enter the viewport get their full detail loaded. Off-screen cards show a minimal placeholder:

```ts
// lib/hooks/useNodeVisibility.ts
// Uses IntersectionObserver with rootMargin: "200px" threshold.
// When node enters margin: set visible = true → render full card
// When node leaves: set visible = false → render skeleton (no unmount — preserves position)
// Throttle observer callbacks to rAF to avoid main thread jank.
```

---

## 8. CSS Containment Map

| Component | `contain` value | Reason |
|---|---|---|
| `NodeCard` | `layout style` | Prevents card layout from affecting board |
| `NodePanel` | `layout style paint` | Full isolation — panel changes don't ripple |
| `SettingsPanel` | `layout style paint` | Same |
| `Toaster` (Sonner container) | `layout style paint` | Toast stack isolates from app |
| `MobileBottomSheet` | `layout style paint` | Sheet slide doesn't trigger board repaint |
| `ConnectionSVG` | `strict` | SVG layer is fully isolated |
| `VHSTransition` | `layout style` | VHS filters stay inside wrapper |

---

## 9. File to Create

```
lib/utils/
  animateWithWillChange.ts   ← safe will-change apply/cleanup helper
```

---

## Acceptance Criteria

- [ ] NodePanel unfurl: 220ms, no frame drops > 16ms on reference mobile device
- [ ] All animations use only `transform`, `opacity`, or `clip-path` — no `width/height` transitions anywhere in the codebase
- [ ] `will-change` is never present on idle elements (verified via CSS audit in DevTools)
- [ ] `prefers-reduced-motion` reduces all animations to opacity cross-fades or instant transitions
- [ ] Off-screen NodeCards have `content-visibility: auto` and do not appear in Paint coverage report
- [ ] Board FPS stays above 55fps during NodePanel open with 50+ nodes rendered
- [ ] `animateWithWillChange.ts` removes `will-change` on `animationend` — never leaks to idle state
