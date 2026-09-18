# API v1 Hardening — permisos, aislamiento multi-proyecto, herencia y CRUD de esquema

**Fecha:** 2026-09-18
**Estado:** ✅ Implementado
**Motivo:** preparar `/api/v1` para que otros proyectos empiecen a integrarlo. Nada usa la API todavía, así que todo se corrigió directamente sobre v1 — no se creó ni se creará una v2.

---

## 1. Permisos: tokens de API ahora respetan admin/editor/viewer/restricted

**Problema:** `canPerformByRole` (usado por todos los endpoints de API token) solo miraba una fila exacta en `role_permissions` o un wildcard legacy (`role_{roleId}_wildcard`). No tenía el bypass por nombre de rol que sí tiene `resolvePermissions` (el usado por la sesión del CMS). Resultado: un token con `roleId` = rol Admin no tenía acceso automático a nada hasta que alguien configurara permisos fila por fila — y el override por proyecto configurado en Settings → Roles (`role_perms:{roleId}:{projectId}` / `role_wildcard:{roleId}:{projectId}`) era invisible para los tokens, que solo leían la key legacy global.

**Fix** (`lib/services/roles.service.ts` → `canPerformByRole`): ahora replica exactamente la prioridad de `resolvePermissions`:
1. Override por nodo en `role_perms:{roleId}:{projectId}` (si existe el mapa, se usa exacto — sin caer a defaults).
2. Wildcard por proyecto `role_wildcard:{roleId}:{projectId}`.
3. Defaults por nombre de rol (admin/editor → acceso total, viewer → solo lectura, restricted → nada) — solo si no existe ningún override para ese rol en ese proyecto.
4. Fallback legacy: tabla global `role_permissions` + wildcard global `role_{roleId}_wildcard`.

Se agregó el parámetro `projectId` a la firma — todos los call sites en `app/api/v1/**` se actualizaron.

**Permisos de esquema (crear/editar/borrar mazos y cartas) son un concepto DISTINTO**, separado de los permisos de datos por nodo. Se agregó `resolveSchemaPermissionsByRole(roleId, projectId)` (misma función, para tokens) espejando `resolveSchemaPermissions` (sesión) — lee `role_schema:{roleId}:{projectId}`, default admin/editor = full write, viewer/restricted = todo en false.

---

## 2. Aislamiento multi-proyecto: cero fugas entre proyectos

Auditoría completa de cada endpoint de `/api/v1`:

- **`GET /api/v1/card/{cardId}` no filtraba por `projectId` en absoluto** — un token de un proyecto podía leer metadata de cartas de OTRO proyecto adivinando el UUID. Corregido: scoped por `apiAuth.projectId`, permiso chequeado contra el mazo padre.
- **`buildResolverContext` (usado por `/table`, `/table/{deckId}`, `/deck/{deckId}`) cargaba TODAS las relaciones (`node_relations`) de TODA la instancia**, sin filtrar por proyecto — no era una fuga real (los UUIDs de nodo ya vienen scoped, así que el filtro posterior neutralizaba el problema) pero era una query sin límite que crecía con el total de relaciones de todos los tenants. Corregido: ambos extremos de la relación deben pertenecer al proyecto del token.
- `/table`, `/table/{deckId}`, `/card/{cardId}` no chequeaban `scope` del token ni permisos por nodo — solo que el token fuera válido. Ahora los tres exigen `scope.includes('read')` + `canPerformByRole`. `/table` (lista) filtra en silencio los mazos que el rol no puede leer en vez de devolver 403 para toda la lista.
- `/deck/{deckId}` no chequeaba permisos por nodo tampoco — agregado.

---

## 3. Herencia de relaciones simplificada: solo cartas, un salto, nunca recursiva

Ver `features/feaures-compress-vps/15_04_2026_node-relation-schema-inheritance.md` (banner de actualización al inicio) para el detalle completo. Resumen:

- **Antes:** n:m resolvía recursivamente (`mode: 'full'`) todo lo que el otro lado había heredado a su vez; 1:n atravesaba cadenas 1:1 sin límite de profundidad (`traverse1to1Chain`). Una sola consulta podía arrastrar campos de una cadena arbitraria de mazos — el "reguero de datos" sin control.
- **Ahora:** 1:1, 1:n y n:m comparten ÚNICAMENTE las cartas propias-directas del otro lado, en un solo salto. Nunca mazos (containers), nunca contenido que el otro lado a su vez heredó. Elimina la ambigüedad de "si comparte mazos, debería compartir sus hijos, y así" — las relaciones ya no comparten mazos, punto.
- La herencia estructural (padre → hijo, un mazo anidado en el board) no cambió: sigue heredando cartas Y mazos del padre directo, un nivel — es el único caso con un punto de corte natural y sin ambigüedad.
- `visitedIds`/anti-ciclo se eliminó del resolver: sin saltos de más de un nivel, no hay forma de formar un ciclo.
- Esto acota TODA respuesta de `/table`, `/table/{deckId}`, `/deck/{deckId}`: nunca más de un mazo "de profundidad" en cartas, y los mazos (`decks`/`containers`) siempre son referencias planas (`id`/`name`/`edit`) que exigen una consulta aparte — nunca inline, nunca en cadena.

