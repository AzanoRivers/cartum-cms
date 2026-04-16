# Feature: Herencia de Schema por Relaciones de Nodos

**Fecha:** 15/04/2026  
**Estado:** 🔲 Pendiente  
**Prioridad:** Alta  
**Área:** Backend (API schema + resolución de nodos) + Lógica de relaciones

---

## Contexto y Problema

El endpoint `GET /api/v1/schema` actualmente devuelve cada nodo raíz con sus propios `fields` y `containers` directos. Las **relaciones entre nodos** (`nodeRelations` table con tipos `1:1`, `1:n`, `n:m`) existen en la DB y en el board visual, pero **no tienen efecto alguno en la respuesta de la API**.

El sistema necesita que la API refleje las reglas de herencia de schema: cuando un nodo tiene relaciones con otros nodos, los consumidores de la API deben ver el contenido combinado según el tipo de relación, sin tener que hacer múltiples queries manuales. La estructura del board define el modelo de datos; la API debe reflejarlo fielmente.

Adicionalmente, la **jerarquía estructural** (nodos container hijos de otros containers) tampoco se refleja en la API — un nodo hijo no hereda los fields de su padre al ser consultado.

---

## Estado actual del sistema

| Componente | Estado |
|---|---|
| Tabla `node_relations` | ✅ Existe — `sourceNodeId`, `targetNodeId`, `relationType` ('1:1' / '1:n' / 'n:m') |
| `connectionsRepository` | ✅ Existe — `create`, `findBySourceOrTarget`, `findBetweenNodes`, `updateRelationType`, `delete` |
| `GET /api/v1/schema` | ⚠️ Solo devuelve contenido propio directo. Ignora relaciones y herencia parental |
| `GET /api/v1/nodes/[nodeId]` | ⚠️ Mismo problema — sin herencia |
| Tipos `RelationType`, `NodeConnection` | ✅ Existen en `types/nodes.ts` |

---

## Modelo de Herencia — Reglas

### Terminología

- **Contenido propio directo** de un nodo N: los nodos `type='field'` e hijos `type='container'` que tienen `parentId = N.id`. No incluye nada heredado de relaciones ni de su padre estructural.
- **Nodo padre estructural**: el nodo container cuyo `id` es el `parentId` de N en la tabla `nodes`. Distinto a "nodo fuente de relación".
- **Visitados**: conjunto de IDs de nodos ya procesados en la resolución actual (anti-ciclo).

---

### Regla 1 — Herencia estructural (padre → hijo)

Cuando se consulta un nodo `N` que tiene `parentId = P`:

- `N` hereda el **contenido propio directo** de `P`:
  - Todos los fields propios de `P`
  - Todos los containers propios de `P`, **excluyendo `N` mismo** (para evitar bucle)
- Esta herencia **no es recursiva**: solo sube un nivel (padre directo, no abuelo).
- La herencia estructural aplica **para todos los tipos de nodo**, independiente de relaciones.

**Ejemplo:**
```
Nodo1 (padre) → { fields: [A, B, C], containers: [Nodo2, Nodo3] }
Nodo2 (hijo de Nodo1) → { fields: [X, Y], containers: [] }

Al consultar Nodo2:
  fields:     [X, Y, A, B, C]           ← propios + heredados del padre
  containers: [Nodo3]                    ← containers del padre, sin Nodo2 (no se auto-referencia)
```

---

### Regla 2 — Relación 1:1 (bidireccional, capa directa)

Cuando `NodeA` tiene una relación `1:1` con `NodeB`:

- `NodeA` ve el **contenido propio directo** de `NodeB` (fields + containers)
- `NodeB` ve el **contenido propio directo** de `NodeA` (fields + containers)
- **"Directo"** significa: únicamente lo que le pertenece estructuralmente a ese nodo, sin incluir nada que él mismo haya heredado de sus relaciones o de su padre.
- **No es transitiva**: si `NodeA 1:1 NodeB` y `NodeB 1:1 NodeC`, entonces `NodeA` ve el contenido propio de `NodeB`, pero **no** ve el de `NodeC`.

**Ejemplo:**
```
NodeA → { fields: [1, 2, 3], containers: [] }   (propio directo)
NodeB → { fields: [d, e, f], containers: [] }   (propio directo)
NodeA 1:1 NodeB

Al consultar NodeA:  fields: [1, 2, 3, d, e, f]
Al consultar NodeB:  fields: [d, e, f, 1, 2, 3]
```

---

### Regla 3 — Relación 1:n (directional — el "1" inyecta hacia adelante)

