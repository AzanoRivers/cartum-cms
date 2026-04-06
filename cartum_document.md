# Cartum - Architecture & Concept Document

## 🧠 Overview

Cartum is a **serverless-first, headless CMS + visual data modeling platform** built for two audiences simultaneously:

- **Developers / Admins**: configure the data schema, relationships, APIs, and access controls using a visual node-board interface.
- **Content Editors / End Users**: manage content through clean, intuitive forms — they never see schemas, JSON, or technical concepts. Everything feels like a natural OS-level tool.

The platform's core design principle is **zero-tutorial usage**: both a senior developer and a non-technical client should be able to navigate and operate Cartum without reading documentation.

It combines:
- Visual database modeling (node board)
- Auto-generated API
- CMS interface with role-based views
- Guided first-run setup wizard
- Optional media processing pipeline
- Serverless-first deployment

---

## 🎯 Core Concept

### Single Project, Single Database

Cartum manages **one project** per instance. There is no multi-project support. A single installation = a single project = a single database. This constraint keeps the architecture simple, the UX focused, and the deployment lean.

The project name is defined during the setup wizard and becomes the identity of the entire CMS.

---

### Nodes System (Builder Mode — Admin/Developer)

Every piece of data in Cartum is represented as a **node** on a visual canvas. There are two fundamental node categories that together define the entire data model of the project.

#### Category 1 — Container Nodes (Tables)
A container node represents a **database table / data model**. It can hold child nodes inside it (other containers or field nodes). Container nodes are the structural backbone of the schema.

- Created at the root board level (Home)
- Can also be created inside other container nodes
- Appear on the canvas as styled cards with a table icon
- Badge shows: child node count, record count, active connections

#### Category 2 — Field Nodes (Information)
A field node represents a **single data field** — a column within a container. Field nodes can only exist inside a container node, never at the root level.

- Text *(default, most common — single line or multiline)*
- Number *(integer or float)*
- Boolean *(true/false toggle)*
- Image *(stores reference to Cloudflare R2 bucket URL)*
- Video *(stores reference to Cloudflare R2 bucket URL)*
- Relation *(connects to another container node via FK)*

#### Connections (Relationships)
Container nodes can be linked to each other to define relationships and data inheritance. The connection system is fully visual:

- Hover over a node → **connection dots** appear on its edges
- Drag from a dot → an animated **bezier curve rope-line** extends from the cursor
- Drop onto another node → connection is established, line becomes permanent
- Lines represent FK relationships; they carry directional arrows and are color-coded by type

Example:

```
[User] ──────→ [Post] ──────→ [Image]
         1:n            1:1
```

This modeling is done in **Builder Mode** — visible only to users with admin-level permissions. Content editors never interact with the node board or its schema.

---

## �️ Node Hierarchy & Board Navigation

### The Two-Level Mental Model

The board is not flat — it is **hierarchical**. Every container node is a doorway into a deeper board level. This creates a nested structure that mirrors how databases are actually organized.

```
ROOT BOARD (Home)
  └── [Container: Blog]          ← click to enter
        ├── [Container: Author]  ← another container inside
        │     ├── [Field: name]  ← text field node
        │     ├── [Field: bio]   ← text field node
        │     └── [Field: photo] ← image field node
        ├── [Field: title]       ← text field node
        ├── [Field: body]        ← text field node
        ├── [Field: cover]       ← image field node
        └── [Field: published]   ← boolean field node
```

### Root Board (Home Level)

- The starting canvas. Only **container nodes** can be created here.
- Each container node at the root represents a top-level data model (e.g. "Blog", "Products", "Team").
- UI shows: an empty spatial canvas + the 3 system icons only (Settings, Home, + Node).

### Inside a Container Node

When a user **clicks on a container node**, the board reloads with:
1. A **breadcrumb header** at the top indicating the current depth (e.g. `Home / Blog / Author`)
2. The child nodes of that container rendered on a fresh canvas
3. The same dock controls, plus a **Back** action in the breadcrumb

Inside a container, both node types are allowed:
- **+ Container node** — creates a sub-table / nested model
- **+ Field node** — creates a data field of a chosen type

### Navigation State Machine

```
[Home Board]
    │  click container node
    ▼
[Container Board: e.g. "Blog"]
    │  click container node
    ▼
[Container Board: e.g. "Author"]   ← breadcrumb: Home / Blog / Author
    │  click Back (breadcrumb)
    ▼
[Container Board: e.g. "Blog"]    ← breadcrumb: Home / Blog
    │  click Home
    ▼
[Home Board]
```

Navigation uses the browser's history stack. Each board level is a distinct URL:
```
/cms/board                         → root
/cms/board/[nodeId]                → inside a container
/cms/board/[nodeId]/[childNodeId]  → deeper nesting
```

### Creating Nodes

From any board level, the **+ Node** icon opens a creation panel with:

| At root level | Inside a container |
|---|---|
| Container node only | Container node OR Field node |

The distinction is enforced by the UI — at root level, field node types are not offered. This prevents orphaned field nodes with no parent context.

---

## 🔌 Field Node Types

Field nodes are the leaf data units of the schema. Each type renders differently both in the Builder (as a node card on the canvas) and in Content Mode (as a form input).

