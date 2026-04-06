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

1. Shows current image (if editing) or placeholder
2. Click / drag-drop → file picker opens (accepts: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`)
3. Client-side optimization runs (Part 14) before upload
4. Upload to R2 via `getUploadUrl()` Server Action (returns presigned URL)
5. Browser PUTs file directly to R2 url
6. On success: stores R2 public URL in record field value
7. Shows progress bar during upload
8. Storage unconfigured: shows inline warning, disables upload

### `/components/ui/molecules/VideoUploadField.tsx`
Same as ImageUploadField but:
- Accepts: `.mp4`, `.mov`, `.webm`
- Client-side ffmpeg.wasm optimization runs before upload (Part 14 — can be slow, shows progress)
- Shows video player preview after upload

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

- [ ] Content Mode index shows only nodes the user's role can read
- [ ] Super admin sees all nodes in Content Mode index
- [ ] User with no role permissions sees empty state message
- [ ] Record list shows columns based on the node's actual field schema
- [ ] New record form shows all fields in creation order
- [ ] Required field validation fires on submit — not on blur
- [ ] ImageUploadField shows progress bar during upload
- [ ] ImageUploadField shows warning when storage not configured
- [ ] RelationSelectField loads target node records as dropdown options
- [ ] Saving a new record redirects to the record list with success toast
- [ ] Edit and Delete buttons are hidden for roles without those permissions
- [ ] Deleting a record requires inline confirmation before firing action