`NodeSource (1) → NodeTarget (n)`:

- El contenido propio directo de `NodeSource` **se inyecta** en `NodeTarget` y en **todos los nodos alcanzables desde `NodeTarget` a través de relaciones 1:1** (en cadena, sin límite de profundidad).
- Es **unidireccional**: `NodeSource` no recibe el contenido de `NodeTarget`.
- Las relaciones `1:1` intermedias en la cadena siguen sus propias reglas (solo comparten contenido propio entre el par), pero la **inyección 1:n los atraviesa**.

**Algoritmo de inyección 1:n**:  
Para determinar si el nodo `N` recibe la inyección de un nodo fuente `S`:
1. ¿Existe `nodeRelations` con `sourceNodeId = S.id`, `targetNodeId = N.id`, `relationType = '1:n'`? → **Sí, recibe inyección directa.**
2. ¿`N` tiene una relación `1:1` con `X`, y `X` recibe inyección de `S`? → **Sí,  recibe inyección transitiva vía 1:1.** (Recursivo, con anti-ciclo.)

**Ejemplo:**
```
Nodo1 -1:n-> Nodo2 -1:1- Nodo3 -1:1- Nodo4 -1:1- Nodo5

Al consultar Nodo5:
  - Propio de Nodo5
  - Propio de Nodo4 (1:1 directo)
  - Inyección de Nodo1 (atraviesa la cadena 1:1 hasta encontrar el 1:n)
  ← Nodo5 NO ve el contenido de Nodo3 o Nodo2 (no son sus 1:1 directos)
  ← Nodo1 NO ve el contenido de Nodo2..Nodo5
```

---

### Regla 4 — Relación n:m (bidireccional + propaga a hijos estructurales)

Cuando `NodeA` tiene una relación `n:m` con `NodeB`:

- `NodeA` ve **todo el contenido resuelto** de `NodeB` (incluyendo lo que `NodeB` haya heredado de su propio padre, sus propias relaciones, etc.)
- `NodeB` ve **todo el contenido resuelto** de `NodeA`.
- Los **hijos estructurales** de `NodeA` y de `NodeB` también pueden ver el contenido del n:m (por herencia estructural — Regla 1).
- Esta es la relación más permisiva del sistema.
- Anti-ciclo: si `NodeA n:m NodeB` y `NodeB n:m NodeA`, el conjunto `visitedIds` evita bucles infinitos.

---

### Regla 5 — Múltiples relaciones

Un nodo puede tener múltiples relaciones de distintos tipos con distintos nodos. Las reglas se aplican en paralelo y el resultado es la **unión (deduplicada por `id`)** de todos los contenidos heredados.

Orden de acumulación (sin orden de prioridad, union set):
1. Contenido propio directo
2. Herencia estructural (padre)
3. Inyecciones de relaciones (1:1, 1:n como target, n:m)

---

### Resumen de reglas por tipo

| Tipo | Dirección | Contenido compartido | Propaga a hijos |
|---|---|---|---|
| Herencia padre→hijo | Unidireccional ↓ | Propio directo del padre (sin self) | No |
| 1:1 | Bidireccional | Propio directo de cada par | No |
| 1:n (fuente) | Unidireccional ↓ | Propio directo del fuente → hacia target y su cadena 1:1 | No (a menos que haya jerarquía estructural en el target) |
| n:m | Bidireccional | Contenido resuelto completo de cada lado | Sí (vía herencia estructural de hijos) |

---

## Arquitectura Técnica

### Fase 1 — Servicio de resolución: `resolveNodeSchema`

**Nuevo archivo:** `lib/services/node-schema-resolver.ts`

Este servicio es el corazón de la feature. Recibe un `nodeId` y devuelve el contenido resuelto (fields + containers) según todas las reglas de herencia.

```ts
interface ResolvedNodeContent {
  fields:     ResolvedField[]
  containers: ResolvedContainer[]
}

interface ResolvedField {
  id:           string
  name:         string
  type:         FieldType
  required:     boolean
  edit:         Date
  defaultValue?: string
  relatesTo?:   string   // slug del container relacionado (solo para type='relation')
}

interface ResolvedContainer {
  id:   string
  name: string
  edit: Date
}
```

**Función principal:**
```ts
async function resolveNodeSchema(
  nodeId: string,
  context: ResolverContext,   // contiene todos los nodos, fields, relaciones ya cargados en memoria
  visitedIds: Set<string> = new Set(),
  mode: 'full' | 'own-direct' = 'full',
): Promise<ResolvedNodeContent>
```