| Type | Builder Card | Content Mode Input | Storage |
|---|---|---|---|
| `text` | Text icon + preview | Single or multiline text input | JSONB string |
| `number` | `#` icon + type label | Numeric input (`int` or `float`) | JSONB number |
| `boolean` | Toggle icon | ON/OFF switch | JSONB boolean |
| `image` | Thumbnail preview | File upload → R2 bucket | R2 key stored as string |
| `video` | Play icon | File upload → R2 bucket | R2 key stored as string |
| `relation` | Arrow icon + target node name | Dropdown / search of related records | FK reference |

### Media Field Nodes (Image & Video)

Cartum does **not** manage R2 credentials directly in the CMS settings. The only configuration required is:

> A **Cloudflare R2 bucket URL with upload permission** — a pre-signed or public-access URL that allows the CMS to PUT files to the bucket.

This is set once in Settings → Storage:
```
R2_BUCKET_URL=https://[bucket-name].[account-id].r2.cloudflarestorage.com
R2_PUBLIC_URL=https://[custom-domain or R2.dev URL]   ← for reading/serving files
```

No R2 API tokens or Cloudflare account access are managed by Cartum. The bucket URL is sufficient. If not configured, image and video field nodes can still be created but uploads will fail with a clear inline warning: "Storage not configured — go to Settings → Storage".

---

Cartum uses a **role-based access control (RBAC)** system. Every user belongs to a role, and every role defines exactly which nodes and operations it can access.

### Built-in Roles

| Role | Description |
|---|---|
| `super_admin` | Full access to everything: Builder Mode, all nodes, all records, settings, user management, API config. Created once during the setup wizard. Cannot be deleted. |
| `admin` | Configurable. Full CMS access by default but can be restricted. Manages users and roles. |
| `editor` | Configurable. Access limited to assigned nodes. Standard content operations. |
| `viewer` | Read-only access to assigned nodes. Cannot create or edit records. |
| `custom` | Any role created manually. Permissions defined per-node, per-operation (read, create, update, delete). |

### Permission Granularity

Permissions are configured at the **node level**, not just globally:

```
Role: "Marketing Editor"
├── Blog Posts  → read, create, update
├── Media       → read, create
├── Products    → read only
└── Users       → no access
```

This means a content editor can log into Cartum and only see the nodes assigned to their role — they will never stumble upon nodes they shouldn't manage.

### Interface Modes

The UI adapts completely based on the user's role:

- **Builder Mode** — available to `super_admin` and roles with schema permissions. Shows the full node board, field configuration, relationship connectors, and API settings.
- **Content Mode** — available to all roles. Shows only the assigned nodes as simple, form-based interfaces. No mention of schemas, databases, or APIs.

The separation is invisible to the end user. A content editor just sees "Articles", "Products", "Team Members" — never "nodes" or "tables".

---

## 🚀 First-Run Setup Wizard

When the CMS is accessed for the first time (detected by checking if `super_admin` exists in the DB), the system enters **Setup Mode**. All other routes redirect to the wizard until setup is complete.

### Step 0 — System Status Check

Before showing any input, Cartum validates:

- Database connection is reachable and migrations are applied
- Required environment variables are present (`DATABASE_URL`, `AUTH_SECRET`, etc.)
- Storage adapter is responding (if configured)

If all checks pass, a **success confirmation screen** is shown — styled as a terminal/node readout — before proceeding. If any check fails, the screen shows exactly what is misconfigured with actionable descriptions.

```
✓  Database connection — OK
✓  Environment variables — OK
✓  Storage (R2) — OK
→  All systems nominal. Proceeding to setup...
```

### Step 1 — Super Admin Credentials

- Password (with strength indicator)
- Password confirmation
- Recovery email address

> **Email delivery investigation point**: Evaluate whether the hosting platform (Vercel, Cloudflare) provides native transactional email capabilities for password recovery. If not, integrate **Resend** as the default provider via `RESEND_API_KEY`. The setup wizard will warn if no email provider is configured and allow skipping (with a visible risk warning).

### Step 2 — Project Configuration

- **Project name** (used as CMS identity and DB schema prefix)
- **Project description** (optional)
- **Default language** (future i18n groundwork)

Note: Cartum supports a single project per instance. The project name set here cannot be changed without a full reset.

### Step 3 — Schema Initialization

After all data is collected, Cartum:

1. Creates the `super_admin` user in the database
2. Generates the initial internal schema tables (`nodes`, `fields`, `relations`, `records`, `roles`, `users_roles`)
3. Runs migrations
4. Displays a final "System Initialized" confirmation with VHS-style animated entry

### Step 4 — First Look at the Dashboard

The wizard completes and the `super_admin` is redirected to the Dashboard for the first time. The board is completely empty. The only visible UI elements are **exactly 3 system icons** in the floating dock:

```
[⚙ Settings]   [⌂ Home]   [+ Node]
```

- **Settings** — Opens the system configuration panel (project info, storage, email, users/roles)
- **Home** — Returns to the root board from any nested level (always visible)
- **+ Node** — Opens the node creation panel for the current board level

No other controls, no sidebar, no hints beyond a single subtle prompt on the empty canvas: `"Start by creating your first node →"`. The interface teaches itself through interaction.

---

## 🧩 Features

### 1. Visual Data Modeling

