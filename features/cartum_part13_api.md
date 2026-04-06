# Part 13 — Headless API

## Goal
Build the auto-generated REST API that external frontends consume. Endpoints are derived directly from the live node schema — no manual route file per data type. RBAC is enforced via API tokens.

## Prerequisites
- Part 02 (records repository, nodes repository)
- Part 05 (RBAC logic)
- Part 06 (node resolver, full tree)

---

## API Route Structure

```
GET    /api/v1/[nodeName]               → list records (paginated)
GET    /api/v1/[nodeName]/[id]          → single record
POST   /api/v1/[nodeName]               → create record
PUT    /api/v1/[nodeName]/[id]          → update record (full)
PATCH  /api/v1/[nodeName]/[id]          → update record (partial)
DELETE /api/v1/[nodeName]/[id]          → delete record
```

`[nodeName]` is the **slug** of a root-level container node (lowercased, spaces → hyphens).
Example: container named "Blog Posts" → `/api/v1/blog-posts`.

Only **root-level container nodes** are exposed via the API (not nested sub-containers, not field nodes).

---

## Route Handler: Dynamic

### `/app/api/v1/[nodeName]/route.ts`
### `/app/api/v1/[nodeName]/[id]/route.ts`

Both handlers follow the same pattern:

1. Resolve `nodeName` → `node_id` via `nodeService.findBySlug(nodeName)`
2. Return 404 if node not found
3. Authenticate request (resolveApiAuth — see API Authentication section below)
4. Authorize via RBAC
5. Delegate to `recordsService`
6. Return JSON response

```ts
// GET /api/v1/[nodeName]
export async function GET(req: Request, { params }: { params: { nodeName: string } }) {
  const node = await nodeService.findBySlug(params.nodeName)
  if (!node) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await resolveApiAuth(req)
  if (!auth) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const allowed = await rolesService.canPerform(auth.userId, node.id, 'read')
  if (!allowed) return Response.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { page, limit } = parseQueryParams(req)
  const result = await recordsService.getByNodeId(node.id, { page, limit })

  return Response.json(result)
}
```

---

## Node Slug Resolution

### `/nodes/api-generator.ts`
```ts
export function nodeNameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// Stored in DB: add `slug` column to nodes table (generated on create, unique at root level)
// /db/schema/nodes.schema.ts → add: slug text UNIQUE (nullable — only for root containers)
```

---

## API Authentication: Token-based

API consumers authenticate with **API tokens** — not session cookies.

### DB Schema Addition

```
Table: api_tokens
- id           uuid PK
- name         text NOT NULL          (human-readable label, e.g. "Frontend App")
- token_hash   text UNIQUE NOT NULL   (SHA-256 of the raw token — never stored plaintext)
- role_id      uuid FK → roles.id     (token inherits permissions of this role)
- created_at   timestamp default now()
- last_used_at timestamp (nullable)
- expires_at   timestamp (nullable)
- revoked_at   timestamp (nullable)
```

### Token Resolution

```ts
// lib/api/auth.ts
export async function resolveApiAuth(req: Request): Promise<ApiAuth | null> {
  const bearer = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!bearer) return null

  const tokenHash = hashToken(bearer)   // SHA-256
  const token = await apiTokensRepository.findByHash(tokenHash)

  if (!token) return null
  if (token.revokedAt) return null
  if (token.expiresAt && token.expiresAt < new Date()) return null

  // Update last_used_at asynchronously (non-blocking)
  apiTokensRepository.updateLastUsed(token.id)

  return { userId: null, roleId: token.roleId, tokenId: token.id }
}
```

RBAC checks for API tokens use the `role_id` from the token, not a specific user.

---

## Query Parameters

`GET /api/v1/[nodeName]` accepts:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Pagination page |
| `limit` | number | 20 | Records per page (max: 100) |
| `sort` | string | `created_at` | Field name to sort by |
| `order` | `asc`\|`desc` | `desc` | Sort direction |
| `include` | string | — | Comma-separated relation field names to expand |

### `include` — Relation Expansion

```
GET /api/v1/posts?include=author
```

Cartum resolves `author` as a `relation` field in the `posts` node and joins the related records:

```json
{
  "id": "...",
  "title": "Hello world",
  "author": {
    "id": "...",
    "name": "Jane"
  }
}
```

Relation expansion is limited to **one level deep** in v1 to avoid N+1 query spirals.

---

## Response Format

### List response
```json
{
  "data": [ { "id": "...", "fieldName": "value", ... } ],
  "meta": {
    "total": 48,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Single record response
```json
{
  "data": { "id": "...", "title": "Hello", "author": { ... } }
}
```

### Error response
```json
{
  "error": "NOT_FOUND",
  "message": "No node with slug 'blog-posts' was found."
}
```

---

## API Token Management Actions

### `/lib/actions/api-tokens.actions.ts`
```ts
createApiToken(input: CreateApiTokenInput): Promise<ActionResult<{ token: string, meta: ApiToken }>>
// Returns the raw token ONCE — never again. Hash is stored in DB.

listApiTokens(): Promise<ActionResult<ApiToken[]>>
revokeApiToken(tokenId: string): Promise<ActionResult>
```

The UI for managing tokens is in Part 17 (Settings → API).

---

## Security Notes

- Raw tokens are never stored — only SHA-256 hashes
- Tokens are returned once on creation (user must copy immediately)
- Expired and revoked tokens return 401, not 403 (don't leak existence details)
- `limit` max is capped at 100 server-side to prevent resource exhaustion
- All API routes are rate-limited by IP (via Next.js middleware or hosting provider)

---

## Acceptance Criteria

- [ ] `GET /api/v1/blog-posts` with valid token returns paginated records
- [ ] `GET /api/v1/unknown` returns 404
- [ ] Request with no Authorization header returns 401
- [ ] Request with revoked token returns 401
- [ ] Request with valid token but restricted role returns 403
- [ ] `?include=author` expands the relation field inline
- [ ] `?limit=200` is capped to 100
- [ ] `POST /api/v1/blog-posts` with valid token + body creates a record
- [ ] Response format matches documented structure (data + meta for lists)
- [ ] `createApiToken()` returns raw token once, stores only hash