**`mode: 'own-direct'`** → Devuelve solo el contenido propio directo del nodo (sin herencia ni relaciones). Se usa internamente cuando otro nodo lo consulta vía 1:1.

**`ResolverContext`** → Snapshot in-memory de todos los datos necesarios para la resolución, cargado en una sola pasada de queries al inicio del request (sin N+1):
```ts
interface ResolverContext {
  allNodes:      NodeRow[]                          // todos los nodos
  allFields:     FieldWithMeta[]                    // todos los field nodes con field_meta
  allRelations:  NodeRelationRow[]                  // todas las relaciones
  containerSlugMap: Map<string, string>             // id → slug (para relation fields)
}
```

**Algoritmo interno de `resolveNodeSchema(nodeId, ctx, visited, mode)`:**

```
1. Si nodeId ∈ visited → return { fields: [], containers: [] }  // ciclo detectado
2. visited.add(nodeId)
3. node = ctx.allNodes.find(n => n.id === nodeId)
4. ownFields     = ctx.allFields.filter(f => f.parentId === nodeId)  → mapToResolvedField()
5. ownContainers = ctx.allNodes.filter(n => n.parentId === nodeId && n.type === 'container')

6. Si mode === 'own-direct':
   return { fields: ownFields, containers: ownContainers.filter(c => !visited.has(c.id)) }

// ─── HERENCIA ESTRUCTURAL (padre → hijo) ───
7. Si node.parentId && !visited.has(node.parentId):
   parentOwn = resolveNodeSchema(node.parentId, ctx, visited (copia), 'own-direct')
   parentFields     += parentOwn.fields
   parentContainers += parentOwn.containers.filter(c => c.id !== nodeId)

// ─── RELACIONES ───
8. relations = ctx.allRelations donde sourceNodeId === nodeId OR targetNodeId === nodeId
9. Para cada relation:

   otherNodeId = relation.sourceNodeId === nodeId ? relation.targetNodeId : relation.sourceNodeId
   
   Si relation.relationType === '1:1':
     otherOwn = resolveNodeSchema(otherNodeId, ctx, visited (copia), 'own-direct')
     relFields     += otherOwn.fields
     relContainers += otherOwn.containers
   
   Si relation.relationType === '1:n' && relation.targetNodeId === nodeId:
     // Este nodo es el TARGET del 1:n → recibe contenido del source
     sourceOwn = resolveNodeSchema(relation.sourceNodeId, ctx, visited (copia), 'own-direct')
     relFields     += sourceOwn.fields
     relContainers += sourceOwn.containers
   
   Si relation.relationType === '1:n' && relation.sourceNodeId === nodeId:
     // Este nodo es el SOURCE del 1:n → no recibe nada del target
     // (el target recibirá el contenido de este nodo cuando sea consultado)
     skip
   
   Si relation.relationType === 'n:m':
     otherFull = resolveNodeSchema(otherNodeId, ctx, visited (copia), 'full')
     relFields     += otherFull.fields
     relContainers += otherFull.containers

// ─── INYECCIÓN 1:n TRANSITIVA VÍA 1:1 ───
10. Buscar si algún nodo alcanzable desde nodeId via 1:1 (sin visitar) es target de un 1:n:
    traverse1to1Chain(nodeId, ctx, visited) → set de nodeIds en la cadena 1:1
    Para cada nodo en la cadena:
      si tiene relacion 1:n como target (y sourceId no está en visited):
        sourceOwn = resolveNodeSchema(sourceNodeId, ctx, visited (copia), 'own-direct')
        relFields     += sourceOwn.fields
        relContainers += sourceOwn.containers

// ─── UNIÓN Y DEDUPLICACIÓN ───
11. allFields     = dedup([...ownFields, ...parentFields, ...relFields], by 'id')
12. allContainers = dedup([...ownContainers, ...parentContainers, ...relContainers], by 'id')
    // Remover nodeId propio de containers (no auto-referencia)
    allContainers = allContainers.filter(c => c.id !== nodeId)

13. return { fields: allFields, containers: allContainers }
```

**`traverse1to1Chain(nodeId, ctx, visited)`:**  
BFS/DFS sobre las relaciones `1:1` del nodo, acumulando todos los nodos alcanzables sin volver a los visitados. Devuelve `Set<string>` de IDs.

---

### Fase 2 — Carga de contexto en una pasada (ResolverContext)

**Nuevo archivo:** `lib/services/node-schema-context.ts`