- **Infinite canvas** — spatial, zoomable node board as the primary workspace
- **Two node categories**: Container nodes (tables/schemas) and Field nodes (data columns)
- **Hierarchy**: root board → click container → nested board with breadcrumb navigation
- **Drag to reposition**: all nodes can be freely dragged to any position on their canvas level
- **Visual connections**: hover port dots → drag bezier rope lines → drop to connect nodes
- Supported field node types: `text`, `number`, `boolean`, `image`, `video`, `relation`
- Connections define FK relationships; directional, labeled, color-coded

---

### 2. Headless API

Auto-generated endpoints:

```
GET /posts
GET /posts?include=author,image
POST /posts
```

---

### 3. Media Handling

- Image and Video field nodes trigger uploads before saving a record
- Files are optimized client-side (Tier 1) before being sent to storage
- Storage target: **Cloudflare R2 bucket**, configured via a single bucket URL
- Only a **pre-configured R2 bucket URL with upload permission** is needed — Cartum does not manage Cloudflare credentials or API tokens directly
- The stored value in the record is the file's public URL (served via R2 or a custom domain)
- If storage is not configured, media field nodes are visible in the schema but uploads fail gracefully with an inline settings prompt

---

### 4. Media Optimization Pipeline

Cartum uses a **client-first, VPS-optional** strategy. The CMS works fully serverless out of the box. A VPS API can be optionally connected for enhanced processing.

#### Tier 1 — Client-side (always active)

Runs entirely in the browser before upload, using lightweight JS libraries:

**Images:**
- Resize to max 1920px width
- Compress to ~70% quality
- Convert to WebP/JPEG

**Videos:**
- Basic compression via `ffmpeg.wasm` (browser WASM)
- Resolution cap (e.g. 1080p max)
- Format normalization (MP4/WebM)

Libraries: `browser-image-compression`, `ffmpeg.wasm`, or equivalent

#### Tier 2 — VPS API (optional, activated via settings)

If a VPS API URL and API key are configured in the CMS settings, media is sent to the external API for advanced processing:

**Images:**
- Multi-variant generation: 480px, 768px, 1080px, 1920px
- Advanced format optimization (AVIF, WebP)

**Videos:**
- Full transcoding pipeline
- HLS streaming variants
- Thumbnail generation

Configuration (in CMS Settings UI):
```
VPS_API_URL=https://your-vps-api.example.com
VPS_API_KEY=your-secret-key
```

The VPS integration is **purely optional** — it is never required for the CMS to function. If not configured, Tier 1 client-side processing handles all media.

---

### 5. Rendering Strategy

Frontend consumes:

```
JSON → renders UI
```

---

## 🎨 UI Philosophy & Design System

### Core Aesthetic

Cartum's interface is built around a single guiding metaphor: **an operating system for your data**.

- The main workspace is an **infinite canvas node board** — not a page, not a dashboard grid. A spatial, zoomable board where data models live as floating nodes.
- Navigation uses **OS-style icon bars** (dock-like), not traditional sidebar menus with text links.
- Settings, panels, and utilities surface as **overlay windows** emerging from the board — never as sidebar drawers that push content.
- **Dark-first**: near-black background (`#0a0a0f`), surface cards (`#111118`), indigo primary (`#6366f1`), cyan accents (`#22d3ee`). No light mode in v1.
- **Monospace typography** for node names, field keys, API routes, and system labels. Clean sans-serif for content and descriptions.

### Layout Principles

- No persistent sidebar navigation. Top-level chrome is minimal: a thin top bar with project identity only.
- Primary navigation lives in a **floating bottom dock** — icon-based, compact, with tooltips on hover. Inspired by OS docks and game HUDs. No visible text labels in default state. Initially 3 icons; expands as context requires.
- Content panels open as **detached floating windows** over the canvas — not page navigations, not sidebar drawers.
- **Breadcrumb header** appears when inside a container node, showing the depth path (e.g. `Home / Blog / Author`). Clicking any segment navigates back to that level.
- Mobile: dock stays at screen bottom, node board transitions to a **vertical card list** view of the current board level — same data, different layout.

```
DESKTOP
┌────────────────────────────────────────────┐
│  ◈ Cartum  /  Blog  /  Author    [avatar] │  ← breadcrumb + top bar
│                                            │
│         [ infinite canvas / node board ]   │
│                                            │
│         ┌──────────────────────┐           │
│         │  ⚙   ⌂   +         │           │  ← floating dock
│         └──────────────────────┘           │
└────────────────────────────────────────────┘

MOBILE
┌──────────────────────┐
│ ◈  Blog / Author   ← │  ← back arrow + breadcrumb
├──────────────────────┤
│ [node card]          │
│ [node card]          │  ← scrollable vertical list
│ [node card]          │
│                      │
├──────────────────────┤
│  ⚙      ⌂      +   │  ← fixed bottom dock
└──────────────────────┘
```

### Mobile & Desktop Layout Strategy

Cartum uses a **split-layout approach**: separate components and page templates per viewport class rather than a single component with heavy Tailwind responsive overrides.

