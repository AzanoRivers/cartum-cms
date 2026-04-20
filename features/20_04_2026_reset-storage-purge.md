# Feature: Purga de Storage en Reset de Base de Datos

**Fecha:** 2026-04-20  
**Scope:** Cuando el Super Admin ejecuta "Borrar base de datos", eliminar también todos los archivos de Cloudflare R2 y Vercel Blob antes de limpiar las filas de la tabla `media`.

---

## Contexto

`resetCmsAction()` en `lib/actions/db.actions.ts` borra todas las tablas via `safeDelete()`. La tabla `media` se elimina directamente sin pasar por `mediaRepository.delete(id)`, por lo que los archivos almacenados en R2 y en Blob quedan huerfanos para siempre.

Este plan añade una purga de storage antes de la eliminacion de filas, usando los registros de la tabla `media` como inventario de archivos a borrar.

---

## Hueco del plan original (y por qué importa)

La purga DB-driven solo borra archivos que tienen un registro en la tabla `media`. Sin embargo, pueden existir archivos **huerfanos** en R2 o Blob sin registro en DB:

- Upload que escribio el archivo a storage pero fallo antes de insertar la fila en `media`
- Registro borrado manualmente de DB sin pasar por `mediaRepository.delete`
- Migraciones o importaciones que crearon archivos sin metadata

Si solo hacemos purga DB-driven y no barremos el storage directamente, un reset "completo" podria dejar archivos activos en R2/Blob que nunca podran borrarse sin acceso directo a los paneles de Cloudflare o Vercel.

**Solucion: purga de dos fases.**

---

## Principios de la implementacion

1. **Primero storage, luego DB.** Los registros de `media` son el inventario principal. Si se borran primero las filas, el inventario desaparece y los archivos quedan huerfanos.

2. **Dos fases de limpieza.** Fase 1: borrar lo que la DB conoce. Fase 2: listar R2 y Blob directamente y borrar cualquier remanente (huerfanos).

3. **Best-effort, no transaccional.** Los errores individuales se cuentan pero no abortan la operacion.

4. **Sin revertir el reset.** Si la purga tiene fallos parciales, el reset de DB procede igualmente.

5. **Hoist de clientes.** Los clientes de R2 y Blob se instancian UNA VEZ antes de los loops, no dentro de cada iteracion.

6. **Procesamiento por lotes.** Fase 1: batches de 100. Fase 2: paginacion nativa de R2 (1000 keys/pag) y Blob (`cursor`-based).

---

## Flujo nuevo

```
resetCmsAction()
  |
  |-- requireSuperAdmin()
  |
  |-- purgeAllMediaStorage()               // NUEVO - antes de safeDelete(media)
  |     |
  |     |-- FASE 1: purga DB-driven
  |     |     |-- getR2Client() una vez (hoist fuera del loop)
  |     |     |-- getBlobToken() una vez (hoist fuera del loop)
  |     |     |-- SELECT key, publicUrl, storageProvider FROM media
  |     |     |-- por cada batch de 100:
  |     |     |     |-- 'blob'  -> del(publicUrl, { token })
  |     |     |     |-- otro    -> DeleteObjectCommand(Key: key)
  |     |     |     |-- error   -> failed++
  |     |     |-- subtotales: phase1Deleted, phase1Failed
  |     |
  |     |-- FASE 2: storage sweep (huerfanos)
  |     |     |
  |     |     |-- R2 sweep (si R2 configurado):
  |     |     |     |-- ListObjectsV2Command(Prefix: 'uploads/', paginated)
  |     |     |     |-- por cada pagina: DeleteObjectsCommand(hasta 1000 keys)
  |     |     |     |-- contar r2Orphans
  |     |     |
  |     |     |-- Blob sweep (si Blob configurado):
  |     |     |     |-- list({ prefix: 'uploads/', cursor }) paginado
  |     |     |     |-- del() para cada blob restante
  |     |     |     |-- contar blobOrphans
  |     |
  |     |-- return { deleted, failed, r2Orphans, blobOrphans }
  |
  |-- safeDelete(media)
  |-- safeDelete(emailOtpCodes)
  |-- ... resto sin cambios
  |
  |-- clear cookies
  |
  |-- return { success: true, data: { storagePurge: { deleted, failed, r2Orphans, blobOrphans } } }
```

---

## Archivos a modificar

### 1. `lib/actions/db.actions.ts`

**a) Imports necesarios:**

