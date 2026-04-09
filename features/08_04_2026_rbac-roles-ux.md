# RBAC — UX de Roles y Sistema de Permisos por Sección

**Fecha:** 08/04/2026
**Estado:** Completado
**Prioridad:** Alta
**Área:** Backend (DB/schema) + Frontend (Settings UX) + Auth gate

---

## Contexto y Problema

El sistema de RBAC existe en la arquitectura (`roles`, `role_permissions`, `users_roles`) pero:

1. La sección de **Roles** en el modal de Ajustes tiene UX deficiente
2. Los permisos de nodos del tablero principal no filtran la visibilidad real en UI
3. No existe granularidad por **sección del menú de Ajustes** (solo existe `canAccess: true/false` global para `superAdminOnly` o `adminOk`)
4. El rol `restringido` no bloquea el acceso al CMS en login
5. Admin no tiene restricciones claras sobre qué puede editar de otros roles
6. **No existe protección server-side por URL directa**: cualquier usuario autenticado puede acceder a `/cms/content/[nodeId]` o `/cms/board/[...nodeId]` escribiendo la URL, sin importar si tiene permiso sobre ese nodo

---

## Roles del sistema

| Rol | Nivel | Quién puede editar |
|---|---|---|
| `superAdmin` | Sistema (flag `isSuperAdmin` en tabla `users`) | Nadie — no editable desde UI |
| `admin` | Rol default | Solo `superAdmin` puede editar sus permisos |
| `editor` | Rol default | `superAdmin` y `admin` |
| `lector` | Rol default | `superAdmin` y `admin` |
| `restringido` | Rol default | `superAdmin` y `admin` |

---

## Alcance

### 1. Extensión de schema — Permisos por sección de Ajustes

El `role_permissions` actual solo cubre nodos (CRUD). Falta una tabla para secciones del menú.

**Nueva tabla: `role_section_permissions`**

```
roleId       → FK roles.id (cascade delete)
section      → text (enum: project | appearance | account | email | storage | users | roles | api | db | info)
canAccess    → boolean default false
PRIMARY KEY  → (roleId, section)
```

**Permisos de sección por defecto:**

| Sección | superAdmin | admin | editor | lector | restringido |
|---|---|---|---|---|---|
| project | ✅ | ✅ | ❌ | ❌ | ❌ |
| appearance | ✅ | ✅ | ✅ | ✅ | ❌ |
| account | ✅ | ✅ | ✅ | ✅ | ❌ |
| email | ✅ | ✅ | ❌ | ❌ | ❌ |
| storage | ✅ | ✅ | ❌ | ❌ | ❌ |
| users | ✅ | ✅ | ❌ | ❌ | ❌ |
| roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| api | ✅ | ✅ | ❌ | ❌ | ❌ |
| db | ✅ | ✅* | ❌ | ❌ | ❌ |
| info | ✅ | ✅ | ✅ | ✅ | ❌ |

> \* `admin` tiene acceso a `db` pero **sin ver la zona de peligro** — esto se controla con un flag adicional `dangerZone` en `DbSection.tsx` según `isSuperAdmin`.

---

### 2. Seed de roles por defecto

Script que garantiza la existencia de los 4 roles con sus configuraciones base.

Archivo: `db/seeds/default-roles.seed.ts`

- Roles: `admin`, `editor`, `lector`, `restringido`
- Descripción en español para cada uno
- `role_section_permissions` insertados con valores de la tabla anterior
- `role_permissions` para nodos: por defecto, `admin` y `editor` tienen `canRead: true` en todos los nodos container existentes; `lector` solo `canRead: true`; `restringido` todo en `false`

---

### 3. Auth gate — Rol restringido

En `lib/actions/auth.actions.ts`, la función `loginAction` (o en `auth.ts` → callback):

- Después de login exitoso, si el único rol del usuario es `restringido` → NO redirigir al CMS
- Retornar error específico `{ error: 'account_disabled' }` al cliente
- El cliente (`LoginForm`) muestra `toast.error(dict.accountDisabled)` y no avanza

