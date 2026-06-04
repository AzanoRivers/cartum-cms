# Plan: Project-Owner Subscription Model

## Contexto del diagnóstico

### Estado actual
- Suscripción vive en `users.cartum_suscriptor` (boolean) + `users.cartum_suscriptor_time` (bigint Unix seconds)
- Cada usuario tiene su propio contador de 7 días desde su registro
- `hasTier2Access()` evalúa directamente los valores del usuario logueado
- No hay relación entre la suscripción del owner del proyecto y los miembros

### Problema
Un usuario invitado a un proyecto (editor, lector) tiene su propia suscripción de 7 días. Cuando expira, pierde acceso a Tier 2 aunque el owner del proyecto tenga suscripción activa con 30 días. El modelo debe ser: **la suscripción del owner cubre a todos los miembros de su proyecto**.

---

## Modelo nuevo: Suscripción por Owner de Proyecto

### Regla de negocio
> La suscripción efectiva de un usuario en un proyecto es la suscripción del **owner del proyecto activo**, no la del usuario mismo.

**Casos:**
1. Usuario X (owner, 30 días) invita a Y → Y hereda los 30 días del owner X en ese proyecto
2. Y crea un proyecto propio → Y es owner, su suscripción personal aplica (7 días default si fue invitado)
3. Y cambia a otro proyecto (donde Z es owner, con 15 días) → Y ve 15 días en ese proyecto
4. Si el usuario logueado es el owner → su propia suscripción aplica directamente

---

## Impacto en base de datos

### Sin migración requerida
No hay cambios de schema. Las columnas existentes se mantienen:
- `users.cartum_suscriptor` — sigue siendo el estado del usuario
- `users.cartum_suscriptor_time` — sigue siendo el tiempo del usuario

El cambio es **puramente en la capa de resolución**: en vez de leer los valores del usuario activo, se leen del owner del proyecto activo.

### Tabla involucrada
- `project.owner_id` — ya existe, apunta al owner del proyecto
- `users.cartum_suscriptor` + `users.cartum_suscriptor_time` — datos del owner

**No se necesita `pnpm db:generate` ni `pnpm db:migrate`.**

---

## Plan de implementación

### Fase 1: Nueva función de resolución de suscripción por proyecto

**Archivo nuevo:** `lib/subscription.ts` (extensión del existente)

Agregar función:
```typescript
export async function resolveProjectSubscription(projectId: string): Promise<{
  cartumSuscriptor:     boolean
  cartumSuscriptorTime: number
  ownerId:              string | null
}>
```

Lógica:
1. Obtener `owner_id` del proyecto
2. Si no hay owner → usar defaults (7 días desde ahora, para no romper)
3. Leer `cartum_suscriptor` y `cartum_suscriptor_time` del owner
4. Retornar esos valores

---

### Fase 2: Actualizar `hasTier2Access` para usar el proyecto activo

**Archivo:** `lib/subscription.ts`

Nueva función:
```typescript
export async function assertTier2AccessForProject(projectId?: string | null): Promise<void>
```

Lógica:
1. Si `isSuperAdmin` → pass
2. Si no hay `projectId` → usar suscripción personal del usuario (fallback)
3. Obtener suscripción del owner del proyecto via `resolveProjectSubscription`
4. Evaluar `hasTier2Access` con los valores del owner

---

### Fase 3: Actualizar `media.actions.ts` y `scraper.actions.ts`

**Archivos:**
- `lib/actions/media.actions.ts` → reemplazar `assertTier2Access()` por `assertTier2AccessForProject(projectId)`
- `lib/actions/scraper.actions.ts` → igual

En ambos, el `projectId` se obtiene via `requireProjectId()` que ya existe.

---

### Fase 4: Actualizar TopBar — mostrar suscripción del owner del proyecto activo

**Arquitectura actual:** TopBar recibe `cartumSuscriptor` y `cartumSuscriptorTime` del usuario logueado desde `cms/layout.tsx`.

**Cambio:** En `cms/layout.tsx`, en vez de leer los valores de `session.user`, obtener los del owner del proyecto activo:

```typescript
// Actual
const cartumSuscriptor     = session.user.cartumSuscriptor ?? true
const cartumSuscriptorTime = session.user.cartumSuscriptorTime ?? 0

// Nuevo
const projectSub = await resolveProjectSubscription(currentProjectId)
const cartumSuscriptor     = projectSub.cartumSuscriptor
const cartumSuscriptorTime = projectSub.cartumSuscriptorTime
```

Esto hace que el badge del TopBar refleje la suscripción del proyecto activo, no la personal.

---

### Fase 5: `grantSubscriptionAction` y `revokeSubscriptionAction` — siempre suscripción PERSONAL

**Regla crítica:** Cuando el super_admin otorga o revoca tiempo de suscripción desde la sección Usuarios, opera SIEMPRE sobre la suscripción personal del usuario (`users.cartum_suscriptor` + `users.cartum_suscriptor_time`), nunca sobre proyectos.

**Por qué es correcto:** La suscripción personal del usuario es la "fuente de verdad". Al ser owner de un proyecto, su suscripción personal se propaga dinámicamente a todos sus miembros. Dar más tiempo personal = más tiempo para todos sus proyectos automáticamente.