```ts
async function buildResolverContext(): Promise<ResolverContext>
```

Ejecuta exactamente **3 queries** en paralelo:
1. `SELECT * FROM nodes` → `allNodes`
2. `SELECT nodes.*, field_meta.* FROM nodes JOIN field_meta ON ...` → `allFields`
3. `SELECT * FROM node_relations` → `allRelations`

Construye el `containerSlugMap` (id → slug) desde `allNodes` donde `type = 'container'`.

No hay queries adicionales durante la resolución — todo trabaja en memoria.

---

### Fase 3 — Actualizar `GET /api/v1/schema`

**Archivo:** `app/api/v1/schema/route.ts`

Reemplazar la lógica actual por:

```ts
const ctx = await buildResolverContext()
const rootNodes = ctx.allNodes.filter(n => n.type === 'container' && n.parentId === null)

const schema = await Promise.all(
  rootNodes.map(async (node) => {
    const resolved = await resolveNodeSchema(node.id, ctx)
    return {
      id:         node.id,
      name:       node.name,
      slug:       node.slug ?? nodeNameToSlug(node.name),
      edit:       node.updatedAt,
      fields:     resolved.fields,
      containers: resolved.containers,
    }
  })
)

return Response.json({ nodes: schema }, { headers: corsHeaders() })
```

---

### Fase 4 — Actualizar `GET /api/v1/nodes/[nodeId]`

**Archivo:** `app/api/v1/nodes/[nodeId]/route.ts`

Aplicar el mismo `resolveNodeSchema` para nodos individuales. Si es un nodo `field`, devolver solo su información propia (sin resolución de herencia — fields no tienen relaciones).

---

### Fase 5 — Tipos nuevos en `/types/`

**Archivo:** `types/nodes.ts` ← extender con:

```ts
export interface ResolvedField {
  id:           string
  name:         string
  type:         FieldType
  required:     boolean
  edit:         Date
  defaultValue?: string
  relatesTo?:   string
}

export interface ResolvedContainer {
  id:   string
  name: string
  edit: Date
}

export interface ResolvedNodeContent {
  fields:     ResolvedField[]
  containers: ResolvedContainer[]
}

export interface ResolverContext {
  allNodes:         Array<typeof import('@/db/schema').nodes.$inferSelect>
  allFields:        Array<{ nodes: typeof import('@/db/schema').nodes.$inferSelect; field_meta: typeof import('@/db/schema').fieldMeta.$inferSelect }>
  allRelations:     Array<typeof import('@/db/schema').nodeRelations.$inferSelect>
  containerSlugMap: Map<string, string>
}
```

---

### Fase 6 — Anti-ciclo y casos edge

| Caso | Comportamiento |
|---|---|
| `NodeA 1:1 NodeB` y `NodeB 1:1 NodeA` | `visitedIds` previene bucle. Cada lado ve el contenido del otro, no se repite. |
| `NodeA n:m NodeB` y `NodeB n:m NodeA` | Mismo mecanismo. |
| Nodo sin relaciones | Devuelve solo contenido propio (+ herencia de padre si aplica). |
| Nodo con `parentId` pero el padre también tiene `parentId` (3 niveles) | La herencia solo sube un nivel. El abuelo **no** se hereda directamente (el padre sí lo hereda del abuelo cuando se consulta el padre, pero eso es otra resolución). |
| Nodo target de dos fuentes `1:n` diferentes | Recibe el contenido propio directo de ambas fuentes. |
| Field con `type='relation'` heredado de otro nodo | El `relatesTo` se resuelve con `containerSlugMap` igual que los fields propios. |

---

## Principio de respuesta plana (no-nesting)

La respuesta es **siempre plana en un nivel**. Nunca se anidan schemas dentro de schemas.

- **`fields`**: lista plana con **absolutamente todos** los fields del nodo — propios + heredados por cualquier regla (padre, 1:1, 1:n, n:m). El consumer los ve todos como nativos del nodo consultado. Sin marcado de origen.
- **`containers`**: lista plana de **referencias shallow** — solo `id`, `name`, `edit`. El contenido de cada container (sus fields y sus propios sub-containers) **no se expone aquí**. Para obtenerlo, el consumer hace una solicitud separada por `id` o por `slug`.

Esta decisión evita el problema de la "escalera" (respuestas anidadas indefinidamente) y garantiza que cada request devuelve datos directamente consumibles sin parseo recursivo.

