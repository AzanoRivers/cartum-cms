# Part 11 — Field Nodes: Types, Editing & Validation

## Goal
Implement the complete field node editing experience — the edit panel for each field type, inline validation, the field type icons, and the rendering of field metadata on NodeCards. This part covers all 6 field types.

## Prerequisites
- Part 06 (createFieldNode, fieldMeta schema, validator)
- Part 07 (atoms: Input, Toggle, Select, Button)
- Part 09 (NodeBoard, NodeCard, NodeCreationPanel already handles creation)

---

## Field Edit Panel

### `/components/ui/organisms/FieldEditPanel.tsx`
Client Component. Opens as a floating panel (same style as NodeCreationPanel) when a field NodeCard is clicked.

**Common fields for all types:**
- Name (text input)
- Required toggle (Boolean switch)
- Default value (type-appropriate input, optional)

**Type-specific configuration shown below field type selector:**

### `text` field
- Multiline toggle (renders as `<textarea>` vs `<input type="text">` in Content Mode)
- Max length (optional number input)
- No additional config

### `number` field
- Subtype: `integer` or `float` (radio/select)
- Min value (optional)
- Max value (optional)

### `boolean` field
- Default value: `true` or `false` (two-option selector)
- Label for true state (optional, e.g. "Active")
- Label for false state (optional, e.g. "Inactive")

### `image` field
- No extra config beyond Required and Default
- Storage warning banner if `R2_BUCKET_URL` is not set:
  > "Storage is not configured. Images can be added in Settings → Storage."
- Preview: shows accepted formats label (WebP, JPEG — after optimization)

### `video` field
- Same storage warning as image
- Max duration cap (optional, in seconds)
- Preview: shows accepted formats (MP4, WebM)

### `relation` field
- **Relation target**: dropdown populated with all container nodes (excluding self and own children)
- **Relation type**: `1:1`, `1:n`, `n:m` (radio group)
- Preview: shows `→ NodeName` with arrow icon

---

## FieldNode Card Visual by Type

Each field type has a distinct icon and color accent on the NodeCard:

| Type | Icon | Accent |
|---|---|---|
| `text` | `T` (letter) | muted |
| `number` | `#` | muted |
| `boolean` | toggle icon | muted |
| `image` | image frame icon | accent (cyan) |
| `video` | play icon | accent (cyan) |
| `relation` | arrow-right icon | primary (indigo) |

The card shows: icon + name + type label + required indicator (`*` if required).

---

## FieldTypePicker Component

### `/components/ui/molecules/FieldTypePicker.tsx`
Used in NodeCreationPanel and FieldEditPanel when selecting or changing the field type.

6 options rendered as icon cards in a 2x3 grid. Each card:
- Icon (type-specific)
- Label (type name)
- Subtle active border when selected

Once a field node has records associated with it, **changing its type is blocked** with an inline warning: "This field has existing records. Delete all records first to change the type."

---

## Field Meta Server Actions

### `/lib/actions/nodes.actions.ts` (additions)
```ts
updateFieldMeta(nodeId: string, input: UpdateFieldMetaInput): Promise<ActionResult<FieldNode>>
// Validates type-specific constraints (e.g. min <= max for number)
// Blocks field_type change if records exist
```

### `/types/nodes.ts` (additions)
```ts
export interface TextFieldConfig {
  multiline?: boolean
  maxLength?: number
}

export interface NumberFieldConfig {
  subtype: 'integer' | 'float'
  min?: number
  max?: number
}

export interface BooleanFieldConfig {
  defaultValue?: boolean
  trueLabel?: string
  falseLabel?: string
}

export interface RelationFieldConfig {
  relationTargetId: string
  relationType: '1:1' | '1:n' | 'n:m'
}

export type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | BooleanFieldConfig
  | RelationFieldConfig
  | Record<string, never>  // image, video have no extra config in v1
```

Store `FieldConfig` as JSON in `field_meta.config` column (add to schema).

---

## Field Listing Inside Container

When inside a container node's board, field nodes appear in the card list below container nodes. A section separator distinguishes them:

```
Container nodes:
  [ Author container card ]

Field nodes:
  ── Fields ──────────────────
  [ T  title ]  [ # order ]  [ ⇒ author ]
```

On mobile: separate sections in the scrollable list.

---

## Inline Validation on Edit

The FieldEditPanel validates on submit before calling the action:

- Name: not empty, matches `^[a-zA-Z0-9 _-]+$`, unique within parent
- Number min/max: min must be ≤ max
- Relation target: must exist and be a container node
- Field type change: blocked if records exist

Validation errors show inline below the relevant input (no full-page errors).

---

## Acceptance Criteria

- [ ] Clicking a field NodeCard opens FieldEditPanel with current values pre-filled
- [ ] All 6 field types render their type-specific config section correctly
- [ ] Storage warning banner shows on image/video fields when R2 is not configured
- [ ] Relation field shows target node dropdown with all valid containers
- [ ] Changing field type is blocked with warning when records exist
- [ ] Saving field updates reflect on the NodeCard immediately (optimistic update)
- [ ] Required toggle + `*` indicator on NodeCard stay in sync
- [ ] Number field blocks submission when min > max
- [ ] Each field type icon and color is correct on the NodeCard
- [ ] FieldTypePicker icons are visible and selectable in creation and edit flows
