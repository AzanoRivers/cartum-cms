# Media — Subida directa al VPS / Direct VPS Upload

**[Español](#español) · [English](#english)**

---

## Español

### El problema que resuelve

Vercel tiene un límite de **4.5 MB por payload** en funciones serverless. Sin esta arquitectura, cada chunk de video y cada imagen comprimen pasarían completamente por Vercel antes de llegar al VPS, consumiendo el ancho de banda incluido en el plan y reventando el límite de tamaño.

La solución: el browser obtiene un token de sesión de corta duración y llama al VPS **directamente**, sin pasar por Vercel. Solo el handshake inicial y la fase final de video (que necesita credenciales de R2 y acceso a la DB) siguen pasando por Vercel.

---

### Flujo de bytes

```
┌─────────────────────────────────────────────────────────────────┐
│ Mount del hook                                                  │
│   Browser → GET /api/internal/media/vps-session (Vercel)        │
│           ← { vpsUrl, token, expiresIn: 7200 }  (~200 bytes)   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Subida de imagen                                                │
│   Browser → POST {vpsUrl}/api/v1/media/images/compress          │
│             Header: X-Session-Token: <token>                    │
│           ← bytes comprimidos (webp)     DIRECTO, sin Vercel   │
│   Browser → PUT  R2 presigned URL        DIRECTO, sin Vercel   │
│   Browser → Server Action saveMediaRecord (solo metadata JSON) │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Subida de video (chunked)                                       │
│   Fase 1  Browser → POST {vpsUrl}/api/v1/media/videos/upload/init      DIRECTO │
│   Fase 2  Browser → POST {vpsUrl}/api/v1/media/videos/upload/chunk × N DIRECTO │
│   Fase 3  Browser → POST {vpsUrl}/api/v1/media/videos/upload/finalize  DIRECTO │
│   Fase 4  Browser → GET  {vpsUrl}/api/v1/media/videos/status/{id}      DIRECTO │
│   Fase 5  Browser → POST /api/internal/media/videos/complete (Vercel)           │
│           Vercel descarga el video comprimido del VPS y lo sube a R2            │
└─────────────────────────────────────────────────────────────────┘
```

La fase 5 del video sigue en Vercel porque necesita las credenciales de R2 y escribir el registro en la DB — ambas son operaciones server-side.

---

### Gestión del token de sesión

El token dura **2 horas**. El valor se define en el VPS en `app/core/security.py`:

```python
_SESSION_TTL = 7200  # segundos — modifica este valor para cambiar la duración
```

El hook `useMediaGallery` lo gestiona automáticamente:

1. **Al montar**: se hace fetch a `/api/internal/media/vps-session`. Vercel intercambia la master API key por un token corto y lo devuelve al browser.
2. **Auto-refresh**: a los 90% del TTL (1h 48min para un token de 2h) se renueva el token en background antes de que venza.
3. **Degradación limpia**: si el VPS no está disponible o el token venció sin renovarse, `getVpsConfig()` retorna `undefined` y todas las subidas caen automáticamente al proxy de Vercel como fallback.
4. **Cleanup al desmontar**: el timer de refresh se cancela cuando el componente se desmonta.

```
Montar hook
    │
    └─ fetchVpsSession()
           │
           ├─ guarda { url, token, expiresAt }
           └─ timer en 1h 48min → llama fetchVpsSession() otra vez
                                        │
                                        └─ renueva y reprograma
```

---

### Autenticación en el VPS

El VPS acepta dos formas de autenticación:

| Header | Quién lo usa | Scope |
|---|---|---|
| `X-API-Key` | Vercel (server-side) | Master key, acceso completo |
| `X-Session-Token` | Browser (client-side) | Token de 2h, solo endpoints de media |

La master key **nunca llega al browser**. Solo se usa en Vercel para obtener el session token y en la fase 5 del video.

---

### Limpieza de chunks en caso de error

Si una subida de video falla a mitad (token vencido, red cortada, job fallido en el VPS), el cliente envía automáticamente un `DELETE` al VPS para eliminar los chunks ya subidos:

- Cuando hay sesión directa: `DELETE {vpsUrl}/api/v1/media/videos/upload/{uploadId}` con `X-Session-Token`
- Sin sesión: `DELETE /api/internal/media/videos/cancel` a través del proxy de Vercel
- Se usa `keepalive: true` para que el request sobreviva incluso si el usuario cierra el tab

---

### Configuración requerida

#### CMS (`.env`)

```env
# URL base del VPS (sin trailing slash)
MEDIA_VPS_URL=https://optimus.tu-vps.com

# Master API key del VPS
MEDIA_VPS_KEY=tu_api_key_aqui
```

#### VPS (`.env`)

```env
# Orígenes que pueden llamar al VPS directamente desde el browser
CORS_ORIGINS=https://cartum.tu-dominio.com

# API key maestra (la que usa el CMS server-side)
API_KEY=tu_api_key_aqui
```

Sin `CORS_ORIGINS` en el VPS, el browser queda bloqueado por CORS y todas las subidas caen al proxy de Vercel (con sus limitaciones de tamaño).

---

### Archivos relevantes

| Archivo | Rol |
|---|---|
| `app/api/internal/media/vps-session/route.ts` | Vercel intercambia master key → session token |
| `lib/media/video-vps-upload.ts` | Pipeline completo de video: init → chunks → finalize → poll → complete |
| `lib/hooks/useMediaGallery.ts` | Gestión del token, auto-refresh, dispatch a video e imagen |
| VPS: `app/core/security.py` | Store de tokens, `verify_token`, `create_session_token` |
| VPS: `app/main.py` | `CORSMiddleware` con orígenes configurables |
| VPS: `app/api/v1/router.py` | Endpoint `POST /api/v1/auth/session-token` |

---

## English

### The problem it solves

Vercel has a **4.5 MB payload limit** on serverless functions. Without this architecture, every video chunk and every compressed image would pass completely through Vercel before reaching the VPS, consuming the plan's included bandwidth and hitting the size limit.

The solution: the browser obtains a short-lived session token and calls the VPS **directly**, bypassing Vercel. Only the initial handshake and the final video phase (which needs R2 credentials and DB access) go through Vercel.

---

### Byte flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Hook mount                                                      │
│   Browser → GET /api/internal/media/vps-session (Vercel)        │
│           ← { vpsUrl, token, expiresIn: 7200 }  (~200 bytes)   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Image upload                                                    │
│   Browser → POST {vpsUrl}/api/v1/media/images/compress          │
│             Header: X-Session-Token: <token>                    │
│           ← compressed bytes (webp)      DIRECT, no Vercel     │
│   Browser → PUT  R2 presigned URL        DIRECT, no Vercel     │
│   Browser → Server Action saveMediaRecord (metadata JSON only) │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Video upload (chunked)                                          │
│   Phase 1  Browser → POST {vpsUrl}/api/v1/media/videos/upload/init      DIRECT │
│   Phase 2  Browser → POST {vpsUrl}/api/v1/media/videos/upload/chunk × N DIRECT │
│   Phase 3  Browser → POST {vpsUrl}/api/v1/media/videos/upload/finalize  DIRECT │
│   Phase 4  Browser → GET  {vpsUrl}/api/v1/media/videos/status/{id}      DIRECT │
│   Phase 5  Browser → POST /api/internal/media/videos/complete (Vercel)          │
│           Vercel downloads the compressed video from VPS and uploads it to R2   │
└─────────────────────────────────────────────────────────────────┘
```

Video phase 5 stays on Vercel because it needs R2 credentials and DB write access — both are server-side operations.

---

### Session token management

Tokens last **2 hours**. The value is defined on the VPS in `app/core/security.py`:

```python
_SESSION_TTL = 7200  # seconds — change this value to adjust the duration
```

The `useMediaGallery` hook manages them automatically:

1. **On mount**: fetches `/api/internal/media/vps-session`. Vercel exchanges the master API key for a short-lived token and returns it to the browser.
2. **Auto-refresh**: at 90% of the TTL (1h 48min for a 2h token), the token is renewed in the background before it expires.
3. **Clean degradation**: if the VPS is unavailable or the token expired without renewal, `getVpsConfig()` returns `undefined` and all uploads automatically fall back to the Vercel proxy.
4. **Cleanup on unmount**: the refresh timer is cancelled when the component unmounts.

---

### VPS authentication

The VPS accepts two authentication methods:

| Header | Used by | Scope |
|---|---|---|
| `X-API-Key` | Vercel (server-side) | Master key, full access |
| `X-Session-Token` | Browser (client-side) | 2h token, media endpoints only |

The master key **never reaches the browser**. It is only used by Vercel to obtain the session token and in video phase 5.

---

### Chunk cleanup on error

If a video upload fails mid-way (expired token, network failure, VPS job failed), the client automatically sends a `DELETE` to the VPS to remove already-uploaded chunks:

- With direct session: `DELETE {vpsUrl}/api/v1/media/videos/upload/{uploadId}` with `X-Session-Token`
- Without session: `DELETE /api/internal/media/videos/cancel` through the Vercel proxy
- Uses `keepalive: true` so the request survives even if the user closes the tab

---

### Required configuration

#### CMS (`.env`)

```env
# VPS base URL (no trailing slash)
MEDIA_VPS_URL=https://optimus.your-vps.com

# VPS master API key
MEDIA_VPS_KEY=your_api_key_here
```

#### VPS (`.env`)

```env
# Origins allowed to call the VPS directly from the browser
CORS_ORIGINS=https://cartum.your-domain.com

# Master API key (used by the CMS server-side)
API_KEY=your_api_key_here
```

Without `CORS_ORIGINS` on the VPS, the browser is blocked by CORS and all uploads fall back to the Vercel proxy (with its size limitations).

---

### Relevant files

| File | Role |
|---|---|
| `app/api/internal/media/vps-session/route.ts` | Vercel exchanges master key → session token |
| `lib/media/video-vps-upload.ts` | Full video pipeline: init → chunks → finalize → poll → complete |
| `lib/hooks/useMediaGallery.ts` | Token management, auto-refresh, dispatch to video and image |
| VPS: `app/core/security.py` | Token store, `verify_token`, `create_session_token` |
| VPS: `app/main.py` | `CORSMiddleware` with configurable origins |
| VPS: `app/api/v1/router.py` | `POST /api/v1/auth/session-token` endpoint |