**Sin cambio de lógica** — `grantSubscriptionAction` y `revokeSubscriptionAction` ya escriben directamente en `users.cartum_suscriptor_time`. Esto es correcto.

---

### Fase 6: UsersSection — mostrar suscripción PERSONAL, no heredada

**Regla crítica:** La sección Usuarios del super_admin debe mostrar SIEMPRE la suscripción personal de cada usuario (sus propios `cartum_suscriptor` + `cartum_suscriptor_time`), nunca la suscripción heredada del owner de algún proyecto.

**Razón:** El super_admin necesita ver el estado real de cada cuenta para gestionar tiempos correctamente. Si se mostrara la suscripción heredada, un usuario con 2 días personales podría verse con 30 días (del proyecto donde está invitado), confundiendo al admin.

**Verificación en `UsersSection.tsx`:**
- `listAllUsersAdmin()` lee `users.cartum_suscriptor` y `users.cartum_suscriptor_time` directamente → correcto
- `daysLeft()` calcula sobre esos valores personales → correcto
- `grantSubscriptionAction()` escribe en esos valores personales → correcto

**Sin cambio de lógica** — ya funciona correctamente, solo documentar que es intencional.

**Aclaración para el badge en TopBar:**
- En el TopBar del super_admin: muestra su propia suscripción personal (es super_admin, tiene acceso ilimitado siempre)
- En el TopBar de un usuario normal como owner: muestra su suscripción personal (que es la misma que ve el proyecto)
- En el TopBar de un usuario invitado (no owner): muestra la suscripción del owner del proyecto activo (Fase 4)

---

### Fase 7: Semilla / setup desde cero

El `setup.service.ts` crea el super_admin. El super_admin tiene `isSuperAdmin: true` → `hasTier2Access` siempre retorna `true` para él.

Para los proyectos que crea el super_admin, los miembros heredan la suscripción del super_admin (infinita). **No hay problema.**

Para respetar el reset completo de DB:
- La migración `0012_subscription_trial.sql` ya es idempotente (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- `resolveProjectSubscription` maneja gracefully el caso de owner sin suscripción (fallback a 7 días)

**Sin cambios en setup/seed.**

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `lib/subscription.ts` | Agregar `resolveProjectSubscription()` y `assertTier2AccessForProject()` |
| `lib/actions/media.actions.ts` | Usar `assertTier2AccessForProject(projectId)` |
| `lib/actions/scraper.actions.ts` | Usar `assertTier2AccessForProject(projectId)` |
| `app/cms/layout.tsx` | Leer suscripción del owner del proyecto activo |

## Archivos sin cambio

| Archivo | Razón |
|---|---|
| `db/schema/users.schema.ts` | No hay cambio de schema |
| `db/repositories/users.repository.ts` | Lógica de creación correcta |
| `auth.ts` | Sigue leyendo valores del usuario logueado para el JWT |
| `lib/actions/settings.actions.ts` (grantSubscription) | Opera sobre suscripción personal, correcto por diseño |
| `lib/actions/settings.actions.ts` (revokeSubscription) | Opera sobre suscripción personal, correcto por diseño |
| `components/ui/organisms/settings/UsersSection.tsx` | Muestra y gestiona suscripción personal de cada usuario, correcto |
| `lib/services/setup.service.ts` | Super_admin tiene acceso ilimitado |
| Setup migrations | Idempotentes, sin cambio |

## Invariantes del sistema (no romper)

1. `listAllUsersAdmin()` → SIEMPRE devuelve `cartum_suscriptor` y `cartum_suscriptor_time` del usuario real (personal)
2. `grantSubscriptionAction(userId, months)` → SIEMPRE escribe en el usuario específico (personal)
3. `revokeSubscriptionAction(userId)` → SIEMPRE escribe en el usuario específico (personal)
4. `UsersSection` → SIEMPRE muestra info personal de cada usuario para gestión correcta
5. `resolveProjectSubscription(projectId)` → lee del owner → solo para TopBar y guards Tier 2
6. Super_admin: `isSuperAdmin: true` → `hasTier2Access` retorna `true` siempre, independiente del proyecto

---

## Orden de ejecución

1. `lib/subscription.ts` — nueva función de resolución
2. `app/cms/layout.tsx` — TopBar con suscripción del proyecto
3. `lib/actions/media.actions.ts` — guard de Tier 2
4. `lib/actions/scraper.actions.ts` — guard de Tier 2
5. Pruebas manuales de flujo completo

---

## Casos de prueba

| Escenario | Esperado |
|---|---|
| Owner con 30 días, miembro con 3 días | Miembro ve 30 días en el proyecto del owner |
| Miembro crea su propio proyecto | Ve sus propios 3 días como owner |
| Miembro cambia a proyecto del owner | Ve 30 días del owner |
| Owner expira → miembro carga media | Error TIER2_SUBSCRIPTION_REQUIRED |
| Super_admin en cualquier proyecto | Acceso ilimitado siempre |
| Proyecto sin owner (edge case) | Fallback: suscripción personal del usuario |
| Reset completo de DB + `pnpm dev` | Todo funciona sin intervención manual |