```ts
import { del as blobDel, list as blobList } from '@vercel/blob'
import { getSetting }                        from '@/lib/settings/get-setting'
import { getR2Client }                       from '@/lib/media/r2-client'
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
```

**b) Tipo de retorno ampliado:**

```ts
type StoragePurgeResult = {
  deleted:     number  // archivos borrados via DB-driven (Fase 1)
  failed:      number  // errores en Fase 1
  r2Orphans:   number  // huerfanos extra encontrados y borrados en R2 (Fase 2)
  blobOrphans: number  // huerfanos extra encontrados y borrados en Blob (Fase 2)
}
```

**c) Implementacion completa de `purgeAllMediaStorage`:**

```ts
async function purgeAllMediaStorage(): Promise<StoragePurgeResult> {
  let deleted     = 0
  let failed      = 0
  let r2Orphans   = 0
  let blobOrphans = 0

  // ── Fase 1: purga DB-driven ──────────────────────────────────────────────
  // Hoist clientes una sola vez antes del loop — getSetting lee de DB
  let r2: Awaited<ReturnType<typeof getR2Client>> | null = null
  try { r2 = await getR2Client() } catch { /* R2 no configurado — skip R2 rows */ }

  const blobToken = await getSetting('blob_token', process.env.BLOB_READ_WRITE_TOKEN).catch(() => null)

  const rows = await db
    .select({ key: media.key, publicUrl: media.publicUrl, storageProvider: media.storageProvider })
    .from(media)

  const BATCH = 100
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (row) => {
        try {
          if (row.storageProvider === 'blob') {
            if (!blobToken) { failed++; return }
            await blobDel(row.publicUrl, { token: blobToken })
          } else {
            if (!r2) { failed++; return }
            await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: row.key }))
          }
          deleted++
        } catch {
          failed++
        }
      }),
    )
  }

  // ── Fase 2: storage sweep — elimina huerfanos no registrados en DB ────────

  // R2 sweep
  if (r2) {
    let continuationToken: string | undefined
    do {
      const listRes = await r2.client.send(new ListObjectsV2Command({
        Bucket:            r2.bucket,
        Prefix:            'uploads/',
        ContinuationToken: continuationToken,
      }))
      const keys = (listRes.Contents ?? []).map((obj) => ({ Key: obj.Key! }))
      if (keys.length > 0) {
        // DeleteObjectsCommand acepta hasta 1000 keys por llamada
        await r2.client.send(new DeleteObjectsCommand({
          Bucket: r2.bucket,
          Delete: { Objects: keys, Quiet: true },
        }))
        r2Orphans += keys.length
      }
      continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined
    } while (continuationToken)
  }

  // Blob sweep
  if (blobToken) {
    let cursor: string | undefined
    do {
      const listRes = await blobList({ prefix: 'uploads/', cursor, token: blobToken })
      for (const blob of listRes.blobs) {
        try {
          await blobDel(blob.url, { token: blobToken })
          blobOrphans++
        } catch { /* ignorar errores individuales */ }
      }
      cursor = listRes.hasMore ? listRes.cursor : undefined
    } while (cursor)
  }

  return { deleted, failed, r2Orphans, blobOrphans }
}
```

> **Nota sobre el prefix `uploads/`:** Todos los archivos subidos por Cartum usan el patron `uploads/${uuid}.ext` como key/pathname. El sweep limita la busqueda a ese prefix para no afectar otros objetos que pudieran existir en el mismo bucket/store por otras razones.

> **Nota de orden:** `purgeAllMediaStorage()` va **antes** de `safeDelete(media)`. Si lanza una excepcion no capturada internamente, el catch externo devuelve `{ success: false, error: 'db_error' }` y ninguna tabla es borrada.

**d) Modificar `resetCmsAction`:**

```ts
export async function resetCmsAction(): Promise<ActionResult<{ storagePurge: StoragePurgeResult } | null>>

// En try, antes de safeDelete(media):
const storagePurge = await purgeAllMediaStorage()

// Return:
return { success: true, data: { storagePurge } }
```

---

### 2. `types/actions.ts` (o donde viva `ActionResult`)

Verificar que `ActionResult<T>` acepta el nuevo shape `{ storagePurge: StoragePurgeResult }`. Si el tipo ya es generico `ActionResult<T>` no hay cambio. Sino, ajustar.

Tambien exportar `StoragePurgeResult` desde `types/actions.ts` o desde `types/media.ts` si se necesita en el UI.

---

### 3. UI: `DangerResetDialog` y pagina de settings

Buscar el componente que renderiza el dialogo de confirmacion de reset (probablemente en `components/ui/organisms/` o en `app/cms/settings/`).