**Clave i18n a agregar:**
```
auth.login.accountDisabled → 'Tu cuenta está deshabilitada. Contacta al administrador.'
```

---

### 4. Filtro de visibilidad de nodos en el tablero

El board principal solo mostrará los nodos container que el rol actual puede leer (`canRead: true`).

- `rolesService.getAccessibleNodes(userId)` ya existe — usarlo en la query del board
- Nodos con `canRead: false` para el rol: **no se listan, no se renderizan, no se muestran en ningún tipo de relación visible**
- `superAdmin` siempre ve todos los nodos (bypass existente)

**Archivos afectados:**
- `lib/hooks/useNodes.ts` (o la Server Action que carga nodos al board)
- `app/cms/board/page.tsx` o el componente que lista nodos

---

### 5. Protección de rutas por URL (Server-side Guard)

Un usuario puede conocer el `nodeId` de un nodo al que no tiene acceso e intentar acceder directamente vía URL. El sistema debe bloquearlo en el servidor, sin depender de la UI.

**Rutas CMS con contenido protegido por permisos de nodo:**

| Ruta | Operación requerida |
|---|---|
| `/cms/board/[...nodeId]` | `canRead` en ese nodo |
| `/cms/content/[nodeId]` | `canRead` en ese nodo |
| `/cms/content/[nodeId]/new` | `canCreate` en ese nodo |
| `/cms/content/[nodeId]/[recordId]` | `canRead` en ese nodo |

**Capas de protección (en orden de ejecución):**

#### Capa 1 — Middleware (JWT, sin DB)
`middleware.ts` ya gestiona sesión. Se extiende para detectar, con solo el JWT, si el usuario tiene el rol `restringido` como único rol → redirige a `/login?error=disabled` antes de que llegue al Server Component. Esta capa es rápida (0 queries).

#### Capa 2 — Server Component (Guard DB)
En cada `page.tsx` con `[nodeId]`, se llama a `requirePermission(nodeId, operacion)` del guard existente en `lib/rbac/guard.ts` antes de renderizar. Si el acceso es denegado:
- `notFound()` — el nodo no existe para ese usuario (preferred: evita enumeration)
- O bien redirect a `/cms/board` con toast de acceso denegado

`superAdmin` bypasses automáticamente (lógica ya implementada en `guard.ts`).

**Comportamiento por caso:**

| Situación | Resultado |
|---|---|
| Usuario sin `canRead` accede a `/cms/content/[nodeId]` | → `notFound()` |
| Usuario sin `canCreate` accede a `/cms/content/[nodeId]/new` | → `notFound()` |
| Usuario `restringido` accede a cualquier ruta `/cms/*` | → redirect `/login?error=disabled` |
| `superAdmin` accede a cualquier ruta | → siempre permitido |

**Nota**: Las Server Actions ya están protegidas con `requirePermission` en `guard.ts` — esta fase cubre solo la capa de páginas que aún no tienen el guard.

---

### 6. Filtro de secciones en SettingsPanel

`SettingsPanel.tsx` actualmente filtra por `isSuperAdmin` e `isAdmin` en el array `ALL_SECTIONS`. Se añade una tercera fuente: `sectionPermissions` cargadas desde DB para el usuario actual.

**Lógica:**
```
superAdmin → ve todo (bypass, sin consultar DB)
admin      → ve lo que tiene en role_section_permissions + ocultamos dangerZone en DbSection
otros      → solo secciones con canAccess: true en role_section_permissions
```

**Prop adicional en SettingsPanel:**
```ts
sectionPermissions: Record<string, boolean>  // { appearance: true, account: true, ... }
```

Cargada en el Server Component padre (`app/cms/layout.tsx` o el trigger del panel).

---

### 7. Rediseño UX de RolesSection

**Layout propuesto para desktop (dentro del modal de Ajustes, columna derecha):**