- Desktop layouts live under `/(cms)/layout.desktop.tsx` pattern
- Mobile layouts live under `/(cms)/layout.mobile.tsx` pattern
- A root layout detects the viewport on the server (`user-agent` or CSS `@media` breakpoint via a small client detection hook) and renders the correct layout tree
- Individual components that are shared (data display, forms) are viewport-agnostic; only **layout wrappers and navigation components** are split
- This keeps CSS complexity low, prevents breakpoint collision bugs, and allows truly different interaction models per device (canvas on desktop, card list on mobile)

Guideline: if a component requires more than 2 responsive variants to function correctly across mobile/desktop, it should be split into two components.

### Node Connection Interaction

The visual connection system between container nodes follows a specific interaction model:

1. **Dormant state** — nodes render as cards on the canvas. No connection handles visible.
2. **Hover state** — hovering the cursor near a node's edge reveals **small circular dots** (connection ports) on all four sides of the card.
3. **Drag initiation** — clicking and dragging from a port starts extending a **bezier curve rope-line** that follows the cursor in real time. The origin port glows in accent color.
4. **Target hover** — hovering the rope over another node highlights it as a valid drop target (border pulses in `primary` color).
5. **Connection established** — releasing on a target node creates a permanent animated line between the two. The line shows a directional arrow and a small label for the relationship type.
6. **Rope aesthetics** — lines use `stroke-dasharray` animation on creation (draws itself in), then settle as a smooth bezier curve. Color: `#6366f120` base, `#6366f1` on hover.
7. **Disconnecting** — clicking the midpoint of a line reveals a small `×` badge to delete the connection.

On mobile, connection creation is triggered via **long-press** on a node → a "Connect to..." panel slides up listing available target nodes.

### Transition System — VHS Effect

Every new screen, panel, or significant content area enters with a mandatory **VHS/Cyberpunk transition**:

1. Scanlines sweep top-to-bottom
2. RGB channel shift (brief chromatic aberration)
3. Micro-glitch (horizontal jitter ±4px, irregular timing)
4. Progressive focus-in (blur → sharp)
5. Final clean stable state

Durations:
- Full page / wizard step navigation: `600–800ms`
- Panel / modal open: `300–400ms`
- In-page content swap: `200–300ms`
- Micro-interactions (tooltips, dropdowns): no VHS

### Interaction Patterns

- **Icons over labels**: every control in Builder Mode uses icon-first design. Tooltips on hover reveal function.
- **Drag-first**: nodes are positioned by dragging on the canvas. Relations are created by dragging a connector handle from one node port to another.
- **In-place editing**: field names, node titles, and descriptions are edited directly on the canvas — no separate edit page.
- **Contextual menus**: right-click (or long-press mobile) surfaces a radial floating menu for that element.
- **Live status indicators**: nodes display badges showing record count, API sync state, and active connections — like a system process monitor.

### Two-Mode UI

| Mode | Who sees it | What it shows |
|---|---|---|
| **Builder Mode** | `super_admin`, roles with schema permissions | Full node board, field editor, relation connectors, API configurator |
| **Content Mode** | Editors, viewers, restricted roles | Assigned nodes as clean form interfaces only. No board, no schema, no technical terms |

The switch is automatic and role-determined. Content editors log in and see exactly what they need — nothing more.

---

## ⚙️ Application Architecture

Cartum follows a **layered architecture** adapted for Next.js App Router. It is not classical MVC, but the mental model maps cleanly:

| Classic MVC | Cartum equivalent | Location |
|---|---|---|
| **View** | RSC pages + UI components | `/app/` + `/components/` |
| **Controller** | Server Actions + Client hooks | `/lib/actions/` + `/lib/hooks/` |
| **Model** | TypeScript types + Drizzle schema + DB repositories | `/types/` + `/db/` |

The difference from classical MVC: in Next.js App Router, the View and Controller layers are co-located by convention. The separation is enforced through **file responsibility rules**, not framework tooling.

### Infrastructure Stack

```
Browser (React Client Components)
        ↓
Next.js App Router (RSC + Server Actions + Route Handlers)
        ↓
Service Layer  (/lib/services/)
        ↓
DB Repository  (/db/)  ←→  Drizzle ORM
        ↓
PostgreSQL (Neon / Supabase)
        ↕
Cloudflare R2  (media storage — direct PUT from browser after server-signed URL)
```

---

### Layer Responsibilities

#### 🖼️ View Layer — `/app/` + `/components/`

**Rules:**
- `/app/` pages are **composition only**. They import organisms and layouts. Zero business logic inline.
- Server Components (`page.tsx`, `layout.tsx`) fetch data by calling **Service** functions directly (server-side), never by calling hooks.
- Client Components (`"use client"`) access state and events via **hooks** only.
- No `fetch()` calls inside components. No Drizzle queries inside components.

```
app/
  (cms)/board/page.tsx          → calls getBoardNodes(nodeId) from /lib/services/nodes.ts
  (cms)/board/page.tsx          → passes result as props to <NodeBoard> organism
  (cms)/content/[nodeId]/page.tsx → calls getNodeRecords(nodeId) from /lib/services/records.ts
```

#### 🎮 Controller Layer — `/lib/actions/` + `/lib/hooks/`

Two sub-layers with distinct roles:

**Server Actions** (`/lib/actions/`) — mutations only:
- Called from forms and Client Components via `"use server"` functions
- Each action: validate input → call one service function → return typed result
- Never contain DB queries directly — delegate to services
- Always return a `{ success, data?, error? }` typed result object