```
❌ NO hacer (escalera):                ✅ Hacer (plano):
{
  node: {                               { node: {
    fields: [...],                          fields: [A, B, C, X, Y, Z],  ← todos flat
    containers: [{                          containers: [
      id: "seo",                              { id: "seo",  name: "SEO" },
      fields: [...],   ← NO                  { id: "meta", name: "Meta" }
      containers: [...]← NO               ]
    }]                                    }}
  }
}
```

---

## Respuesta API — Nuevo formato

### `GET /api/v1/schema` — Lista de todos los nodos raíz

```json
{
  "nodes": [
    {
      "id": "uuid-root-node",
      "name": "Blog Posts",
      "slug": "blog-posts",
      "edit": "2026-04-15T10:00:00Z",
      "fields": [
        { "id": "...", "name": "title",    "type": "text",     "required": true,  "edit": "..." },
        { "id": "...", "name": "author",   "type": "relation", "required": true,  "edit": "...", "relatesTo": "users" },
        { "id": "...", "name": "score",    "type": "number",   "required": false, "edit": "...", "defaultValue": "0" },
        { "id": "...", "name": "category", "type": "text",     "required": false, "edit": "..." }
      ],
      "containers": [
        { "id": "uuid-seo-node",  "name": "SEO",      "edit": "..." },
        { "id": "uuid-meta-node", "name": "Metadata", "edit": "..." }
      ]
    }
  ]
}
```

> `fields` incluye los propios del nodo + todos los heredados (relaciones, padre). Los `containers` son solo referencias — sin contenido anidado.

### `GET /api/v1/schema/[nodeId]` — Schema de un nodo específico por ID

Nuevo endpoint (o parámetro del existente `nodes/[nodeId]`) para consultar el schema resuelto de cualquier nodo — raíz, hijo o relacionado — por su UUID:

```json
{
  "node": {
    "id": "uuid-seo-node",
    "name": "SEO",
    "slug": "seo",
    "edit": "2026-04-15T10:00:00Z",
    "fields": [
      { "id": "...", "name": "metaTitle",       "type": "text", "required": false, "edit": "..." },
      { "id": "...", "name": "metaDescription", "type": "text", "required": false, "edit": "..." },
      { "id": "...", "name": "title",           "type": "text", "required": true,  "edit": "..." }
    ],
    "containers": []
  }
}
```

> El consumer obtiene `containers[n].id` del primer request y hace `GET /api/v1/schema/{id}` para obtener su schema completo resuelto. Cada llamada es independiente y plana.

Los campos heredados de relaciones **no están marcados** como heredados — el consumer de la API ve el schema combinado como si fuera nativo del nodo. Esto es intencional: el consumer no necesita saber de dónde viene cada field.

---

## Archivos a Modificar / Crear

| Acción | Archivo | Descripción |
|--------|---------|-------------|
| CREAR | `lib/services/node-schema-resolver.ts` | Función `resolveNodeSchema` + algoritmo completo |
| CREAR | `lib/services/node-schema-context.ts` | Función `buildResolverContext` (3 queries en paralelo) |
| CREAR | `app/api/v1/schema/[nodeId]/route.ts` | Nuevo endpoint: schema resuelto de un nodo por UUID |
| EDITAR | `types/nodes.ts` | Añadir `ResolvedField`, `ResolvedContainer`, `ResolvedNodeContent`, `ResolverContext` |
| EDITAR | `app/api/v1/schema/route.ts` | Usar `buildResolverContext` + `resolveNodeSchema` |
| EDITAR | `app/api/v1/nodes/[nodeId]/route.ts` | Usar `resolveNodeSchema` para nodos container |

---

## Criterios de Aceptación — Auditoría

### ✅ Herencia estructural (Regla 1 — Padre → Hijo)

- [ ] Al consultar un nodo hijo (con `parentId`), sus `fields` incluyen los fields propios de su padre directo.
- [ ] Al consultar un nodo hijo, sus `containers` incluyen los containers propios del padre **excluyendo el propio nodo hijo** (sin auto-referencia).
- [ ] Al consultar un nodo raíz (sin `parentId`), no hay herencia de padre (sin cambio respecto al contenido propio).
- [ ] La herencia no sube más de un nivel: el contenido del abuelo **no** aparece al consultar al nieto directamente (sí aparece si el padre también está siendo consultado vía su propia resolución).

### ✅ Relación 1:1 (Regla 2)