```
┌─────────────────────────────────────────────────────┐
│ ROLES DEL SISTEMA                         [+ Nuevo] │
├──────────────┬──────────────────────────────────────┤
│              │  ┌────────────────────────────────┐  │
│ ● superAdmin │  │  editor          [solo lectura] │  │
│   admin      │  │  Permisos de nodos              │  │
│ ▶ editor     │  │  ┌──────────────────────────┐   │  │
│   lector     │  │  │ Nodo: Artículos         │   │  │
│   restringido│  │  │ [Leer] [Crear] [Editar] [Borrar]│  │
│              │  │  │ Nodo: Categorías         │   │  │
│              │  │  │ [Leer] [Crear] [Editar] [Borrar]│  │
│              │  │  └──────────────────────────┘   │  │
│              │  │                                  │  │
│              │  │  Acceso a Ajustes               │  │
│              │  │  ┌──────────────────────────┐   │  │
│              │  │  │ Apariencia         [✓]   │   │  │
│              │  │  │ Cuenta             [✓]   │   │  │
│              │  │  │ Información        [✓]   │   │  │
│              │  │  └──────────────────────────┘   │  │
│              │  │                  [Guardar cambios]│  │
│              │  └────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────┘
```

**Reglas de edición en la UI:**

| Actor | Puede editar |
|---|---|
| `superAdmin` | `admin`, `editor`, `lector`, `restringido` |
| `admin` | `editor`, `lector`, `restringido` |
| Ninguno | `superAdmin` (nunca editable) |

- `superAdmin` aparece en la lista con badge `SISTEMA` y sin toggles activos
- Cambios de permisos se guardan con debounce o con botón explícito "Guardar cambios"
- Toast de confirmación al guardar: `toast.success(dict.roles.saved)`
- Si no tiene permisos para editar un rol: toggles en `disabled` + tooltip "Sin permisos"

**Componentes a crear/modificar:**
```
components/ui/organisms/settings/RolesSection.tsx     ← rediseño completo
components/ui/molecules/RolePermissionMatrix.tsx      ← grid de permisos de nodos
components/ui/molecules/SectionPermissionList.tsx     ← lista de acceso a secciones
components/ui/atoms/PermissionToggle.tsx              ← toggle individual (variante cva)
types/roles.ts                                        ← añadir SectionPermission, RoleEditorContext
lib/actions/roles.actions.ts                          ← añadir updateSectionPermissions
```

---

## Plan de implementación por fases

### Fase 1 — Schema y seed (Backend)

- [ ] Crear `db/schema/role-section-permissions.schema.ts`
- [ ] Exportar desde `db/schema/index.ts`
- [ ] Crear migración SQL `0006_role_section_permissions.sql`
- [ ] Crear `db/seeds/default-roles.seed.ts` con los 4 roles + section permissions por defecto
- [ ] Extender `lib/services/roles.service.ts`: añadir `getSectionPermissions(roleId)` y `setSectionPermissions(roleId, permissions)`
- [ ] Extender `lib/actions/roles.actions.ts`: añadir `updateSectionPermissionsAction`
- [ ] Extender `types/roles.ts`: `SectionPermission`, `SectionKey`, `RoleEditorContext`
- [ ] Añadir claves i18n en `locales/en.ts` y `locales/es.ts` para `roles.*`

### Fase 2 — Auth gate (Restringido)

- [ ] Modificar `auth.ts` callback o `loginAction`: detectar rol único `restringido`
- [ ] Retornar error `account_disabled` al cliente
- [ ] Manejar el error en `LoginForm.tsx` con `toast.error(dict.login.accountDisabled)`
- [ ] Añadir clave i18n `accountDisabled`

### Fase 3 — Filtro de nodos en board

- [ ] Modificar la carga de nodos para aplicar `getAccessibleNodes` por usuario
- [ ] Nodos sin `canRead` no se incluyen en la respuesta
- [ ] Test manual: usuario `lector` sin permiso en un nodo no lo ve

### Fase 4 — Filtro de secciones en SettingsPanel

- [ ] Crear `lib/services/roles.service.ts → getSectionPermissionsForUser(userId)`
- [ ] Pasar `sectionPermissions` como prop al `SettingsPanel`
- [ ] Modificar `ALL_SECTIONS` filter en `SettingsPanel.tsx` para incluir lógica de `sectionPermissions`
- [ ] `DbSection.tsx`: ocultar zona de peligro si `!isSuperAdmin`