```ts
// lib/actions/nodes.ts
export async function createNode(input: CreateNodeInput): Promise<ActionResult<Node>> {
  const validated = CreateNodeSchema.safeParse(input)
  if (!validated.success) return { success: false, error: 'VALIDATION_ERROR' }
  return nodeService.create(validated.data)
}
```

**Client Hooks** (`/lib/hooks/`) — client-side state and derived logic:
- Manage UI state that does not require the server (canvas position, drag state, panel open/close, optimistic updates)
- Call Server Actions for mutations
- Never contain business logic — that lives in services

```ts
// lib/hooks/useNodeBoard.ts
// Handles: node positions on canvas, selection state, zoom level
// Calls: createNode action on + Node confirmation
```

#### 🗄️ Model Layer — `/types/` + `/db/`

Split into two complementary parts:

**Types** (`/types/`) — the source of truth for all shapes:
- Every interface and type defined here, exported and reused everywhere
- No inline types in components, hooks, or actions
- Organized by domain: `nodes.ts`, `records.ts`, `roles.ts`, `project.ts`, `api.ts`

**Database** (`/db/`) — persistence layer:
- `/db/schema/` — Drizzle table definitions (the structural source of truth)
- `/db/repositories/` — one file per domain, containing all raw DB queries
- `/db/adapters/` — adapter selection logic (`neon.ts` | `supabase.ts`)

**Repository pattern** is used between services and the DB:

```
Service → Repository → Drizzle → DB
```

A service never calls Drizzle directly. This makes the DB layer swappable (e.g. mock in tests) and keeps business logic clean.

```ts
// db/repositories/nodes.repository.ts
export const nodesRepository = {
  findById: (id: string) => db.select().from(nodes).where(eq(nodes.id, id)),
  findByParent: (parentId: string | null) => ...,
  create: (data: InsertNode) => db.insert(nodes).values(data).returning(),
  updatePosition: (id: string, x: number, y: number) => ...,
  delete: (id: string) => ...,
}

// lib/services/nodes.service.ts
export const nodeService = {
  create: async (data: CreateNodeInput) => {
    // business logic: validate parent exists, enforce field node constraint, etc.
    return nodesRepository.create(data)
  }
}
```

#### 🌐 API Layer — `/app/api/`

Route Handlers for the **public-facing headless API** (consumed by external frontends):
- Each route resolves which node it maps to and delegates to the service layer
- RBAC is enforced here via middleware — not just in the UI
- Auto-generated from the node schema at runtime; no manual route files per node

```
GET  /api/v1/[nodeName]          → list records
GET  /api/v1/[nodeName]/[id]     → single record
POST /api/v1/[nodeName]          → create record
PUT  /api/v1/[nodeName]/[id]     → update record
DELETE /api/v1/[nodeName]/[id]   → delete record
```

---

### Data Flow — Full Example

Sequence: admin creates a new container node ("Products") on the board.

```
1. User clicks "+ Node" icon in dock
   → opens NodeCreationPanel (Client Component)

2. User fills form and submits
   → NodeCreationPanel calls createNode(input) [Server Action]

3. createNode action
   → validates input with Zod schema
   → calls nodeService.create(data)

4. nodeService.create
   → checks parent exists (if nested)
   → enforces container-only rule at root level
   → calls nodesRepository.create(data)

5. nodesRepository.create
   → runs Drizzle INSERT on nodes table
   → returns created node row

6. Result bubbles back up:
   nodesRepository → nodeService → createNode action → Client Component

7. Client Component receives { success: true, data: Node }
   → triggers VHS transition
   → renders new NodeCard on the canvas

8. useNodeBoard hook updates local canvas state (optimistic)
```

---

## 🧠 Database Strategy

### Use PostgreSQL

Reasons:
- Relationships
- Integrity constraints
- Scalability
- JSONB support

---

### Use PostgreSQL

Reasons:
- Relationships
- Integrity constraints
- Scalability
- JSONB support

---

## 🧩 Internal Tables

| Table | Purpose |
|---|---|
| `nodes` | All nodes: containers and field nodes. Includes `type` (`container` \| `field`), `parent_id` (nullable, FK to `nodes.id`), `position_x`, `position_y` (canvas coordinates), `board_level` |
| `field_meta` | Field-specific metadata per node: `field_type` (`text`\|`number`\|`boolean`\|`image`\|`video`\|`relation`), constraints, default value |
| `relations` | Directed FK connections between container nodes: `source_node_id`, `target_node_id`, `relation_type` (`1:1`\|`1:n`\|`n:m`) |
| `records` | JSONB rows per container node — one row per content entry |
| `roles` | Permission role definitions |
| `role_permissions` | Per-node, per-operation access rules (`node_id`, `role_id`, `can_read`, `can_create`, `can_update`, `can_delete`) |
| `users` | CMS users with hashed passwords and recovery email |
| `users_roles` | User ↔ role assignments |
| `project` | Single row: project name, description, default language, created_at |

---

## 🔌 DB Adapters

Supported:

- Neon
- Supabase
- PlanetScale (optional)

Config:

```
DB_PROVIDER=neon
DATABASE_URL=...
```

---

## 🚀 Deployment Philosophy

### Serverless-first

Works on:
- Vercel
- Cloudflare
- Netlify

---

### Optional VPS Integration

