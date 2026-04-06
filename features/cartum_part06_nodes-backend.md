# Part 06 — Node System: Backend

## Goal
Build the complete backend for the node system: service layer, validation rules, hierarchy resolution, and all CRUD operations for both container and field nodes. This is the core domain logic of Cartum.

## Prerequisites
- Part 02 (nodes, field_meta, node_relations tables + repositories)
- Part 05 (RBAC guard available)

---

## Node Rules (enforced at service layer)

| Rule | Where enforced |
|---|---|
| Field nodes cannot exist at root level (`parent_id = null`) | `nodeService.create()` |
| Field nodes must have a valid `parent_id` pointing to a container | `nodeService.create()` |
| Container nodes can exist at any level | No restriction |
| A `field_meta` row must always exist for field nodes | `nodeService.create()` — created in same transaction |
| Deleting a container node cascades to all children (field nodes + nested containers) | DB `ON DELETE CASCADE` + service warning |
| Node names must be unique **within the same parent** | `nodeService.create()` + `nodeService.rename()` |
| `relation` field type must have a valid `relation_target_id` pointing to a container | `fieldMetaValidator` |

---

## Service Layer

### `/lib/services/nodes.service.ts`

```ts
export const nodeService = {

  async getBoard(parentId: string | null): Promise<AnyNode[]>
  // Returns all direct children of parentId (or root nodes if null)
  // Includes field_meta joined for field nodes

  async getBreadcrumb(nodeId: string): Promise<BreadcrumbItem[]>
  // Walks up the parent chain to build [{ id, name }, ...]
  // Uses recursive CTE via nodesRepository.findAncestors()

  async createContainer(input: CreateContainerInput): Promise<ContainerNode>
  // Validates: name unique within parent
  // Inserts node row (type='container')

  async createField(input: CreateFieldInput): Promise<FieldNode>
  // Validates: parent_id is NOT null and parent type is 'container'
  // Validates: if field_type='relation', relation_target_id must be a valid container
  // Inserts node row (type='field') + field_meta row in a transaction

  async updatePosition(id: string, x: number, y: number): Promise<void>
  // Debounced on client; called on drag end

  async rename(id: string, name: string): Promise<AnyNode>
  // Validates uniqueness within same parent

  async delete(id: string): Promise<void>
  // Checks: if container, warns about child count (error on non-empty without confirm flag)
  // Deletes node (cascade handles children via DB)

  async getFullTree(rootId?: string): Promise<NodeTree>
  // Returns nested tree structure for a given root (or entire schema)

}
```

### `/lib/services/connections.service.ts`

```ts
export const connectionsService = {

  async create(sourceId: string, targetId: string, type: RelationType): Promise<NodeConnection>
  // Validates: both nodes are containers
  // Validates: no duplicate connection (same source+target)
  // Validates: no self-connection
  // Inserts into node_relations

  async delete(connectionId: string): Promise<void>

  async getForBoard(parentId: string | null): Promise<NodeConnection[]>
  // Returns all connections where both source and target belong to the same board level

}
```

---

## Server Actions

### `/lib/actions/nodes.actions.ts`

```ts
createContainerNode(input: CreateContainerInput): Promise<ActionResult<ContainerNode>>
createFieldNode(input: CreateFieldInput): Promise<ActionResult<FieldNode>>
updateNodePosition(id: string, x: number, y: number): Promise<ActionResult>
renameNode(id: string, name: string): Promise<ActionResult<AnyNode>>
deleteNode(id: string, confirmed?: boolean): Promise<ActionResult>
// confirmed=false → returns error with child count if node has children
// confirmed=true  → deletes regardless

createConnection(sourceId, targetId, type): Promise<ActionResult<NodeConnection>>
deleteConnection(connectionId): Promise<ActionResult>
```

Each action calls `requirePermission()` from Part 05 before delegating to the service.

---

## Input Types

### `/types/nodes.ts` (additions)

```ts
export interface CreateContainerInput {
  name: string
  parentId: string | null
  positionX?: number
  positionY?: number
}

export interface CreateFieldInput {
  name: string
  parentId: string          // required for field nodes — never null
  fieldType: FieldType
  isRequired?: boolean
  defaultValue?: string
  relationTargetId?: string // only for fieldType='relation'
  positionX?: number
  positionY?: number
}

export interface BreadcrumbItem {
  id: string
  name: string
}

export interface NodeTree {
  node: ContainerNode
  children: (NodeTree | FieldNode)[]
}
```

---

## Validator: Field Meta

### `/nodes/validator.ts`

```ts
export function validateFieldMeta(input: CreateFieldInput): ValidationResult {
  if (!input.parentId) {
    return { valid: false, error: 'FIELD_REQUIRES_PARENT' }
  }
  if (input.fieldType === 'relation' && !input.relationTargetId) {
    return { valid: false, error: 'RELATION_REQUIRES_TARGET' }
  }
  // Additional type-specific validation rules here
  return { valid: true }
}
```

---

## Node Tree Resolver

### `/nodes/resolver.ts`

Given a flat array of DB rows, build the nested tree structure used for full schema export and API generation.

```ts
export function resolveNodeTree(flatNodes: AnyNode[]): NodeTree[]
// Groups by parentId, recursively nests
// Handles circular reference protection (should not occur with FK constraints, but defensive)
```

---

## Zod Schemas for Validation

### `/lib/actions/nodes.schemas.ts`

```ts
export const CreateContainerSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z0-9 _-]+$/),
  parentId: z.string().uuid().nullable(),
  positionX: z.number().optional().default(0),
  positionY: z.number().optional().default(0),
})

export const CreateFieldSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z0-9 _-]+$/),
  parentId: z.string().uuid(),   // required, not nullable
  fieldType: z.enum(['text', 'number', 'boolean', 'image', 'video', 'relation']),
  isRequired: z.boolean().optional().default(false),
  defaultValue: z.string().optional(),
  relationTargetId: z.string().uuid().optional(),
})
```

---

## Acceptance Criteria

- [ ] `createContainerNode` with `parentId: null` succeeds and creates a root container
- [ ] `createFieldNode` with `parentId: null` returns `FIELD_REQUIRES_PARENT` error
- [ ] `createFieldNode` with `fieldType: 'relation'` and no `relationTargetId` returns error
- [ ] `deleteNode` on a container with children returns child count warning (without `confirmed`)
- [ ] `deleteNode` with `confirmed: true` deletes node and all descendants via cascade
- [ ] `getBreadcrumb('someNestedId')` returns correct path array from root to target
- [ ] `getBoard(null)` returns only root-level nodes
- [ ] `getBoard(containerId)` returns only direct children of that container
- [ ] Node names must be unique within the same parent — duplicate name returns error
- [ ] `createConnection` between two containers of the same level succeeds
- [ ] `createConnection` with a field node as source or target returns error
- [ ] Duplicate connection (same source + target) returns error
