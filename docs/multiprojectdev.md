# Arquitectura Multiproyecto / Multi-Project Architecture

**[Español](#español) · [English](#english)**

---

## Español

### Modelo de cápsulas

Cada proyecto en Cartum es una cápsula completamente aislada. Todos los recursos tienen una FK `projectId` no nula que actúa como barrera de aislamiento absoluta:

| Tabla | Qué contiene |
|---|---|
| `nodes` | Mazos y cartas del tablero |
| `records` | Registros de contenido |
| `media` | Imágenes y videos |
| `api_tokens` | Tokens de la API pública |
| `project_memberships` | Jugadores asignados al proyecto |

No existe "contenido global". Toda query de la capa de negocio pasa por `requireProjectId()` y se escopa siempre a un `projectId` concreto. Mezclar datos entre proyectos es imposible por diseño.

### Habilitar multiproyecto: CARTUM_NEW_PLAYER

Por defecto Cartum opera en modo mono-tenant: el super admin es el único propietario y gestiona todos los proyectos desde una sola instalación. Los demás usuarios solo pueden acceder si son invitados explícitamente.

Para habilitar la plataforma en modo multi-cliente, activa la variable de entorno:

```env
CARTUM_NEW_PLAYER=true
```

Con esta variable activa, la ruta `/cartum-player` queda pública y permite a cualquier persona registrarse, crear su propia cuenta y gestionar su propio proyecto de forma completamente independiente. Sin ella, esa ruta devuelve `notFound()` y nadie puede auto-registrarse.

**Caso de uso principal:** una agencia o freelancer que quiere ofrecer un CMS independiente a cada cliente. Cada cliente entra en `/cartum-player`, se registra, obtiene su propio tablero y gestiona su contenido sin ver el de los demás ni compartir infraestructura lógica.

### Sesión y cambio de proyecto

El token JWT incluye `currentProjectId`. El cambio de proyecto se realiza mediante una cookie de corta duración para no invalidar toda la sesión:

```
TopBar → selector de proyecto → updateSessionProject(projectId)
  └→ cookie 'cartum-project-switch' (TTL: 60 segundos)
     └→ JWT callback lee la cookie en el siguiente request
        └→ token.currentProjectId = switchValue
           └→ cookie se consume (no se relee en requests posteriores)
```

El guard `requireProjectId()` en cada Server Action lee `session.user.currentProjectId`. Si es `null`, rechaza la operación. Si el JWT es antiguo y no tiene el campo, el callback hace backfill automático con el primer proyecto del usuario.

### Sistema de invitaciones

Los administradores de proyecto invitan jugadores desde Ajustes → Miembros. El flujo técnico:

1. Se generan 32 bytes aleatorios (`crypto.randomBytes(32)`)
2. Se almacena el **hash SHA-256** del token en la DB — el token raw nunca se persiste
3. El email contiene el link `/invite/{rawToken}`
4. Al visitar el link, el servidor hace `SHA-256(rawToken)` y busca la fila por `tokenHash`
5. Expiración: 7 días desde la creación. El admin puede reenviar, lo que regenera el token

Cuatro casos de aceptación al visitar el link:

| Caso | Situación | Comportamiento |
|---|---|---|
| A | Sesión activa, email coincide con la invitación | Botón directo "Unirme al tablero" |
| B | Sesión activa, email diferente | Advertencia: cuenta incorrecta, opción de cerrar sesión |
| C | Sin sesión, el email ya tiene cuenta | Formulario de login con credenciales |
| D | Sin sesión, email sin cuenta | Formulario de registro completo |

Tras aceptar, el jugador queda registrado en `project_memberships` con el rol asignado y la invitación se marca como `acceptedAt`.

### Almacenamiento: reglas de acceso por rol

El super admin puede configurar y usar tanto **Cloudflare R2** como **Vercel Blob**. Los usuarios que no son super admin (admin, editor, viewer) solo pueden subir archivos a **Cloudflare R2**. Vercel Blob no aparece como opción disponible en su interfaz de ajustes de storage.

| Tipo de usuario | Cloudflare R2 | Vercel Blob |
|---|---|---|
| Super Admin | Sí (configurar + subir) | Sí (configurar + subir) |
| Admin / Editor / Viewer | Sí (solo subir) | No disponible |

Esta restricción existe porque Vercel Blob está vinculado a la cuenta de infraestructura del super admin. Exponerlo a usuarios externos supondría que cualquier cliente podría consumir el almacenamiento de Blob del propietario de la instalación.

### Organización de archivos en storage

Los archivos se organizan bajo un prefijo por proyecto dentro del bucket:

```
uploads/{projectId}/{uuid}.ext           ← imágenes (R2 presigned o Blob)
uploads/{projectId}/videos/{uuid}.ext    ← videos (Blob)
uploads/{projectId}/{uuid}.webp          ← imágenes optimizadas vía Optimus VPS
```

Esta estructura permite purgar todos los assets de un proyecto con un solo prefix query al bucket, y aísla completamente los archivos entre proyectos. El sweep de huérfanos en `db.actions.ts` usa `Prefix: 'uploads/'` y captura todo independientemente del subprefijo de proyecto.

### Reset y ciclo de vida de datos

El super admin puede resetear toda la DB desde Ajustes → DB. El reset ejecuta:

1. Purga de storage (R2 + Blob) basada en las filas de `media` como inventario
2. Sweep de huérfanos: archivos en el bucket no registrados en DB
3. Borrado FK-safe de todas las tablas de datos: `media`, `nodes`, `records`, `roles`, `users`, `project`, etc.
4. Las tablas `project_memberships` y `project_invitations` se limpian en cascada al borrar `project` y `users`
5. `user_email_registry` se preserva deliberadamente — controla el historial de emails para el sistema de trial

El usuario queda deslogueado y redirigido al wizard de setup en `/setup/locale`.

### Variables de entorno relevantes

```env
# Habilita el registro público en /cartum-player
CARTUM_NEW_PLAYER=true

# Cloudflare R2
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://media.tu-dominio.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Vercel Blob (solo configurable por super admin)
BLOB_READ_WRITE_TOKEN=
```

### Archivos relevantes

| Archivo | Responsabilidad |
|---|---|
| `auth.ts` | JWT callback: switch cookie, backfill de `currentProjectId` en sesiones antiguas |
| `lib/auth/get-project-id.ts` | `requireProjectId()`, `assertProjectAccess()` — guards de scope por proyecto |
| `lib/services/invitations.service.ts` | Generación de tokens, envío de email, lógica de aceptación |
| `lib/actions/invitations.actions.ts` | Server Actions: send, revoke, resend, accept (4 casos) |
| `app/invite/[token]/page.tsx` | Página pública de aceptación de invitación |
| `app/cartum-player/page.tsx` | Registro público (requiere `CARTUM_NEW_PLAYER=true`) |
| `db/schema/project-memberships.schema.ts` | FK cascade desde `users` y `project` |
| `db/schema/project-invitations.schema.ts` | `tokenHash`, `expiresAt`, `acceptedAt` |
| `lib/actions/media.actions.ts` | Keys de storage con prefijo `uploads/{projectId}/` |
| `lib/actions/db.actions.ts` | `resetCmsAction`: purge + borrado FK-safe + preserva `user_email_registry` |

---

## English

### Capsule model

Each project in Cartum is a fully isolated capsule. All resources have a non-nullable `projectId` FK that acts as an absolute isolation barrier:

| Table | What it holds |
|---|---|
| `nodes` | Board decks and cards |
| `records` | Content records |
| `media` | Images and videos |
| `api_tokens` | Public API tokens |
| `project_memberships` | Players assigned to the project |

There is no "global content". Every query in the business layer goes through `requireProjectId()` and is always scoped to a specific `projectId`. Mixing data between projects is impossible by design.

### Enabling multi-project: CARTUM_NEW_PLAYER

By default Cartum operates in single-tenant mode: the super admin is the sole owner and manages all projects from one installation. Other users can only access it if explicitly invited.

To enable the platform in multi-client mode, activate the environment variable:

```env
CARTUM_NEW_PLAYER=true
```

With this variable active, the `/cartum-player` route becomes public and allows anyone to register, create their own account, and manage their own project completely independently. Without it, that route returns `notFound()` and no one can self-register.

**Primary use case:** an agency or freelancer who wants to offer an independent CMS to each client. Each client visits `/cartum-player`, registers, gets their own board, and manages their content without seeing anyone else's or sharing any logical infrastructure.

### Session and project switching

The JWT token includes `currentProjectId`. Project switching uses a short-lived cookie to avoid invalidating the entire session:

```
TopBar → project selector → updateSessionProject(projectId)
  └→ cookie 'cartum-project-switch' (TTL: 60 seconds)
     └→ JWT callback reads the cookie on the next request
        └→ token.currentProjectId = switchValue
           └→ cookie is consumed (not re-read on subsequent requests)
```

The `requireProjectId()` guard in every Server Action reads `session.user.currentProjectId`. If it is `null`, the operation is rejected. If the JWT is old and does not have the field, the callback automatically backfills it with the user's first project.

### Invitation system

Project admins invite players from Settings → Members. The technical flow:

1. 32 random bytes are generated (`crypto.randomBytes(32)`)
2. The **SHA-256 hash** of the token is stored in the DB — the raw token is never persisted
3. The email contains the link `/invite/{rawToken}`
4. When visiting the link, the server computes `SHA-256(rawToken)` and looks up the row by `tokenHash`
5. Expiry: 7 days from creation. The admin can resend, which regenerates the token

Four acceptance cases when visiting the link:

| Case | Situation | Behavior |
|---|---|---|
| A | Active session, email matches the invitation | Direct "Join the board" button |
| B | Active session, different email | Warning: wrong account, option to sign out |
| C | No session, email already has an account | Login form with credentials |
| D | No session, email has no account | Full registration form |

After accepting, the player is registered in `project_memberships` with the assigned role and the invitation is marked with `acceptedAt`.

### Storage: access rules by role

The super admin can configure and use both **Cloudflare R2** and **Vercel Blob**. Users who are not super admin (admin, editor, viewer) can only upload files to **Cloudflare R2**. Vercel Blob does not appear as an available option in their storage settings UI.

| User type | Cloudflare R2 | Vercel Blob |
|---|---|---|
| Super Admin | Yes (configure + upload) | Yes (configure + upload) |
| Admin / Editor / Viewer | Yes (upload only) | Not available |

This restriction exists because Vercel Blob is tied to the super admin's infrastructure account. Exposing it to external users would allow any client to consume the installation owner's Blob storage.

### File organization in storage

Files are organized under a per-project prefix within the bucket:

```
uploads/{projectId}/{uuid}.ext           ← images (R2 presigned or Blob)
uploads/{projectId}/videos/{uuid}.ext    ← videos (Blob)
uploads/{projectId}/{uuid}.webp          ← optimized images via Optimus VPS
```

This structure allows purging all assets for a project with a single bucket prefix query, and completely isolates files between projects. The orphan sweep in `db.actions.ts` uses `Prefix: 'uploads/'` and captures everything regardless of the project subprefix.

### Reset and data lifecycle

The super admin can reset the entire DB from Settings → DB. The reset executes:

1. Storage purge (R2 + Blob) using `media` rows as inventory
2. Orphan sweep: files in the bucket not registered in the DB
3. FK-safe deletion of all data tables: `media`, `nodes`, `records`, `roles`, `users`, `project`, etc.
4. `project_memberships` and `project_invitations` are cleaned via cascade when `project` and `users` are deleted
5. `user_email_registry` is deliberately preserved — it controls email history for the trial system

The user is logged out and redirected to the setup wizard at `/setup/locale`.

### Relevant environment variables

```env
# Enables public registration at /cartum-player
CARTUM_NEW_PLAYER=true

# Cloudflare R2
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://media.your-domain.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Vercel Blob (configurable by super admin only)
BLOB_READ_WRITE_TOKEN=
```

### Relevant files

| File | Responsibility |
|---|---|
| `auth.ts` | JWT callback: switch cookie, `currentProjectId` backfill for stale sessions |
| `lib/auth/get-project-id.ts` | `requireProjectId()`, `assertProjectAccess()` — per-project scope guards |
| `lib/services/invitations.service.ts` | Token generation, email sending, acceptance logic |
| `lib/actions/invitations.actions.ts` | Server Actions: send, revoke, resend, accept (4 cases) |
| `app/invite/[token]/page.tsx` | Public invitation acceptance page |
| `app/cartum-player/page.tsx` | Public registration (requires `CARTUM_NEW_PLAYER=true`) |
| `db/schema/project-memberships.schema.ts` | FK cascade from `users` and `project` |
| `db/schema/project-invitations.schema.ts` | `tokenHash`, `expiresAt`, `acceptedAt` |
| `lib/actions/media.actions.ts` | Storage keys with `uploads/{projectId}/` prefix |
| `lib/actions/db.actions.ts` | `resetCmsAction`: purge + FK-safe delete + preserves `user_email_registry` |