**a) Texto de confirmacion:** Actualizar la descripcion del dialogo para mencionar que los archivos de storage tambien seran eliminados. Ejemplo:

```
ES: Esta accion eliminara todos los datos del CMS, incluyendo los archivos almacenados en Cloudflare R2 y Vercel Blob. Esta operacion es irreversible.

EN: This action will delete all CMS data, including files stored in Cloudflare R2 and Vercel Blob. This operation is irreversible.
```

**b) Resultado del reset:** Despues de que `resetCmsAction()` resuelve con exito, mostrar el resumen de la purga si `data.storagePurge` existe. Puede ser un toast o un mensaje en el dialogo antes de redirigir. Ejemplo:

```
ES: Base de datos eliminada. Archivos purgados: 47. Errores: 0.
EN: Database deleted. Files purged: 47. Errors: 0.
```

Si `failed > 0`, mostrar advertencia (amber):
```
ES: Atencion: N archivo(s) no pudieron eliminarse del storage. Pueden quedar archivos huerfanos.
EN: Warning: N file(s) could not be deleted from storage. Some orphaned files may remain.
```

---

### 4. `locales/en.ts` + `locales/es.ts`

Agregar bajo la seccion de settings/danger (o donde vivan los strings del reset dialog):

**en.ts:**
```ts
resetStorageNote:       'All stored files (images and videos) in Cloudflare R2 and Vercel Blob will also be permanently deleted.',
resetStoragePurged:     'Files purged: {deleted}. Errors: {failed}.',
resetStorageFailWarn:   '{failed} file(s) could not be deleted from storage and may remain as orphans.',
```

**es.ts:**
```ts
resetStorageNote:       'Los archivos almacenados (imagenes y videos) en Cloudflare R2 y Vercel Blob tambien seran eliminados permanentemente.',
resetStoragePurged:     'Archivos purgados: {deleted}. Errores: {failed}.',
resetStorageFailWarn:   '{failed} archivo(s) no pudieron eliminarse del storage y pueden quedar como huerfanos.',
```

Actualizar el tipo `Dictionary` con las nuevas keys.

---

## Consideraciones de seguridad y robustez

### Timeout del Server Action

Un reset con muchos archivos (miles) puede acercarse al timeout de Vercel (10 s free / 60 s pro). El procesamiento en batches de 100 con `Promise.all` dentro de cada batch es el mejor balance entre velocidad y seguridad de memoria.

Si en el futuro la libreria supera las ~5,000 imagenes en plan free, considerar mover la purga a un background job (pero esto esta fuera del scope de este plan).

### R2 no configurado

Si R2 no esta configurado (`getR2Client()` lanza), el error se captura en el `try/catch` individual y se cuenta como `failed`. El reset continua normalmente. Los archivos R2 quedarian como huerfanos, pero sin credenciales de R2 tampoco hay forma de borrarlos.

### Blob no configurado

`blobDelete` lanza si el token no existe. Mismo manejo: cuenta como `failed`, no aborta.

### Proveedor `null` (filas legacy)

Filas antiguas pueden tener `storageProvider = null`. El codigo trata cualquier valor que no sea `'blob'` como R2 (default historico del sistema).

### Carrera con uploads en curso

Si hay un upload en progreso en el momento exacto del reset, el archivo podria llegar a storage despues de que `purgeAllMediaStorage` ya proceso el inventario, quedando como huerfano. Es un edge case aceptable dado que el reset requiere confirmacion explicita con texto "DELETE PERMANENTLY".

---

## Checklist de Auditoria

### A: Fase 1 — purga DB-driven
- [x] A.1 `purgeAllMediaStorage()` implementada en `db.actions.ts` como funcion interna
- [x] A.2 `getR2Client()` llamado UNA VEZ antes del loop (hoisted), no dentro de cada iteracion
- [x] A.3 `getBlobToken` (`getSetting`) llamado UNA VEZ antes del loop (hoisted)
- [x] A.4 Si R2 no configurado: filas R2 cuentan como `failed` (no abortan)
- [x] A.5 Si Blob no configurado: filas Blob cuentan como `failed` (no abortan)
- [x] A.6 `storageProvider === 'blob'` -> `del(publicUrl, { token })`
- [x] A.7 Cualquier otro valor -> `DeleteObjectCommand(Key: row.key)`
- [x] A.8 Procesa en batches de 100 con `Promise.all` interno
- [x] A.9 Retorna subtotales `deleted` + `failed`

