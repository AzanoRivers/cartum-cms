# Part 10 — Node Connections: Visual Relations

## Goal
Implement the interactive visual connection system between container nodes on the canvas — the rope-line bezier curve dragging experience, the port dots on hover, permanent connection lines, and the connection deletion interaction.

## Prerequisites
- Part 06 (connectionsService: create, delete, getForBoard)
- Part 09 (InfiniteCanvas, NodeCard, useNodeBoard hook)

---

## Interaction Flow (Desktop)

```
1. User hovers cursor near edge of a container NodeCard
   → ConnectorPort dots appear (one on each side: top, right, bottom, left)

2. User clicks and drags from a ConnectorPort
   → A RopeLine begins drawing from the port origin, following the cursor

3. While dragging:
   - Valid drop targets (other container nodes) glow in primary color
   - Field nodes do NOT glow (not valid targets)
   - Dragging back over the origin cancels the connection

4. User releases on another container node
   → createConnection() action fires
   → On success: RopeLine becomes permanent between the two nodes
   → Connection type selector appears (1:1 / 1:n / n:m) as a small popover on the line midpoint

5. User clicks × on a connection line midpoint
   → deleteConnection() action fires
   → Line disappears with a short fade
```

---

## useConnections Hook

### `/lib/hooks/useConnections.ts`

```ts
interface UseConnectionsReturn {
  connections: NodeConnection[]

  // Drag state
  isDragging: boolean
  dragOriginNodeId: string | null
  dragOriginSide: 'top' | 'right' | 'bottom' | 'left' | null
  dragCurrentPosition: { x: number; y: number } | null

  startDrag(nodeId: string, side: PortSide, startPos: { x: number; y: number }): void
  updateDrag(pos: { x: number; y: number }): void
  cancelDrag(): void
  completeDrag(targetNodeId: string): Promise<void>  // calls createConnection action

  deleteConnection(connectionId: string): Promise<void>
}
```

State management: local React state (no global store needed — isolated to the canvas).

---

## Components

### `/components/ui/molecules/ConnectorPort.tsx`
Client Component. Four instances per container NodeCard (top, right, bottom, left).

**States:**
- `hidden` — not visible by default
- `visible` — shown on parent NodeCard hover (CSS `:hover` on NodeCard triggers child CSS)
- `active` — currently being dragged from (glows in accent color)

```ts
interface ConnectorPortProps {
  nodeId: string
  side: 'top' | 'right' | 'bottom' | 'left'
  onDragStart: (side: PortSide, startPos: Position) => void
}
```

**Visual:** Small circle (8px), `background: var(--color-accent)`, `opacity: 0` by default, `opacity: 1` on NodeCard hover via CSS.

**Port position (absolute within NodeCard):**
- Top: `top: -4px; left: 50%; transform: translateX(-50%)`
- Right: `right: -4px; top: 50%; transform: translateY(-50%)`
- Bottom: `bottom: -4px; left: 50%; transform: translateX(-50%)`
- Left: `left: -4px; top: 50%; transform: translateY(-50%)`

---

### `/components/ui/organisms/ConnectionLine.tsx`
Client Component. Renders SVG `<path>` elements on a full-canvas SVG overlay.

**Permanent connection line (between two nodes):**
- Bezier curve from source port to target port
- Path recalculates when either node moves
- Default stroke: `#6366f120` (translucent primary)
- Hover stroke: `#6366f1` (full primary)
- Directional arrowhead at target end (SVG `<marker>`)
- Midpoint interactive zone: circular badge shows relation type label + `×` delete button on hover

**In-progress drag line (follows cursor):**
- Same bezier curve style but dashed: `stroke-dasharray: 6 4`
- Accent color: `var(--color-accent)`
- Animated `stroke-dashoffset` to simulate "flowing" effect while dragging
- No arrowhead (not yet established)

**SVG Overlay:**
The SVG is a full-canvas absolutely positioned element with `pointer-events: none` (except on connection lines themselves which have `pointer-events: stroke`).

```tsx
// Rendered inside InfiniteCanvas, transformed with the same scale/offset
<svg className="absolute inset-0 w-full h-full pointer-events-none">
  <defs>
    <marker id="arrowhead">...</marker>
  </defs>

  {connections.map(conn => (
    <ConnectionLine key={conn.id} connection={conn} nodes={nodes} />
  ))}

  {isDragging && (
    <DragRopeLine
      from={dragOriginPosition}
      to={dragCurrentPosition}
    />
  )}
</svg>
```

---

### Bezier Path Calculation

```ts
function calcBezierPath(from: Position, to: Position): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const cx = dx * 0.5

  return `M ${from.x} ${from.y} C ${from.x + cx} ${from.y}, ${to.x - cx} ${to.y}, ${to.x} ${to.y}`
}
```

Port offset positions are computed based on node card dimensions and canvas transform.

---

### Connection Type Selector

Appears as a small floating pill at the midpoint of a permanent connection line on hover:

```
────────[ 1:n ]────→
          ↑ click to change
```

Click opens a 3-option radial: `1:1`, `1:n`, `n:m`. Selecting one calls `updateConnection(id, type)` action.

---

## Mobile: Connection Creation

On mobile, drag-to-connect is impossible. Alternative flow:

1. Long-press on a container NodeCard → contextual menu appears
2. Menu option: "Connect to..." → opens full-screen node picker
3. User selects target node from list
4. Relation type selector appears → confirm creates the connection

---

## Performance Considerations

- Lines are only rendered if **both source and target nodes are currently in the viewport** (intersection observer or bounds check against canvas offset + scale)
- Connection recalculation is batched on `requestAnimationFrame` during pan/zoom
- SVG uses `will-change: transform` on the overlay to hint GPU compositing

---

## Acceptance Criteria

- [x] Hovering a container NodeCard reveals all 4 ConnectorPort dots
- [x] Dragging from a ConnectorPort shows animated dashed rope line following cursor
- [x] Other container nodes glow as valid targets while dragging
- [x] Field nodes do NOT glow during connection drag
- [x] Releasing on a valid container target calls `createConnection()` and shows the line
- [x] Connection type selector appears on the new line's midpoint
- [x] Changing connection type updates the line label
- [x] Hovering a permanent line shows the × delete badge
- [x] Clicking × removes the line and calls `deleteConnection()`
- [x] Lines correctly reposition when a node is dragged to a new position
- [x] Off-screen connections are not rendered (performance culling)
- [x] Mobile long-press → "Connect to..." flow creates connections correctly
