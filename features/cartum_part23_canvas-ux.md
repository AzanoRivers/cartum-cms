# Part 23 — Canvas UX Fixes & Enhancements

## Context
Bugs and UX gaps found during board usage: passive wheel warning flood, hard-to-click connection delete, no touch panning, no context menu.

---

## Issues & Solutions

### 1. `Unable to preventDefault inside passive event listener` — `InfiniteCanvas.tsx`
**Root cause**: React attaches `onWheel` as a passive listener in React 17+. Calling `e.preventDefault()` inside it has no effect and floods the console.  
**Fix**: Remove `onWheel` JSX prop; attach the handler imperatively in `useEffect` with `{ passive: false }`.

### 2. Connection lines: wider + easier to delete
**Problems**: Stroke is 1.5px (hard to see at zoom-out). Hit area `strokeWidth={12}` is too narrow for the control pill to appear reliably. The `×` button is 10px and very hard to click.  
**Fixes**:
- Visible stroke: `1.5 → 2.5` (normal), `2 → 3` (hovered)
- Hit area path: `strokeWidth={12 → 24}`
- Delete button in pill: increase to `px-2 py-1 text-sm`, use × (U+00D7) with clearer hover target

### 3. Context menu (right-click / long-press mobile)
**When right-click on a NodeCard** → show menu: **Duplicate**, **Delete node**  
**When right-click on empty canvas** → no menu (or future: add node)  
**Mobile**: long-press (≥500ms) on a card triggers the same menu  

**Architecture**:
- `components/ui/molecules/BoardContextMenu.tsx` — floating card, `VHSTransition` (200ms), auto-dismiss on outside click / Escape
- State in `InfiniteCanvas`: `contextMenu: { x, y, nodeId } | null`
- `onContextMenu` handler on outer div — locate nearest `[data-nodeid]`, set state
- Long-press: `onTouchStart` sets a 500ms timer; `onTouchMove`/`onTouchEnd` clear it; if timer fires → open menu at touch coords
- **Duplicate**: clones node object with new `id` (uuid), position offset `+30/+30`, calls `createContainerNode` or `createFieldNode` server action → `addNode`
- **Delete**: calls `deleteNode` server action (with `confirmed: true`), removes from store via new `removeNode` action

### 4. Touch panning (single finger)
**Problem**: Pinch-zoom works via browser default, but single-finger drag does not pan the board.  
**Fix**: `onTouchStart` / `onTouchMove` / `onTouchEnd` handlers check `touches.length === 1`:
- Store initial touch in `touchPanRef`
- On move: compute delta, call `setOffset`
- On end: clear ref
- Long-press timer is cancelled on move (> 5px threshold)

---

## Files Changed

| File | Change |
|---|---|
| `InfiniteCanvas.tsx` | passive wheel fix, context menu state + handlers, touch pan handlers |
| `ConnectionLayer.tsx` | wider strokes, wider hit area, bigger delete button |
| `lib/stores/nodeBoardStore.ts` | add `removeNode` action |
| `components/ui/molecules/BoardContextMenu.tsx` | new — floating context menu |

---

---

## Deletion integrity check system

### Problem
Deleting a node that other records, connections, or relation fields depend on can silently break the data model.

### Solution
Pre-delete integrity check runs **before** any delete is executed:

1. **`types/integrity.ts`** — `RiskFactor` (discriminated union by `kind`), `RiskLevel` (`safe | warn | danger`), `DeletionRisk`
2. **`db/repositories/connections.repository.ts`** — added `countByNodeId(nodeId)` (OR query on source + target)
3. **`db/repositories/nodes.repository.ts`** — added `countRelationReferences(nodeId)` (fieldMeta rows pointing to this node)
4. **`lib/services/integrity.service.ts`** — `checkNodeDeletion(id)`: runs 4 checks in `Promise.all`, derives `RiskLevel`
5. **`lib/actions/integrity.actions.ts`** — `checkNodeDeletionRisk` server action with Zod + auth guard
6. **`lib/services/nodes.service.ts`** — `delete()` now checks `connectionCount` in addition to `childCount`
7. **`components/ui/molecules/DeleteConfirmDialog.tsx`** — modal showing risk icon (amber/red), factor list, Cancel / Confirm

**Flow in `InfiniteCanvas`**:
- `handleDeleteNode(id)` → calls `checkNodeDeletionRisk`
  - `safe`: delete immediately (no dialog) + `toast.error` if fails
  - `warn | danger`: set `deleteRisk` state → `<DeleteConfirmDialog>` appears
- `handleDeleteConfirm()` → calls `deleteNode(confirmed:true)` + `removeNode` + `toast.error` on failure
- `checkNodeDeletionRisk` failure → `toast.error('Could not check node dependencies.')`

---

## Toast feedback for delete operations

