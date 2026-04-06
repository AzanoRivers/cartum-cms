# Part 21 — NodePanel: Folder-Detach Interaction Pattern

## Goal
Build the `NodePanel` organism — the universal UI panel for every form, overlay, and input in Cartum. Desktop: panel unfurls anchored to its trigger element. Mobile: bottom sheet with drag-to-dismiss. Zero modal overlays; zero library dependencies for positioning or gesture.

## Prerequisites
- Part 08 (UI atoms: Button, Icon, Spinner — used in panel header and actions)
- Part 09 (Node Board canvas context — panels open attached to NodeCards)
- Part 20 (Theme System — `animate-panel-unfurl`, `animate-panel-fold`, `animate-sheet-up` tokens in `app/theme.css`)

---

## 1. Concept

Every time the user needs to interact with a form, input, or panel in Cartum (creating a field, editing a node, viewing record detail, filter panel, etc.), the UI panel *detaches from the triggering element* like a folder opening.

Visual metaphor: a manila folder tab is pressed → the folder unfurls from that point, revealing its contents. The panel is **never a modal** covering the board. It is **anchored to its origin**.

**Desktop**: Panel slides open attached to the triggering node/button, positioned to avoid viewport edge.
**Mobile**: Panel rises from the bottom as a full-height sheet (94vw, ~90vh).

---

## 2. `NodePanel` Organism

### `/components/ui/organisms/NodePanel.tsx`

```tsx
// components/ui/organisms/NodePanel.tsx
'use client'
```

**Props:**

```ts
// types/nodePanel.ts
export interface NodePanelProps {
  open:         boolean
  onClose:      () => void
  anchorRef:    React.RefObject<HTMLElement>   // the triggering element
  title:        string
  children:     React.ReactNode
  side?:        'auto' | 'right' | 'left' | 'bottom'  // desktop placement hint
  width?:       number   // px, default 320
  className?:   string
}
```

**Positioning logic — `useAnchoredPanel` hook:**

```ts
// lib/hooks/useAnchoredPanel.ts
// Custom hook — NO floating-ui dependency.
// Calculates panel position relative to anchorRef using getBoundingClientRect().
// Re-calculates on window resize (ResizeObserver) and scroll.
// Returns { x, y, transformOrigin } for CSS placement.

export function useAnchoredPanel(
  anchorRef: React.RefObject<HTMLElement>,
  panelRef:  React.RefObject<HTMLElement>,
  side: 'auto' | 'right' | 'left' | 'bottom' = 'auto'
): AnchoredPanelPosition {
  // 1. Read anchorRef.current.getBoundingClientRect()
  // 2. Read panelRef.current dimensions (or use defaults)
  // 3. Determine best side if 'auto':
  //    - Prefer right if (anchor.right + panelWidth + 16) < window.innerWidth
  //    - Else try left, then bottom
  // 4. Apply viewport clamping: clamp(top, 16, vh - panelHeight - 16)
  // 5. Return { x, y, transformOrigin }
  //    transformOrigin points to the edge facing the anchor
}

export interface AnchoredPanelPosition {
  x:               number   // left in px
  y:               number   // top in px
  transformOrigin: string   // e.g. "left center" | "right center" | "top center"
}
```

---

## 3. Folder-Open Animation

The "unfurl" effect uses `clip-path` — GPU-composited in all modern browsers. No layout thrash.

All keyframes are defined inside the `@theme` block in `app/theme.css` (Part 07). The `--animate-panel-unfurl` and `--animate-panel-fold` tokens generate `animate-panel-unfurl` and `animate-panel-fold` utility classes automatically.

**Component mounting strategy:**

The panel stays mounted in the DOM with `open` controlling visibility. This avoids unmount/remount costs and preserves scroll position in long forms.

```tsx
// NodePanel.tsx — simplified render logic
// La animación y origin se controlan via data attributes + CSS (no style={{}})
<div
  aria-modal="true"
  role="dialog"
  data-panel-open={open}               // CSS: [data-panel-open="true"]
  data-panel-origin={transformOrigin}  // CSS: [data-panel-origin="left center"]
  className={cn(
    'contain-panel',                   // contain: layout style paint (globals.css)
    open ? 'animate-panel-unfurl' : 'animate-panel-fold',  // tokens de @theme
  )}
>
```

**CSS en `globals.css`** para los origins (zero JS, referenciado desde Part 07):
```css
[data-panel-origin="left center"]   { transform-origin: left center; }
[data-panel-origin="right center"]  { transform-origin: right center; }
[data-panel-origin="top center"]    { transform-origin: top center; }
[data-panel-origin="bottom center"] { transform-origin: bottom center; }
```

**`contain: layout style paint`** on every panel means the browser doesn't re-check layout of nodes outside the panel when it opens. Reduces frame cost from ~6ms to ~1.5ms during unfurl on mid-range hardware.

---

## 4. Mobile Panel (Bottom Sheet)

On mobile, `anchorRef` is ignored. Panel becomes a fixed bottom sheet:

```tsx
// NodePanel.tsx — mobile render path
// Detected via: window.innerWidth < 768 (or a CSS media query data attribute set server-side)

// Structure:
// <div fixed inset-x-0 bottom-0 h-[90dvh] w-full>
//   <div class="drag-handle" />   ← 40px touch-pull tab at top
//   <div class="panel-content" /> ← scrollable
// </div>

// Animation: animate-sheet-up (280ms, var(--ease-fold))
// Drag-to-dismiss: translateY drag gesture, snaps closed if past 40% threshold
//   - Uses pointer events, NOT a gesture library
//   - Velocity-based: if release velocity > 500px/s → close regardless of position
```

**Drag-to-dismiss performance:**
- `pointer-down/move/up` listeners on the drag handle only
- `transform: translateY()` applied via `ref.current.style` during drag — **zero React renders** during pan
- Snap decision on `pointer-up`

---

## 5. Focus Management & Accessibility

```
On open:
  → First focusable element inside panel receives focus
  → Tab trap: Tab/Shift+Tab cycles within panel only
  → Backdrop click: closes panel (fires onClose)
  → Escape: closes panel (fires onClose)

On close:
  → Focus returns to anchorRef element
  → ARIA: aria-modal="true", role="dialog", aria-labelledby={titleId}
```

---

## 6. Files to Create

```
components/ui/organisms/
  NodePanel.tsx                ← main organism (desktop + mobile)

components/ui/molecules/
  PanelHeader.tsx              ← title label + close button row
  PanelDragHandle.tsx          ← mobile drag bar (button role for a11y)

lib/hooks/
  useAnchoredPanel.ts          ← custom positioning hook (desktop)
  useDragDismiss.ts            ← drag-to-dismiss velocity gesture hook (mobile)

types/
  nodePanel.ts                 ← NodePanelProps, AnchoredPanelPosition
```

---

## Acceptance Criteria

- [ ] Panel opens with `animate-panel-unfurl` animation, `transform-origin` facing the trigger element
- [ ] Panel never overflows the viewport — position clamped on all 4 edges
- [ ] Panel stays mounted in DOM (no unmount on close) — `data-panel-open` controls visibility
- [ ] On mobile, panel slides up as a bottom sheet with `animate-sheet-up`
- [ ] Mobile drag-to-dismiss works with velocity snap (fast flick closes even at 20% travel)
- [ ] Focus is trapped inside the panel while open
- [ ] `Escape` closes the panel and returns focus to the trigger element
- [ ] Zero React re-renders during mobile drag pan (verified via React DevTools Profiler)
- [ ] `aria-modal="true"`, `role="dialog"`, `aria-labelledby` present when open