Textos públicos actualizados en `locales/en.ts` / `locales/es.ts` → `cms.docs.relations`.

---

## 4. Integridad de base de datos en escritura/borrado

- **`field_meta.relation_target_id` no tenía `onDelete` configurado** (default de Postgres: `NO ACTION`). Borrar un mazo que era el target de una relación desde OTRO mazo tronaba con violación de FK sin que la app lo manejara. Migración `0016_field_meta_relation_target_set_null.sql`: ahora `ON DELETE SET NULL` — borrar el target simplemente desconecta la relación en el campo que apuntaba ahí, sin crashear.
- **`nodeService.createContainer` no validaba `parentId`** (a diferencia de `createField`, que sí). Se podía crear un mazo con `parentId` de otro proyecto, o con el id de una carta (field) como "padre". Corregido: valida existencia + `type === 'container'` + pertenencia al proyecto, igual que `createField`.
- **Media huérfana en cascada de borrado.** `media.nodeId`/`media.recordId` usan `ON DELETE SET NULL` (deliberado: borrar un nodo/record nunca debe borrar silenciosamente el registro de un archivo subido). Pero nada purgaba esos archivos de storage antes — quedaban huérfanos en R2/Blob para siempre. `nodeService.delete` ahora, antes de borrar, encuentra todo el subárbol de descendientes (`nodesRepository.findDescendantIds`, CTE recursivo, todos los tipos) + sus records, junta la media asociada (`mediaRepository.findByNodeOrRecordIds`) y la purga (`mediaRepository.purgeMany`) antes del delete. Devuelve `{ mediaPurged, mediaFailed }`.
- **Borrar una carta (field) dejaba las cartas de sus records hermanos con la key JSON huérfana para siempre**, y si era tipo image/video/gallery, el archivo referenciado en storage tampoco se limpiaba. El endpoint `DELETE /api/v1/card/{cardId}` ahora: si el tipo es image/video/gallery, recorre los records del mazo padre, junta los ids de media referenciados por esa carta específica y los purga; luego limpia la key de todos los records (`recordsRepository.clearFieldData`, ya existía, solo faltaba usarlo aquí); recién entonces borra el nodo.

---

## 5. Endpoints nuevos: CRUD de mazos y cartas (todo en v1)

No existía ningún endpoint público para crear/editar/borrar el esquema (solo lectura + CRUD de records). Agregado, reusando la lógica ya validada de `nodeService`/`nodesRepository`:

| Endpoint | Método | Qué hace | Auth |
|---|---|---|---|
| `/api/v1/table` | POST | Crea un mazo (raíz o anidado con `parentId`) | scope `write` + `schemaPerms.canCreate` |
| `/api/v1/table/{deckId}` | PUT | Renombra un mazo | scope `update` + `schemaPerms.canUpdate` |
| `/api/v1/table/{deckId}` | DELETE | Borra un mazo. Sin `?cascade=true` y con hijos/conexiones → 409 con el conteo. Con `?cascade=true` → borra todo el subárbol (cascada de FK en DB) + purga media | scope `delete` + `schemaPerms.canDelete` |
| `/api/v1/card` | POST | Crea una carta (field) dentro de un mazo (`parentId`) | scope `write` + `schemaPerms.canCreate` |
| `/api/v1/card/{cardId}` | PUT | Actualiza metadata de una carta (nombre, tipo, requerido, default, relación, config) | scope `update` + `schemaPerms.canUpdate` |
| `/api/v1/card/{cardId}` | DELETE | Borra una carta — limpia media + key JSON en todos los records hermanos primero | scope `delete` + `schemaPerms.canDelete` |
| `/api/v1/nodes/bulk-delete` | POST | Borra hasta 500 mazos/cartas en una sola llamada (`{ids: string[]}`), cada uno cascadeado independientemente. Un id fallido no bloquea el resto — respuesta con resultado por id | scope `delete` + `schemaPerms.canDelete` |

Todos: `excludedNodeIds` chequeado, project-scoped de punta a punta, validación con los mismos esquemas Zod que ya usaba el board interno (`lib/actions/nodes.schemas.ts`).

**Fuera de este alcance (no pedido):** CRUD de relaciones (`node_relations`) vía API pública — hoy solo se gestionan desde el board interno.
