# Part 12 — Records & Content Mode

## Goal
Build Content Mode — the non-technical interface where editors manage actual data. Includes the record list view, record form (auto-generated from the field schema), CRUD operations, and the RBAC-filtered navigation.

## Prerequisites
- Part 05 (RBAC: getAccessibleNodes, requirePermission)
- Part 06 (node schema fully defined, records repository)
- Part 07 (design system atoms)
- Part 11 (field node types and config defined)

---

## Content Mode Routes

```
/app/(cms)/content/page.tsx            → Node index (list of accessible nodes)
/app/(cms)/content/[nodeId]/page.tsx   → Record list for a node
/app/(cms)/content/[nodeId]/new/page.tsx   → Create new record form
/app/(cms)/content/[nodeId]/[recordId]/page.tsx → Edit existing record form
```

Content Mode is accessible to all authenticated users (filtered by RBAC). It never shows the node board, schemas, or field configuration.

---

## Content Node Index

### `/app/(cms)/content/page.tsx`
Server Component. Shows accessible nodes as cards.

```
┌────────────────────────────────────────┐
│  Blog Posts         48 records    →   │
│  Products           12 records    →   │
│  Team Members        6 records    →   │
└────────────────────────────────────────┘
```

Data: `rolesService.getAccessibleNodes(userId)` → `nodesRepository.findByIds()` → include record count per node.

Empty state when no nodes are accessible: "No content areas have been assigned to your account."

---

## Record List View

### `/app/(cms)/content/[nodeId]/page.tsx`
Server Component. Shows all records for the node in a table/card list.

**Desktop:** Table layout
- Columns: first 3-4 field names from the schema + created_at + actions
- Sortable by any column
- Search input (client-side filter on loaded data in v1; full-text in future)

**Mobile:** Card list
- Each record as a card showing first 2 field values + date

**Actions per record:**
- Edit (pencil icon) → navigates to edit form
- Delete (trash icon) → inline confirm → `deleteRecord()` action

**Permissions:** Edit/Delete buttons only show if `can_update`/`can_delete` for the user's role.

---

## Record Form

### `/app/(cms)/content/[nodeId]/new/page.tsx`
### `/app/(cms)/content/[nodeId]/[recordId]/page.tsx`
Server Components (load existing record data). Render `<RecordForm>` organism.

### `/components/ui/organisms/RecordForm.tsx`
Client Component. Auto-generates form from the node's field schema.

**Field type → Input component mapping:**

| Field Type | Form Input |
|---|---|
| `text` (single) | `<Input type="text">` |
| `text` (multiline) | `<textarea>` styled to match system |
| `number` (integer) | `<Input type="number" step="1">` |
| `number` (float) | `<Input type="number" step="any">` |
| `boolean` | Toggle switch (on/off) |
| `image` | `<ImageUploadField>` |
| `video` | `<VideoUploadField>` |
| `relation` | `<RelationSelectField>` |

**Order of fields:** rendered in the sequence they were created (by `created_at` of the field node).

**Validation on submit:**
- Required fields: shows error if empty
- Number min/max: validates against field config
- Relation: must select a valid record

**Save:** calls `createRecord()` or `updateRecord()` Server Action → on success: redirect to record list with success toast.

---

## Field Input Components

### `/components/ui/molecules/ImageUploadField.tsx`
Client Component.

> **Note:** Full implementation in Part 14. The field exposes **two entry points** — see Part 14 for the complete dual-mode interface.

1. Shows current image (if editing) or placeholder
2. Two action buttons: **"Choose from library"** and **"Upload new"**
3. "Upload new": file picker → client-side optimization (Part 14) → upload to R2
4. "Choose from library": opens `<MediaLibraryPicker>` filtered to images (Part 14)
5. On success: stores R2 public URL in record field value
6. Shows progress bar during upload
7. Storage unconfigured: shows inline warning, disables both buttons

### `/components/ui/molecules/VideoUploadField.tsx`
Same dual-mode interface as ImageUploadField but:
- Accepts: `.mp4`, `.mov`, `.webm`
- Library picker filtered to videos only
- Client-side ffmpeg.wasm optimization runs before upload (Part 14 — can be slow, shows progress)
- Shows video player preview after selection/upload

