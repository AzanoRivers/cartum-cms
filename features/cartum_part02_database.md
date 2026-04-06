# Part 02 — Database Layer

## Goal
Define the complete Drizzle ORM schema, configure the DB adapters (Neon / Supabase), create all repositories, and run the first migration so the database is ready for the setup wizard.

## Prerequisites
- Part 01 complete (folder structure, env vars, boot validation)
- A live PostgreSQL database connected via `DATABASE_URL`

---

## Adapter Setup

### `/db/adapters/neon.ts`
```ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '@/db/schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

### `/db/adapters/supabase.ts`
```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })
```

### `/db/index.ts`
```ts
import { DB_PROVIDER } from '@/lib/boot/validate'  // re-exports validated env

export const db =
  DB_PROVIDER === 'supabase'
    ? (await import('@/db/adapters/supabase')).db
    : (await import('@/db/adapters/neon')).db
```

---

## Schema Files

### `/db/schema/project.schema.ts`
```
Table: project
- id           uuid PK default gen_random_uuid()
- name         text NOT NULL
- description  text
- default_locale text NOT NULL default 'en'
- created_at   timestamp default now()
```
Single row. App logic must enforce this at the service layer.

### `/db/schema/users.schema.ts`
```
Table: users
- id           uuid PK
- email        text UNIQUE NOT NULL
- password_hash text NOT NULL
- is_super_admin boolean NOT NULL default false
- created_at   timestamp default now()
```

### `/db/schema/roles.schema.ts`
```
Table: roles
- id           uuid PK
- name         text NOT NULL UNIQUE
- description  text
- created_at   timestamp default now()

Table: role_permissions
- id           uuid PK
- role_id      uuid FK → roles.id ON DELETE CASCADE
- node_id      uuid FK → nodes.id ON DELETE CASCADE
- can_read     boolean NOT NULL default false
- can_create   boolean NOT NULL default false
- can_update   boolean NOT NULL default false
- can_delete   boolean NOT NULL default false

Table: users_roles
- user_id      uuid FK → users.id ON DELETE CASCADE
- role_id      uuid FK → roles.id ON DELETE CASCADE
- PRIMARY KEY (user_id, role_id)
```

### `/db/schema/nodes.schema.ts`
```
Table: nodes
- id           uuid PK
- name         text NOT NULL
- type         text NOT NULL  CHECK (type IN ('container', 'field'))
- parent_id    uuid FK → nodes.id ON DELETE CASCADE  (nullable — null = root level)
- position_x   real NOT NULL default 0
- position_y   real NOT NULL default 0
- created_at   timestamp default now()
- updated_at   timestamp default now()

Table: field_meta
- id           uuid PK
- node_id      uuid UNIQUE FK → nodes.id ON DELETE CASCADE
- field_type   text NOT NULL  CHECK (field_type IN ('text','number','boolean','image','video','relation'))
- is_required  boolean NOT NULL default false
- default_value text  (nullable)
- relation_target_id uuid FK → nodes.id  (nullable — only for field_type='relation')
```

DB constraint: `field_meta` rows must only exist for nodes where `type = 'field'`. Enforce at service layer + check constraint.

### `/db/schema/relations.schema.ts`
```
Table: node_relations
- id              uuid PK
- source_node_id  uuid FK → nodes.id ON DELETE CASCADE
- target_node_id  uuid FK → nodes.id ON DELETE CASCADE
- relation_type   text NOT NULL  CHECK (relation_type IN ('1:1','1:n','n:m'))
- UNIQUE (source_node_id, target_node_id)
```

### `/db/schema/records.schema.ts`
```
Table: records
- id         uuid PK default gen_random_uuid()
- node_id    uuid FK → nodes.id ON DELETE CASCADE
- data       jsonb NOT NULL default '{}'
- created_at timestamp default now()
- updated_at timestamp default now()
```

---

## Repository Files

Each repository exports a plain object of async functions. No classes.

### `/db/repositories/nodes.repository.ts`
```ts
export const nodesRepository = {
  findById,
  findByParentId,      // null parentId = root nodes
  findFullTree,        // recursive CTE for full depth
  create,
  updatePosition,
  updateName,
  delete,
}
```

### `/db/repositories/records.repository.ts`
```ts
export const recordsRepository = {
  findByNodeId,
  findById,
  create,
  update,
  delete,
  countByNodeId,
}
```

### `/db/repositories/roles.repository.ts`
```ts
export const rolesRepository = {
  findAll,
  findById,
  findByUserId,
  create,
  update,
  delete,
  setPermissions,
  getPermissionsForNode,
}
```

### `/db/repositories/users.repository.ts`
```ts
export const usersRepository = {
  findById,
  findByEmail,
  create,
  updatePassword,
  assignRole,
  removeRole,
  isSuperAdmin,
}
```

---

## `drizzle.config.ts`
```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './db/schema',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

---

## `pnpm db:generate` + `pnpm db:migrate`

Run in order:
1. `pnpm db:generate` — generates SQL migration files from schema
2. `pnpm db:migrate` — applies migrations to the DB

The boot validator (Part 01) checks for schema integrity by querying for the `project` table. If it doesn't exist, `CARTUM_E005` is thrown.

---

## Types to Define

### `/types/nodes.ts`
```ts
export type NodeCategory = 'container' | 'field'
export type FieldType = 'text' | 'number' | 'boolean' | 'image' | 'video' | 'relation'

export interface BaseNode {
  id: string
  name: string
  type: NodeCategory
  parentId: string | null
  positionX: number
  positionY: number
  createdAt: Date
  updatedAt: Date
}

export interface ContainerNode extends BaseNode {
  type: 'container'
}

export interface FieldNode extends BaseNode {
  type: 'field'
  fieldType: FieldType
  isRequired: boolean
  defaultValue: string | null
  relationTargetId: string | null
}

export type AnyNode = ContainerNode | FieldNode

export interface NodeConnection {
  id: string
  sourceNodeId: string
  targetNodeId: string
  relationType: '1:1' | '1:n' | 'n:m'
}
```

### `/types/actions.ts`
```ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
```

---

## Acceptance Criteria

- [x] `pnpm db:generate` creates migration files without errors
- [ ] `pnpm db:migrate` applies all migrations cleanly to a fresh DB  ← pendiente: requiere DATABASE_URL
- [x] All 9 tables defined in schema (project, users, roles, role_permissions, users_roles, nodes, field_meta, node_relations, records)
- [ ] Boot validator `CARTUM_E005` clears after a successful migration  ← pendiente: requiere DB live
- [x] `nodesRepository.create()` inserts a row and returns the typed result
- [ ] A `field` node with `parent_id = null` is blocked at service layer (Part 06)
- [x] All types in `/types/nodes.ts` are exported and importable