### B: Fase 2 — storage sweep (huerfanos)
- [x] B.1 R2 sweep: `ListObjectsV2Command(Prefix: 'uploads/')` paginado via `ContinuationToken`
- [x] B.2 R2 sweep: `DeleteObjectsCommand` para cada pagina (hasta 1000 keys/llamada)
- [x] B.3 R2 sweep: se omite silenciosamente si R2 no esta configurado
- [x] B.4 Blob sweep: `list({ prefix: 'uploads/', cursor })` paginado
- [x] B.5 Blob sweep: `del(blob.url, { token })` para cada blob restante
- [x] B.6 Blob sweep: se omite silenciosamente si Blob no esta configurado
- [x] B.7 Retorna `r2Orphans` + `blobOrphans` (archivos extra encontrados fuera de DB)

### C: Integracion en `resetCmsAction`
- [x] C.1 `purgeAllMediaStorage()` se llama **antes** de `safeDelete(media)`
- [x] C.2 El resultado completo `storagePurge` se incluye en el `ActionResult`
- [x] C.3 Si `purgeAllMediaStorage` lanza excepcion no capturada, el catch externo devuelve error sin borrar ninguna tabla
- [x] C.4 El orden de `safeDelete` existente no cambia

### D: Tipos
- [x] D.1 `StoragePurgeResult` tiene `{ deleted, failed, r2Orphans, blobOrphans }`
- [x] D.2 `ActionResult` del reset es `ActionResult<{ storagePurge: StoragePurgeResult } | null>`
- [ ] D.3 `tsc --noEmit` sin errores

### E: UI
- [x] E.1 Descripcion del dialogo menciona que storage tambien se borra
- [x] E.2 Tras reset exitoso: resumen visible con `deleted`, `failed`, `r2Orphans + blobOrphans`
- [x] E.3 Si `failed > 0`: advertencia amber
- [x] E.4 Si `r2Orphans + blobOrphans > 0`: nota informativa (no error) de huerfanos limpiados

### F: Locales
- [x] F.1 `storageNote` en `en.ts` y `es.ts` (key: `resetDialog.storageNote`)
- [x] F.2 `purgedSummary` en `en.ts` y `es.ts` (key: `resetDialog.purgedSummary`)
- [x] F.3 `purgeFailWarn` en `en.ts` y `es.ts` (key: `resetDialog.purgeFailWarn`)
- [x] F.4 Tipo `Dictionary` actualizado

### G: Tests manuales
- [ ] G.1 Reset con 0 archivos: todas las cuentas = 0, reset completa normalmente
- [ ] G.2 Reset con archivos en R2 (con DB record): `deleted > 0`, R2 bucket vacio tras reset
- [ ] G.3 Reset con archivos en Blob (con DB record): `deleted > 0`, Blob vacio tras reset
- [ ] G.4 Reset con mix R2 + Blob: ambos purgados
- [ ] G.5 Reset con archivo huerfano en R2 (sin DB record): aparece en `r2Orphans`, R2 vacio tras reset
- [ ] G.6 Reset con archivo huerfano en Blob (sin DB record): aparece en `blobOrphans`, Blob vacio tras reset
- [ ] G.7 Reset con R2 inaccesible: `failed = N`, reset DB continua, advertencia amber en UI
- [ ] G.8 Reset con Blob inaccesible: mismo que G.7
- [ ] G.9 Verificacion manual en panel R2 y dashboard Vercel Blob: sin objetos en prefix `uploads/`
- [ ] G.10 Verificacion DB: `SELECT COUNT(*) FROM media` devuelve 0 tras reset
- [ ] G.11 Despues del reset: sesion destruida, login redirige a setup

### H: Build
- [ ] H.1 `pnpm build` sin errores
- [ ] H.2 `pnpm tsc --noEmit` sin errores

---

## Limitaciones conocidas

- La purga no es atomica con la eliminacion de DB. En caso de crash del servidor entre `purgeAllMediaStorage` y `safeDelete(media)`, los archivos de storage fueron borrados pero las filas de DB siguen existiendo (referencias rotas). Este escenario es extremadamente raro y aceptable dado el contexto de uso (operacion de reset de emergencia).
- Archivos subidos durante los milisegundos del reset pueden quedar huerfanos. No hay solucion practica sin bloquear toda la aplicacion durante el reset.
- Para librerias con decenas de miles de archivos, el tiempo de purga puede superar el timeout de Vercel en plan free. En ese caso, considerar ejecutar el reset desde un entorno local con `next start` o desde un script de mantenimiento.