### Fase 5 — Rediseño RolesSection UX- [ ] Crear `PermissionToggle.tsx` atom con variantes `cva` (enabled/disabled/readonly)
- [ ] Crear `RolePermissionMatrix.tsx` molecule (grid de nodos × operaciones CRUD)
- [ ] Crear `SectionPermissionList.tsx` molecule (lista toggles de secciones de ajustes)
- [ ] Rediseñar `RolesSection.tsx`:
  - Lista lateral de roles
  - Panel derecho con las dos sub-secciones (nodos y ajustes)
  - `superAdmin` listado pero readonly con badge `SISTEMA`
  - Restricción de edición según `isSuperAdmin` o `isAdmin`
  - Botón "Guardar cambios" con `toast.success` / `toast.error`
- [ ] Hacer visible la sección `roles` para `admin` (no solo `superAdmin`)
- [ ] Responsive: en mobile, roles como tabs horizontales, permisos apilados debajo

### Fase 6 — Protección server-side por URL

- [ ] Extender `middleware.ts`: detectar rol único `restringido` desde el JWT → redirect `/login?error=disabled` en rutas `/cms/*`
- [ ] `app/cms/board/[...nodeId]/page.tsx`: llamar `requirePermission(nodeId, 'read')` antes de renderizar → `notFound()` si denegado
- [ ] `app/cms/content/[nodeId]/page.tsx`: `requirePermission(nodeId, 'read')` → `notFound()` si denegado
- [ ] `app/cms/content/[nodeId]/new/page.tsx`: `requirePermission(nodeId, 'create')` → `notFound()` si denegado
- [ ] `app/cms/content/[nodeId]/[recordId]/page.tsx`: `requirePermission(nodeId, 'read')` → `notFound()` si denegado
- [ ] `superAdmin` bypasses todos los guards (comportamiento existente en `guard.ts` — no requiere cambios)
- [ ] Test manual: copiar URL de un nodo restringido en otra sesión → recibir 404

---

## Criterios de aceptación

### CA-1 — Roles visibles en Ajustes
- [x] Los 4 roles (`admin`, `editor`, `viewer`, `restricted`) se listan en la sección Roles del modal de Ajustes cuando el usuario es `admin` o `superAdmin`
- [x] `superAdmin` aparece en la lista con badge "SISTEMA" sin controles editables
- [x] Los roles muestran su nombre y descripción

### CA-2 — Restricciones de edición entre roles
- [x] `superAdmin` puede editar todos los roles excepto el suyo propio
- [x] `admin` puede editar `editor`, `viewer`, `restricted` pero NO `admin` ni `superAdmin`
- [x] Los toggles del rol `admin` aparecen `disabled` cuando el usuario logueado es `admin`

### CA-3 — Permisos de nodos (tablero)
- [x] La sección de roles muestra la lista de nodos del tablero principal (type = 'container', parentId = null)
- [x] Por cada nodo: toggles individuales para Leer, Crear, Editar, Borrar
- [x] Guardar actualiza `role_permissions` vía Server Action
- [x] Toast de éxito al guardar
- [x] En el board: usuario con `canRead: false` en un nodo no lo ve listado

### CA-4 — Permisos de secciones de Ajustes
- [x] La sección de roles muestra la lista de secciones del menú de Ajustes
- [x] Por cada sección: toggle "Permitir acceso"
- [x] Guardar actualiza `role_section_permissions`
- [x] En el modal de Ajustes: las secciones sin acceso no se muestran para ese rol
- [x] `admin` siempre tiene acceso a `db` pero la zona de peligro solo es visible para `superAdmin`

### CA-5 — Rol restringido bloquea acceso al CMS
- [x] Usuario con rol `restricted` (y sin otro rol activo) no puede entrar al CMS
- [x] Al intentar login, aparece toast de error con mensaje "Tu cuenta está deshabilitada"
- [x] No se produce redirección al dashboard