### `/components/ui/molecules/RelationSelectField.tsx`
Client Component. Loads related records from the target node and renders a searchable select:

1. Fetch records from related node (limited to 50 for dropdown, with search)
2. Shows the first `text` field value of each record as the display label
3. Stores the related record ID as the field value
4. If `1:n` or `n:m`: allows multiple selection

---

## Records Service & Actions

### `/lib/services/records.service.ts`
```ts
getByNodeId(nodeId: string, options: { page, limit, sort }): Promise<PaginatedRecords>
getById(nodeId: string, recordId: string): Promise<Record>
create(nodeId: string, data: RecordInput): Promise<Record>
  // Validates all required fields are present
  // Validates field types match their config (min/max, etc.)
  // Validates relation target records exist
update(nodeId: string, recordId: string, data: RecordInput): Promise<Record>
delete(nodeId: string, recordId: string): Promise<void>
```

### `/lib/actions/records.actions.ts`
```ts
createRecord(nodeId, data): Promise<ActionResult<Record>>
updateRecord(nodeId, recordId, data): Promise<ActionResult<Record>>
deleteRecord(nodeId, recordId): Promise<ActionResult>
```
All guarded by `requirePermission()` (Part 05).

---

## Types

### `/types/records.ts`
```ts
export type RecordValue = string | number | boolean | null

export interface Record {
  id: string
  nodeId: string
  data: Record<string, RecordValue>
  createdAt: Date
  updatedAt: Date
}

export interface RecordInput {
  data: Record<string, RecordValue>
}

export interface PaginatedRecords {
  records: Record[]
  total: number
  page: number
  limit: number
}
```

---

## Content Mode in DockBar

When in Content Mode, the DockBar shows a "Back to Builder" icon (only for users who have Builder Mode access). Users who only have Content Mode access see their dock without the Board icon.

---

## Acceptance Criteria

- [x] Content Mode index shows only nodes the user's role can read
- [x] Super admin sees all nodes in Content Mode index
- [x] User with no role permissions sees empty state message
- [x] Record list shows columns based on the node's actual field schema
- [x] New record form shows all fields in creation order
- [x] Required field validation fires on submit — not on blur
- [ ] ImageUploadField shows progress bar during upload — **Part 14 (upload logic pending)**
- [x] ImageUploadField shows warning when storage not configured
- [x] RelationSelectField loads target node records as dropdown options
- [ ] Saving a new record redirects to the record list with success toast — redirect ✅, toast pending (no toast system yet)
- [x] Edit and Delete buttons are hidden for roles without those permissions
- [x] Deleting a record requires inline confirmation before firing action

---

## Addendum — Custom CAPTCHA on Login

> Implemented after Part 12 acceptance, shipped as part of the auth hardening.

A canvas-based CAPTCHA challenge added to the login form to block basic automated attacks.

### Files

| File | Role |
|---|---|
| `components/ui/molecules/CaptchaChallenge.tsx` | Molecule — two `<canvas>` elements drawing digits |
| `components/ui/organisms/LoginForm.tsx` | Updated to integrate captcha state + validation |
| `locales/en.ts` / `locales/es.ts` | Added `captchaLabel`, `captchaPlaceholder`, `captchaError` strings |

### Behavior

1. Two `<canvas>` boxes (52×64 px each) draw a random digit 0–9 on mount and on every refresh.
2. The user must type the sum of both digits in a number input.
3. **Wrong answer** → error message shown, new digit pair generated immediately, input cleared.
4. **Correct answer but `signIn` fails** → pair also regenerates (prevents replaying a known-correct sum).
5. All strings come from `dict` (no hardcoded text).

### Canvas aesthetic
- Background: `#1a1a24` (surface-2), border: `#6366f1` (primary)
- Digit: `#22d3ee` (accent cyan), `bold 36px Courier New`, slight random X jitter per draw
- Scanline overlay: `rgba(255,255,255,0.03)` every 4 px
- Drop shadow glow: `rgba(99,102,241,0.5)` for depth

### Acceptance Criteria

- [x] Canvas draws correct digit on mount and after refresh
- [x] Wrong sum shows error message and regenerates pair
- [x] Correct sum + failed `signIn` also regenerates pair
- [x] All label/error strings sourced from locale dictionary
- [x] No TypeScript errors (`tsc --noEmit` exits 0)