Cartum is **100% serverless** and fully functional without any VPS.

A VPS can be optionally connected to enhance media processing capabilities:

- Configured via **CMS Settings UI** (URL + API Key fields)
- Used only for Tier 2 media processing (see Media Optimization Pipeline)
- Zero coupling — removing the config gracefully falls back to client-side processing
- The VPS is treated as an external API, not as infrastructure owned by Cartum

---

## 🧰 CLI Tool

Command:

```
npx create-cartum-app
```

### Features:
- Scaffold full project with correct folder structure
- Interactive `.env` generator (DB provider, storage keys, auth secret)
- Optional: trigger DB connection test before first run
- Install dependencies
- Print post-setup checklist (what to configure before first access)

---

## 🚨 Startup Error Handling

When the project starts (`pnpm dev` or `pnpm start`), Cartum runs a **startup validation boot sequence** before the Next.js server begins accepting requests. Any configuration problem surfaces immediately in the terminal with a structured error message — not a runtime crash or a silent failure.

### Boot Sequence

```
▶ Cartum — Boot sequence
  Checking environment variables...
  Checking database connection...
  Checking schema integrity...
  Checking storage configuration...
```

### Terminal Error Format

Every error follows this format:

```
✖ [CARTUM_EXXX] Short description of what failed.
  → What this means: explanation in plain language
  → How to fix: actionable step(s)
  → Reference: errores_info.md#EXXX
```

Warnings (non-fatal) use `⚠` instead of `✖` and do not abort startup.

### Error Codes Reference

| Code | Severity | Trigger |
|---|---|---|
| `CARTUM_E001` | Fatal | `DATABASE_URL` env var is missing |
| `CARTUM_E002` | Fatal | Database connection refused or unreachable |
| `CARTUM_E003` | Fatal | `AUTH_SECRET` env var is missing |
| `CARTUM_E004` | Fatal | `DB_PROVIDER` has an invalid value (not `neon` or `supabase`) |
| `CARTUM_E005` | Fatal | Drizzle migrations have not been applied (schema out of sync) |
| `CARTUM_E006` | Fatal | `NODE_ENV` is not set |
| `CARTUM_E007` | Warning | `R2_BUCKET_URL` is not configured — storage features will be unavailable |
| `CARTUM_E008` | Warning | `R2_PUBLIC_URL` is missing — uploaded files will not be publicly accessible |
| `CARTUM_E009` | Warning | `RESEND_API_KEY` is not set — password recovery emails will not be sent |
| `CARTUM_E010` | Info | Setup not completed — `super_admin` record not found. Redirecting to /setup |

Full descriptions, diagnostics, and fix instructions for each code are documented in [`errores_info.md`](./errores_info.md).

### Implementation Notes

- The boot validation runs in `/lib/boot/validate.ts`, executed from `instrumentation.ts` (Next.js instrumentation hook — runs once on server start)
- Fatal errors call `process.exit(1)` after printing the structured message
- Warnings and Info codes log to the terminal and allow startup to continue
- All checks are async and run in parallel where independent; sequential only where one depends on another (e.g. E002 is only checked if E001 passes)
- In production (`NODE_ENV=production`), the same checks run but fatal errors additionally write to a structured log entry before exiting

---

## 📦 Project Structure

