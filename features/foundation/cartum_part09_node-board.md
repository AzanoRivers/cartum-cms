# Part 09 — Node Board: Canvas & Node Cards

## Goal
Build the infinite canvas board where nodes are rendered as draggable cards, including the BreadcrumbBar, DockBar, the NodeCreationPanel, and the two layout variants (desktop canvas / mobile card list).

## Prerequisites
- Part 06 (node backend: getBoard, createContainer, createField, getBreadcrumb)
- Part 07 (design system, atoms, VHSTransition)

---

## Page Structure

### `/app/(cms)/board/page.tsx` (root board)
Server Component.
```ts
const nodes = await nodeService.getBoard(null)
const connections = await connectionsService.getForBoard(null)
// Pass to layout — desktop gets canvas, mobile gets list
```

### `/app/(cms)/board/[...nodeId]/page.tsx` (nested board)
Server Component. `nodeId` is an array of path segments — last segment is the current container.
```ts
const currentId = params.nodeId.at(-1)
const nodes = await nodeService.getBoard(currentId)
const breadcrumb = await nodeService.getBreadcrumb(currentId)
const connections = await connectionsService.getForBoard(currentId)
```

Both pages render their content inside the appropriate layout (desktop or mobile) determined by root layout detection.

---

## Root Layout: Viewport Detection

### `/app/(cms)/layout.tsx`
Server Component. Reads `user-agent` header to determine device class, renders the corresponding layout:

```ts
const isMobile = isMobileUserAgent(headers().get('user-agent') ?? '')
return isMobile
  ? <MobileLayout>{children}</MobileLayout>
  : <DesktopLayout>{children}</DesktopLayout>
```

> On hydration: a `data-layout` attribute on `<html>` prevents flash by matching SSR decision client-side.

---

## Desktop Layout

### `/components/ui/layouts/DesktopLayout.tsx`
```
┌────────────────────────────────────────────────────────────┐
│  TopBar (breadcrumb + avatar)                          32px│
├────────────────────────────────────────────────────────────┤
│                                                            │
│                  InfiniteCanvas                            │
│                  (overflow: hidden, cursor: grab)          │
│                                                            │
│         ┌──────────────────┐                              │
│         │  DockBar         │  ← floating, centered bottom │
│         └──────────────────┘                              │
└────────────────────────────────────────────────────────────┘
```

### `/components/ui/organisms/InfiniteCanvas.tsx`
Client Component. Handles:
- Pan: mouse drag on empty canvas area (cursor: `grab` → `grabbing`)
- Zoom: scroll wheel (scale 0.3x – 2.0x)
- Canvas state stored in `useNodeBoard` hook
- Renders NodeCard components at their `positionX / positionY` coordinates (absolute positioning inside a transform-scaled container)
- Empty state: renders centered hint text when no nodes are on the board

---

## NodeCard Component

### `/components/ui/molecules/NodeCard.tsx`
Client Component.

**Container Node Card:**
```
┌──────────────────────────────┐
│ ⬡  Blog Posts        [···]  │  ← icon + name + context menu trigger
│     12 fields · 48 records   │  ← stats badges
│     ● 2 connections          │  ← connection indicator
└──────────────────────────────┘
```

**Field Node Card:**
```
┌──────────────────────────────┐
│ T  title                     │  ← field type icon + name
│     text · required          │  ← type label + required badge
└──────────────────────────────┘
```

**States:**
- Default: border-border background
- Hover: border-primary, subtle glow (`box-shadow: 0 0 0 1px var(--color-primary-glow)`)
- Selected: border-primary, stronger glow
- Dragging: scale 1.02, elevated shadow, `cursor: grabbing`

**Click behavior:**
- Container node → navigate into that node's board (`router.push('/cms/board/' + id)`)
- Field node → open edit panel (Part 11)

---

## DockBar

### `/components/ui/organisms/DockBar.tsx`
Client Component. Floating, centered at the bottom. Always visible.

**Initial 3 icons (empty board):**

| Icon | Tooltip | Action |
|---|---|---|
| ⚙ (Settings) | Settings | Opens settings panel |
| ⌂ (Home) | Home | Navigates to root board |
| + (Create Node) | Create node | Opens NodeCreationPanel |

Icon button uses `Button` atom with `variant="ghost"` `size="icon"`.
Active state (current section): icon has accent color, subtle background.

### `/components/ui/molecules/DockIcon.tsx`
Atom-level. Icon + tooltip wrapper with active state support.

---

## BreadcrumbBar

### `/components/ui/molecules/BreadcrumbBar.tsx`
Renders the breadcrumb path. Hidden at root board level (no breadcrumb when `parentId = null`).

```
Home  /  Blog  /  Author
 ↑          ↑         ↑
 link      link     current (no link)
```

Each segment is clickable except the last. Clicking navigates to `/cms/board/[nodeId]`.

---

## TopBar

### `/components/ui/organisms/TopBar.tsx`
Thin bar at top (32px). Contains:
- Left: Cartum logo mark (`◈`) + project name (from project Settings context)
- Center: `BreadcrumbBar`
- Right: avatar circle (user initials) + click opens user menu (logout, profile)

---

## NodeCreationPanel