### CA-6 — Seed de roles por defecto
- [x] Al ejecutar el seed, se crean los 4 roles si no existen
- [x] Las `role_section_permissions` por defecto se insertan según la tabla del alcance
- [x] El seed es idempotente (no duplica si ya existen)

### CA-7 — UX y estilo
- [x] La sección de Roles sigue la línea gráfica del proyecto (dark-first, paleta del sistema, monospace para labels)
- [x] Usa `VHSTransition` al cambiar de rol seleccionado en el panel derecho
- [x] Todos los estados (loading, error, success) tienen feedback visual (toasts o estados inline)
- [x] Funciona correctamente en mobile (layout apilado)

### CA-8 — Protección server-side por URL
- [x] Acceder directamente a `/cms/content/[nodeId]` sin permiso `canRead` retorna 404 (no 403 — evita enumeración)
- [x] Acceder a `/cms/content/[nodeId]/new` sin permiso `canCreate` retorna 404
- [x] Usuario con rol único `restricted` que accede a cualquier ruta `/cms/*` es redirigido a `/login?error=disabled` (implementado en `proxy.ts`)
- [x] `superAdmin` accede a todas las rutas sin restricción
- [x] El bypass no es posible: ni cambiando el `nodeId` en la URL, ni limpiando cookies del toast, ni desde otra sesión copiando la URL

---

## Archivos afectados / a crear

```
db/schema/role-section-permissions.schema.ts          [NUEVO]
db/schema/index.ts                                    [MODIFICAR — export]
db/migrations/0006_role_section_permissions.sql       [NUEVO]
db/seeds/default-roles.seed.ts                        [NUEVO]
lib/services/roles.service.ts                         [MODIFICAR — +2 métodos]
lib/actions/roles.actions.ts                          [MODIFICAR — +1 action]
types/roles.ts                                        [MODIFICAR — +3 tipos]
locales/en.ts                                         [MODIFICAR — claves roles.* + login.accountDisabled]
locales/es.ts                                         [MODIFICAR — ídem]
auth.ts                                               [MODIFICAR — gate restringido]
components/ui/atoms/PermissionToggle.tsx              [NUEVO]
components/ui/molecules/RolePermissionMatrix.tsx      [NUEVO]
components/ui/molecules/SectionPermissionList.tsx     [NUEVO]
components/ui/organisms/settings/RolesSection.tsx     [REDISEÑO COMPLETO]
components/ui/organisms/SettingsPanel.tsx             [MODIFICAR — sectionPermissions prop + filtro]
components/ui/organisms/settings/DbSection.tsx        [MODIFICAR — ocultar dangerZone si !isSuperAdmin]
app/cms/board/[...nodeId]/page.tsx                    [MODIFICAR — requirePermission guard]
app/cms/content/[nodeId]/page.tsx                     [MODIFICAR — requirePermission guard]
app/cms/content/[nodeId]/new/page.tsx                 [MODIFICAR — requirePermission guard]
app/cms/content/[nodeId]/[recordId]/page.tsx          [MODIFICAR — requirePermission guard]
middleware.ts                                         [MODIFICAR — gate restringido en /cms/*]
app/cms/board/page.tsx o lib/hooks/useNodes.ts        [MODIFICAR — filtrar por canRead]
```

---

## Notas técnicas

- **`notFound()` en lugar de redirect para rutas no permitidas** — evita que el usuario sepa si el nodo existe pero no tiene acceso (previene enumeración de recursos)
- **No usar transacciones con Neon HTTP driver** — operaciones DB en secuencia, no en `db.transaction()`
- **`role_section_permissions` no reemplaza** la lógica existente de `isSuperAdmin` e `isAdmin` en `SettingsPanel` — se suma como capa adicional para roles custom
- **Seed vs migración**: el seed se ejecuta con `npx tsx db/seeds/default-roles.seed.ts` — no forma parte del esquema
- **`getAccessibleNodes` ya existe** en `rolesService` — reutilizar, no duplicar
- **Debounce vs botón explícito**: se prefiere botón "Guardar cambios" para evitar guardado accidental en toggle de permisos críticos