```
/app                              → VIEW LAYER — Next.js App Router pages (composition only)
  /setup/                         → First-run wizard steps
  /(cms)/
    /board/                       → Root board (Home level)
    /board/[...nodeId]/           → Nested board levels (any depth)
    /content/[nodeId]/            → Content Mode — record list + form for a given node
    /settings/                    → Settings overlay pages
  /api/
    /v1/[nodeName]/               → Public headless API: list + single record
    /v1/[nodeName]/[id]/          → Public headless API: individual record operations
  layout.tsx                      → Root layout (viewport detection → desktop/mobile)

/components                       → UI COMPONENTS (composable, stateless where possible)
  /ui/
    /atoms/                       → Button, Input, Badge, Icon, Label, Tooltip, Spinner
    /molecules/                   → NodeCard, BreadcrumbBar, FieldBadge, ConnectorPort, DockIcon
    /organisms/                   → NodeBoard, DockBar, NodeCreationPanel, ConnectionLine, SettingsPanel
    /transitions/                 → VHSTransition, FadeIn
    /layouts/
      DesktopLayout.tsx           → Canvas-based infinite board layout
      MobileLayout.tsx            → Scrollable card-list layout
  /external/
    /dnd/                         → @dnd-kit wrappers only: DraggableNode, DroppableZone, SortableList

/lib                              → CONTROLLER LAYER
  /actions/                       → Server Actions (mutations, called from client components)
    nodes.actions.ts              → createNode, updateNode, deleteNode, updateNodePosition
    records.actions.ts            → createRecord, updateRecord, deleteRecord
    roles.actions.ts              → createRole, assignRole, updatePermissions
    setup.actions.ts              → initializeProject, createSuperAdmin
    storage.actions.ts            → getUploadUrl (presigned R2 URL generation)
  /hooks/                         → Client-side state hooks (UI logic only)
    useNodeBoard.ts               → canvas state, zoom, pan, selection
    useConnections.ts             → rope-line drag state, pending connection
    useBreadcrumb.ts              → board depth path, navigation history
    useNodeCreation.ts            → creation panel state and flow
    useToast.ts                    → Sonner wrapper: success/error/promise helpers
  /services/                      → Business logic (pure functions, called by actions + RSC pages)
    nodes.service.ts              → node CRUD with constraint validation
    records.service.ts            → record CRUD with field type validation
    roles.service.ts              → RBAC logic, permission resolution
    setup.service.ts              → wizard orchestration, schema initialization
    media.service.ts              → client-side optimization pipeline orchestration
  /boot/
    validate.ts                   → startup validation — runs via instrumentation.ts
  /i18n/
    t.ts                          → translation utility: t('key.path', locale?)
    getLocale.ts                  → resolves active locale from user/project settings

/locales                          → TRANSLATION DICTIONARIES (plain TS objects, typed)
  en.ts                           → English (default, always complete)
  es.ts                           → Spanish
  index.ts                        → exports union type of all keys, locale map

/db                               → MODEL LAYER — persistence
  /schema/                        → Drizzle table definitions (structural source of truth)
    nodes.schema.ts
    records.schema.ts
    roles.schema.ts
    users.schema.ts
    project.schema.ts
  /repositories/                  → Raw DB queries, one file per domain
    nodes.repository.ts
    records.repository.ts
    roles.repository.ts
    users.repository.ts
  /migrations/                    → Auto-generated by Drizzle — never edit manually
  /adapters/                      → neon.ts | supabase.ts (selected via DB_PROVIDER)
  index.ts                        → exports db instance (adapter-resolved)

/types                            → MODEL LAYER — TypeScript shapes (no logic)
  nodes.ts                        → ContainerNode, FieldNode, NodeType, FieldType, Connection
  records.ts                      → Record, RecordValue, RecordInput
  roles.ts                        → Role, Permission, RolePermission, AccessResult
  project.ts                      → Project, SetupState, SetupStep
  api.ts                          → ApiResponse, PaginatedResponse, ApiError
  actions.ts                      → ActionResult<T> (shared return type for all Server Actions)
  i18n.ts                         → Locale, TranslationKey, Dictionary

/nodes                            → Node resolution engine
  resolver.ts                     → resolves node tree from flat DB rows
  validator.ts                    → validates record values against field type definitions
  api-generator.ts                → derives Route Handler logic from live node schema

/instrumentation.ts               → Next.js hook — runs boot/validate.ts on server start
```

---

## 🌐 Translations & i18n System

Cartum's UI is fully translatable via **plain TypeScript dictionary files**. No external i18n library is required. The system is designed to be immediately understandable — opening any locale file reveals exactly what every string says and where it is used.

### Dictionary Structure

Each locale is a single typed TypeScript file that exports a nested object:

```ts
// locales/en.ts  (English — always the complete reference)
export const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    loading: 'Loading...',
  },
  nodes: {
    create: 'Create node',
    createContainer: 'Create container',
    createField: 'Create field',
    emptyBoard: 'Start by creating your first node →',
    deleteConfirm: 'Delete this node and all its children?',
  },
  fields: {
    types: {
      text: 'Text',
      number: 'Number',
      boolean: 'Boolean',
      image: 'Image',
      video: 'Video',
      relation: 'Relation',
    },
  },
  alerts: {
    nodeCreated: 'Node created successfully.',
    nodeDeleted: 'Node deleted.',
    recordSaved: 'Record saved.',
    uploadSuccess: 'File uploaded.',
    uploadError: 'Upload failed. Check your storage settings.',
    storageNotConfigured: 'Storage not configured — go to Settings → Storage.',
  },
  setup: {
    step0Title: 'System check',
    step1Title: 'Super admin credentials',
    step2Title: 'Project configuration',
    step3Title: 'Initializing...',
    step4Title: 'Ready',
    allSystemsNominal: 'All systems nominal. Proceeding to setup...',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    unauthorized: 'You do not have permission to perform this action.',
    notFound: 'The requested resource was not found.',
    validationFailed: 'Please check the highlighted fields.',
  },
} as const
```

```ts
// locales/es.ts  (Spanish — mirrors the en.ts structure exactly)
export const es = {
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    // ...
  },
  // ...
} satisfies typeof en  // ← enforces 100% key coverage at compile time
```

```ts
// locales/index.ts
import { en } from './en'
import { es } from './es'

export type Locale = 'en' | 'es'
export type Dictionary = typeof en
export type TranslationKey = NestedKeyOf<Dictionary>  // deep key path type

export const dictionaries: Record<Locale, Dictionary> = { en, es }
export const defaultLocale: Locale = 'en'
```

### Translation Utility

```ts
// lib/i18n/t.ts
import { dictionaries, defaultLocale, type Locale } from '@/locales'

export function t(locale: Locale = defaultLocale) {
  return dictionaries[locale]
}
```

**Usage in Server Components (RSC):**
```ts
// page.tsx
const dict = t(await getLocale())  // resolves from project settings / user prefs
return <NodeBoard emptyLabel={dict.nodes.emptyBoard} />
```

**Usage in Client Components:**
```ts
// Locale is passed as prop or via context — no async needed client-side
const { dict } = useDictionary()  // thin context hook
return <Button>{dict.common.save}</Button>
```

### Rules