**Hook used**: `useToast` from `@/lib/hooks/useToast` (thin Sonner wrapper with CMS i18n support).

| Scenario | Toast |
|---|---|
| `checkNodeDeletionRisk` server action fails | `toast.error('Could not check node dependencies. Please try again.')` |
| Safe delete — `deleteNode` server action fails | `toast.error('Could not delete node.')` |
| Confirmed delete (dialog) — `deleteNode` fails | `toast.error('Could not delete node.')` |

---

## Settings INFO section

Added a read-only **Info** tab to the Settings panel, always visible to all users (no role restriction).

**Files changed**:
- `lib/stores/uiStore.ts` — added `'info'` to `SettingsSection` union
- `locales/en.ts` + `locales/es.ts` — added `settings.nav.info` label + `settings.info` data block
- `locales/en.ts` `Dictionary` type — added `nav.info: string` and `info: { ... }` shape
- `components/ui/organisms/settings/InfoSection.tsx` — new section component
- `components/ui/organisms/SettingsPanel.tsx` — imported `InfoSection`, added to `ALL_SECTIONS`, wired `activeSection === 'info'` branch

**Info section content**: version (1.0.0), license (MIT), tech stack, docs link, GitHub link.

---

## Files Changed (cumulative)

| File | Change |
|---|---|
| `InfiniteCanvas.tsx` | passive wheel fix, context menu state + handlers, touch pan, integrity delete flow, toast feedback |
| `ConnectionLayer.tsx` | wider strokes, wider hit area, click-to-open pill, lucide X delete button |
| `lib/stores/nodeBoardStore.ts` | add `removeNode` action |
| `components/ui/molecules/BoardContextMenu.tsx` | new — floating context menu |
| `components/ui/molecules/DeleteConfirmDialog.tsx` | new — risk modal |
| `types/integrity.ts` | new — RiskFactor, RiskLevel, DeletionRisk |
| `db/repositories/connections.repository.ts` | add `countByNodeId` |
| `db/repositories/nodes.repository.ts` | add `countRelationReferences` |
| `lib/services/integrity.service.ts` | new — pre-delete integrity service |
| `lib/actions/integrity.actions.ts` | new — `checkNodeDeletionRisk` server action |
| `lib/services/nodes.service.ts` | delete() checks connections |
| `lib/stores/uiStore.ts` | add `'info'` to SettingsSection |
| `locales/en.ts` + `locales/es.ts` | add settings.nav.info + settings.info |
| `components/ui/organisms/settings/InfoSection.tsx` | new — Info settings section |
| `components/ui/organisms/SettingsPanel.tsx` | wire InfoSection |

---

## CARTUM CMS rainbow neon effect

"CARTUM CMS" text in `BrandFooter` gets a slow (8s) continuously cycling rainbow neon: `linear-gradient` across `indigo → cyan → purple → green → yellow → orange → pink → indigo`, animated via `background-position` with `background-clip: text`. Subtle `drop-shadow` glow keeps it grounded in the cyberpunk palette.

Files: `app/globals.css` (`@keyframes cartum-rainbow` + `.cartum-neon-rainbow`), `components/ui/atoms/BrandFooter.tsx`.

---

## Canvas context menu (right-click on empty board area)

Right-click on the canvas background (no node) shows `CanvasContextMenu`:
- **Go back / Go forward** — `router.back()` / `router.forward()` (browser history)
- **Fit all nodes** — centers the view on all nodes without zooming in beyond 1:1 (only zooms out if nodes exceed the viewport)

Files: `components/ui/molecules/CanvasContextMenu.tsx` (new), `locales/en.ts` + `locales/es.ts` (`board.canvasMenu`), `InfiniteCanvas.tsx` (`canvasMenu` state + `handleFitAll`).

---

## Acceptance Criteria

- [ ] No `Unable to preventDefault` warnings on wheel events
- [ ] Connection lines visible at all zoom levels (≥2.5px)
- [ ] Hovering anywhere near a connection (within 24px) shows the control pill
- [ ] Clicking a connection opens the pill; clicking outside closes it
- [ ] Delete `×` button is comfortably clickable (≥32px target)
- [ ] Right-click on a node shows context menu with Duplicate / Delete
- [ ] Context menu dismisses on outside click or Escape
- [ ] Long-press (500ms) on a node on mobile shows context menu
- [ ] Single-finger drag pans the board on mobile
- [ ] Duplicate creates a real persisted copy of the node offset by 30px
- [ ] Delete of a safe node removes immediately (no dialog)
- [ ] Delete of a node with dependencies shows risk dialog
- [ ] Failed delete shows `toast.error`
- [ ] Failed integrity check shows `toast.error`
- [ ] Settings panel shows "Info" tab for all users
- [ ] Info tab shows version 1.0.0, MIT license, stack, docs/GitHub links