### `/components/ui/organisms/NodeCreationPanel.tsx`
Client Component. Opens as a floating panel centered over the canvas (not a sidebar, not a modal that dims the whole screen).

**At root level:** only Container option shown
**Inside a container:** Container + Field type options shown

**Flow:**
1. Panel opens with VHS entry (`duration="fast"`)
2. User selects node type (Container or Field)
3. If Field: secondary picker for field type (text, number, boolean, image, video, relation)
4. Name input (validates uniqueness on blur against current board nodes)
5. Confirm button → calls `createContainerNode` or `createFieldNode` action
6. On success: panel closes, new NodeCard appears on canvas with VHS entry

---

## Mobile Layout

### `/components/ui/layouts/MobileLayout.tsx`
Replaces the canvas with a scrollable vertical list of NodeCards.

```
┌──────────────────────┐
│ ← Blog / Author      │  ← back + breadcrumb
├──────────────────────┤
│ [NodeCard]           │
│ [NodeCard]           │  ← swipe-scrollable
│ [NodeCard]           │
└──────────────────────┘
│  ⚙      ⌂      +   │  ← fixed bottom DockBar
```

No canvas, no drag-to-reposition. Node cards are sorted by creation date. Node creation still works via the same NodeCreationPanel (renders as bottom sheet on mobile).

---

## Canvas State: Zustand Store

Canvas state lives in a **Zustand 5 store** — not a React Context. This is critical for performance: canvas pan generates dozens of state updates per second, and a Context would re-render every child on every change. Zustand's selector-based subscriptions isolate re-renders to only the components that need them.

### `/lib/stores/nodeBoardStore.ts`

```ts
// lib/stores/nodeBoardStore.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { AnyNode } from '@/types/nodes'

interface NodeBoardState {
  // Data
  nodes: AnyNode[]
  // Viewport
  scale: number
  offsetX: number
  offsetY: number
  // Interaction
  selectedNodeId: string | null
  isDragging: boolean
  dragNodeId: string | null
}

interface NodeBoardActions {
  setNodes: (nodes: AnyNode[]) => void
  setScale: (scale: number) => void
  setOffset: (x: number, y: number) => void
  selectNode: (id: string | null) => void
  setDragging: (id: string | null) => void
  updateNodePositionOptimistic: (id: string, x: number, y: number) => void
  reset: () => void
}

const initialState: NodeBoardState = {
  nodes: [],
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  selectedNodeId: null,
  isDragging: false,
  dragNodeId: null,
}

export const useNodeBoardStore = create<NodeBoardState & NodeBoardActions>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    setNodes: (nodes) => set({ nodes }),
    setScale: (scale) => set({ scale: Math.min(2, Math.max(0.3, scale)) }),
    setOffset: (x, y) => set({ offsetX: x, offsetY: y }),
    selectNode: (id) => set({ selectedNodeId: id }),
    setDragging: (id) => set({ isDragging: id !== null, dragNodeId: id }),
    updateNodePositionOptimistic: (id, x, y) =>
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, positionX: x, positionY: y } : n
        ),
      })),
    reset: () => set(initialState),
  }))
)
```

### Performance pattern: transient subscriptions for pan

The `InfiniteCanvas` component does NOT subscribe to `offsetX`/`offsetY` through React state — it reads them directly via `getState()` in the `mousemove` handler and applies to the DOM via a ref:

```ts
// In InfiniteCanvas — pan handler (no React re-render on every pixel)
const canvasRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  return useNodeBoardStore.subscribe(
    (state) => [state.offsetX, state.offsetY, state.scale],
    ([x, y, scale]) => {
      if (canvasRef.current) {
        canvasRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
      }
    }
  )
}, [])
```

This yields **zero React re-renders during pan/zoom** — only the CSS transform changes directly.

### UI store (settings panel, active view)

A separate lightweight store for global UI toggles:

```ts
// lib/stores/uiStore.ts
import { create } from 'zustand'

type SettingsSection = 'project' | 'storage' | 'email' | 'api' | 'users' | 'roles'

interface UIState {
  settingsOpen: boolean
  settingsSection: SettingsSection
  openSettings: (section?: SettingsSection) => void
  closeSettings: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  settingsOpen: false,
  settingsSection: 'project',
  openSettings: (section = 'project') => set({ settingsOpen: true, settingsSection: section }),
  closeSettings: () => set({ settingsOpen: false }),
}))
```

---

## Acceptance Criteria

- [x] Root board renders empty InfiniteCanvas with hint text when no nodes exist
- [x] 3 dock icons visible on empty board: Settings, Home, + Node
- [x] Clicking + Node opens NodeCreationPanel with VHS animation
- [x] Creating a container node renders a NodeCard on the canvas
- [x] Clicking a container NodeCard navigates to its nested board with correct breadcrumb
- [x] BreadcrumbBar shows correct path and segment links are functional
- [x] Clicking Home in BreadcrumbBar or DockBar returns to root board
- [x] Canvas pans on mouse drag and zooms on scroll
- [x] Desktop renders InfiniteCanvas; mobile renders card list for the same route
- [x] NodeCreationPanel at root level shows only Container option
- [x] NodeCreationPanel inside a container shows Container + all Field type options
- [x] TopBar shows project name and avatar on all board routes