- [ ] `NodeA 1:1 NodeB`: al consultar `NodeA`, sus `fields` incluyen los fields **propios directos** de `NodeB`.
- [ ] Al consultar `NodeB`, sus `fields` incluyen los fields **propios directos** de `NodeA`.
- [ ] Si `NodeA 1:1 NodeB` y `NodeB 1:1 NodeC`: al consultar `NodeA`, sus fields NO incluyen los de `NodeC` (no es transitiva la 1:1 por sí sola).
- [ ] Los campos heredados via 1:1 no incluyen lo que el otro nodo heredó de sus propias relaciones (solo "propio directo").

### ✅ Relación 1:n (Regla 3)

- [ ] `NodeSource 1:n NodeTarget`: al consultar `NodeTarget`, sus `fields` incluyen los fields **propios directos** de `NodeSource`.
- [ ] Al consultar `NodeSource`, sus `fields` **no** incluyen los de `NodeTarget` (unidireccional).
- [ ] Cadena `S 1:n N2 1:1 N3 1:1 N4`: al consultar `N4`, sus `fields` incluyen los propios directos de `S` (inyección traversa la cadena 1:1).
- [ ] En la cadena anterior, `N3` y `N4` entre sí solo comparten su contenido propio directo (la 1:1 entre ellos sigue su regla propia).
- [ ] `N2` recibe el contenido de `S` directamente y el de `N3` via 1:1 (solo propio de `N3`); `S` no recibe el contenido de `N2`.

### ✅ Relación n:m (Regla 4)

- [ ] `NodeA n:m NodeB`: al consultar `NodeA`, ver el contenido **completo resuelto** de `NodeB` (no solo propio directo).
- [ ] Al consultar `NodeB`, ver el contenido completo resuelto de `NodeA`.
- [ ] Un nodo hijo estructural de `NodeA` hereda (via Regla 1) el contenido del n:m que tiene `NodeA` con `NodeB`.

### ✅ Múltiples relaciones

- [ ] Un nodo con múltiples relaciones (ej. `1:1` con X, `1:n` como target de Y, `n:m` con Z) recibe la unión de todos los contenidos heredados.
- [ ] No hay fields duplicados en la respuesta (deduplicación por `id`).
- [ ] No hay containers duplicados en la respuesta (deduplicación por `id`).

### ✅ Anti-ciclo

- [ ] `NodeA 1:1 NodeB` y `NodeB 1:1 NodeA` → no hay stack overflow ni bucle infinito.
- [ ] `NodeA n:m NodeB` y `NodeB n:m NodeA` → mismo comportamiento.
- [ ] Cadena larga de 1:1 (5+ nodos en anillo) → resuelve correctamente y termina.

### ✅ Performance

- [ ] El endpoint `GET /api/v1/schema` realiza exactamente **3 queries a la DB** por request, sin importar cuántos nodos o relaciones existan.
- [ ] La resolución se hace completamente en memoria tras la carga inicial.
- [ ] El tiempo de respuesta no excede los 500ms en un schema de hasta 50 nodos con múltiples relaciones.

### ✅ Formato de respuesta — Plano (no-nesting)

- [ ] Cada nodo en la respuesta tiene las keys: `id`, `name`, `slug`, `edit`, `fields`, `containers`.
- [ ] Cada field tiene: `id`, `name`, `type`, `required`, `edit`. Opcionales: `defaultValue`, `relatesTo`.
- [ ] Cada container en la lista `containers` tiene **solo**: `id`, `name`, `edit`. **Nunca** tiene `fields` ni `containers` anidados.
- [ ] El nodo propio **nunca** aparece en su propia lista de `containers`.
- [ ] Fields de tipo `relation` siempre tienen `relatesTo` con el slug del nodo relacionado (nunca UUID crudo).
- [ ] `GET /api/v1/schema/[nodeId]` devuelve `{ node: { id, name, slug, edit, fields, containers } }` — misma estructura, mismo principio plano.
- [ ] La respuesta de `GET /api/v1/schema` no tiene ningún nivel de anidamiento más allá de `nodes[].fields[]` y `nodes[].containers[]` (todo plano).
- [ ] `fields` en la respuesta de cualquier nodo incluye **todos** los fields heredados (por cualquier regla activa) junto con los propios, sin distinción de origen.

### ✅ Sin regresiones

- [ ] Nodos sin relaciones devuelven el mismo contenido que antes de esta feature (solo propio directo).
- [ ] El endpoint sigue requiriendo `Authorization: Bearer <token>` válido.
- [ ] CORS (`OPTIONS`) sigue funcionando.
- [ ] El endpoint de records `GET /api/v1/{nodeName}` no se ve afectado por este cambio.