- **`en.ts` is always the complete reference** — never add a key to any other locale without adding it to `en.ts` first.
- **`satisfies typeof en`** on every non-English locale ensures TypeScript catches missing keys at build time — a missing translation is a type error.
- **No interpolation library needed** for simple strings. For strings with dynamic values, use a lightweight helper: `interpolate(dict.alerts.nodeCreated, { name })`.
- All user-facing strings — UI labels, alerts, error messages, tooltips, placeholders — live in the dictionary. Nothing hardcoded in components.
- Node names and field names created by the user are **not** translatable (they are user data, not system strings).

### Adding a New Language

1. Copy `locales/en.ts` to `locales/[code].ts` (e.g. `locales/fr.ts`)
2. Translate all values. The `satisfies typeof en` constraint will error on any missing key.
3. Add the new locale to the `Locale` union and `dictionaries` map in `locales/index.ts`
4. Optionally add a language selector in Settings → Project.

---

## 🔔 Alert & Notification System

All user-facing feedback (success confirmations, error messages, warnings, info) is handled through a unified notification system. Alert strings always come from the translation dictionary — never hardcoded.

### Notification Types

| Type | Visual | Use case |
|---|---|---|
| `success` | Green accent, checkmark | Record saved, node created, upload complete |
| `error` | Red accent, × | Action failed, validation error, network issue |
| `warning` | Amber accent, triangle | Storage not configured, no email provider |
| `info` | Cyan accent, ℹ | Informational, non-critical feedback |

### Architecture

```
Server Action → returns { success, error? }
     ↓
Client Component receives result
     ↓
calls toast.promise(action, { loading: '...', success: '...', error: '...' })
     ↓
Sonner renders toast (VHS entry animation via classNames)
```

Toasts are rendered by `<Toaster />` placed once in the root layout. No context provider needed.

### useToast Hook

```ts
// lib/hooks/useToast.ts
export function useToast() {
  return {
    success: (msg: string, opts?) => toast.success(msg, opts),
    error: (msg: string, opts?) => toast.error(msg, { duration: 6000, ...opts }),
    promise: toast.promise,
    dismiss: toast.dismiss,
  }
}
```

### Firing Toasts from Server Actions

```ts
// In a client component
toast.promise(createNode(input), {
  loading: dict.alerts.creating,
  success: dict.alerts.nodeCreated,
  error: (err) => dict.errors[err?.code] ?? dict.errors.generic,
})
```

### Toast Design

- Toasts stack at the **bottom-right** of the viewport
- Each toast enters with a compact VHS animation (`toast-vhs-in`, 400ms)
- Auto-dismiss after `duration` ms (default 4s; errors 6s)
- Maximum 3 toasts visible simultaneously (oldest pushed out)
- Clicking a toast dismisses it immediately
- `richColors` + `closeButton` enabled; dark theme matches Cartum palette

---

- **Dynamic schema validation** — user-defined field types validated against JSONB records at runtime
- **Nested board navigation performance** — deep nesting requires efficient DB queries using `parent_id` traversal; consider recursive CTEs for full tree resolution
- **Canvas node positioning** — `position_x` / `position_y` stored per node; must persist on drag end, not on every drag event (debounced save)
- **Connection rope rendering** — bezier SVG paths on a canvas with many nodes require Z-index management and performance culling (off-screen connections not rendered)
- **Mobile connection creation** — dragging ports is impossible on touch; long-press → panel-based connection flow must cover the same functionality
- **Mobile/Desktop layout split** — server-side viewport detection for initial render; client hydration must not cause layout flash
- **Relationship integrity** — deleting a container node that has relations or records requires a cascading warning and confirmation flow
- **Auto-generated API** — must stay in sync with schema changes (node added/deleted/renamed); API routes are derived, not manually defined
- **RBAC at API level** — role/permission checks must happen in Route Handlers, not just in the UI; UI hiding is not a security boundary
- **First-run wizard partial failures** — if setup crashes mid-wizard, the system must detect incomplete state on next access and offer resume or reset
- **R2 bucket URL validation** — before accepting the storage URL, Cartum should test a small upload to confirm access; clear error if it fails
- **Field node orphan prevention** — field nodes must be blocked at the DB constraint level from existing without a `parent_id` pointing to a container

---

## 🔥 Future Enhancements

| Enhancement | Description |
|---|---|
| Node versioning | Audit log + record history per node |
| Visual UI Builder | Drag-and-drop frontend builder powered by node data |
| Plugin system | Installable field types, API middleware, and UI panels |
| Multi-language (i18n) | Per-field translation support |
| Webhooks | Trigger external services on record create/update/delete |
| API token management | Scoped read/write tokens per node for headless consumers |
| Multi-project support | (post-v1) Allow one instance to manage multiple projects with separate DBs |

---

## 🧠 Final Insight

Cartum is not just a CMS.

It is a:

> Visual Backend Builder + Headless CMS + API Engine

But equally important: it is a tool that respects both the developer who builds and the human who manages.

A developer installs Cartum once, models the data on a node board, and hands over the URL. A non-technical client opens it, sees their content types as clean forms, and starts working — without a tutorial, without support, without ever knowing there is a PostgreSQL database behind it.

The measure of Cartum's success is not how powerful the schema editor is. It is whether someone who has never heard of a headless CMS can create their first article in under 60 seconds after logging in.

