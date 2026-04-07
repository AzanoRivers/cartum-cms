# Part 24 — Settings Enhancements: i18n, Password Change, DB Section & Global Spinner

## Context
Four independent improvements requested after Part 23:
1. Panel title "SETTINGS" hardcoded in English — needs i18n
2. Account section lacks a password-change flow
3. No database management tools (export / import / full reset)
4. Async operations use `cursor:wait` hack — needs a real visual spinner

---

## 1. Settings Panel Title i18n (SETTINGS → AJUSTES)

### Problem
`SettingsPanel.tsx` line ~170 has `'Settings'` hardcoded — never translates to Spanish.

### Solution
- Add `settings.panelTitle` key to `locales/en.ts` data + Dictionary type
  - `en`: `'SETTINGS'`
  - `es`: `'AJUSTES'`
- Replace hardcoded string in `SettingsPanel.tsx` with `d.panelTitle`

### Files Changed

| File | Change |
|---|---|
| `locales/en.ts` | add `settings.panelTitle: 'SETTINGS'` (data + Dictionary type) |
| `locales/es.ts` | add `settings.panelTitle: 'AJUSTES'` |
| `components/ui/organisms/SettingsPanel.tsx` | `'Settings'` → `d.panelTitle` |

---

## 2. Password Change in Account Section

### Architecture

**Server Action** — `lib/actions/account.actions.ts`
- New `changePasswordAction({ currentPassword, newPassword })`
- Schema: `{ currentPassword: z.string().min(1), newPassword: z.string().min(12) }`
- Flow: get session → load user → `verifyPassword(currentPassword, user.passwordHash)` → if wrong, return `{ success: false, error: 'wrong_password' }` → hash new → `UPDATE users SET password_hash`

**UI** — `AccountSection.tsx`
- New collapsible sub-section below the email block, separated by a `<div h-px bg-border />`
- Two `type="password"` fields: `currentPassword`, `newPassword`
- "Generate" button: produces 16-char secure password (`[a-zA-Z0-9!@#$%&*]`), fills `newPassword`, copies to clipboard → brief "Copied!" label swap
- Validation: `newPassword.length >= 12` to enable Submit
- On success: clear both fields + `toast.success`
- On `wrong_password` error: inline error under `currentPassword` field
- `useTransition` for async state (same pattern as email section)

**i18n** — new `settings.account.password` block:
```
title, currentLabel, newLabel, change, changing, changed,
generate, copied, errorWeak, errorWrong, errorUnknown
```

### Files Changed

| File | Change |
|---|---|
| `lib/actions/account.actions.ts` | add `changePasswordAction` |
| `components/ui/organisms/settings/AccountSection.tsx` | add password sub-section |
| `locales/en.ts` | add `settings.account.password.*` (data + Dictionary type) |
| `locales/es.ts` | same in Spanish |

---

## 3. New "DB" Section in Settings

### Store & Navigation
- `lib/stores/uiStore.ts` — `SettingsSection` union: add `'db'`
- `SettingsPanel.tsx` — add `{ key: 'db', superAdminOnly: true }` to `ALL_SECTIONS`
- `locales/en.ts` + `es.ts` — `settings.nav.db: 'Database'` / `'Base de datos'`

### Sub-component: `DbSection.tsx`
`components/ui/organisms/settings/DbSection.tsx` — three separated blocks:

**Block A — Export**
- Server Action `exportDatabaseAction()` in `lib/actions/db.actions.ts`
  - Queries all data tables in correct order (users, roles, project settings, nodes, connections, records, media, api tokens)
  - Renders safe `INSERT INTO … ON CONFLICT DO NOTHING` SQL for each table
  - Returns `{ success: true, data: { sql: string, filename: string } }`
- Client: on click → download via `URL.createObjectURL(new Blob([sql]))` + `<a download>`
- Shows `<Spinner>` during generation

**Block B — Import**
- `<input type="file" accept=".sql">` (hidden, triggered by styled button)
- Server Action `importDatabaseAction(sql: string)` — parses and executes INSERT statements in a single transaction
- Warning card: amber border "This will overwrite existing data with the imported content"
- Shows `<Spinner>` + blocks UI during import

**Block C — Danger Zone**
- Red-bordered card with "DANGER ZONE" / "ZONA DE PELIGRO" heading
- Button "Delete all data" → opens `DangerResetDialog`
- Server Action `resetCmsAction()` in `lib/actions/db.actions.ts`:
  - Deletes all rows from all tables in FK-safe reverse order
  - Deletes `app_settings` rows → CMS is treated as "not initialized" on next request
  - Returns `{ success: true }`
- After reset: `router.replace('/setup/locale')`

**New dialog: `DangerResetDialog.tsx`**
`components/ui/molecules/DangerResetDialog.tsx`
- Pattern: same as `DeleteConfirmDialog` (no overlay, VHSTransition, dict + FALLBACK)
- Red accent bar at top
- Text input where user must type exactly the confirmation phrase
  - `en`: `DELETE PERMANENTLY`
  - `es`: `BORRAR PERMANENTEMENTE`
- Submit button red, enabled only when typed text === phrase exactly
- Shows `<Spinner>` inline in button while `isPending`

**i18n** — new `settings.db` block:
```
title, exportTitle, exportDesc, exportButton, exporting,
importTitle, importDesc, importButton, importing, importOverwriteWarn,
importSuccess, importError,
dangerTitle, dangerDesc, dangerButton,
resetDialog: { title, desc, placeholder, confirmPhrase, cancel, confirm, confirming }
```

### Files Changed

| File | Change |
|---|---|
| `lib/stores/uiStore.ts` | add `'db'` to `SettingsSection` |
| `lib/actions/db.actions.ts` | new — `exportDatabaseAction`, `importDatabaseAction`, `resetCmsAction` |
| `components/ui/organisms/SettingsPanel.tsx` | add `db` section to `ALL_SECTIONS` + `sectionsContent` |
| `components/ui/organisms/settings/DbSection.tsx` | new — full DB management UI |
| `components/ui/molecules/DangerResetDialog.tsx` | new — double-confirm reset dialog |
| `locales/en.ts` | add `settings.nav.db` + `settings.db.*` (data + Dictionary type) |
| `locales/es.ts` | same in Spanish |

---

## 4. Global Spinner / FullscreenLoader

### Architecture

**Atom: `Spinner.tsx`**
`components/ui/atoms/Spinner.tsx`
- Pure SVG ring spinner — no CSS border trick
- `cva()` variants: `size: sm(16px) | md(24px) | lg(40px)`
- `color: primary | muted | white`
- SVG: single `<circle>` with `stroke-dasharray` + `stroke-dashoffset` + `animate-spin` (700ms linear infinite)
- Zero external dependencies, usable anywhere

**Atom: `FullscreenLoader.tsx`**
`components/ui/atoms/FullscreenLoader.tsx`
- `fixed inset-0 z-[9999]` overlay with `bg-bg/60 backdrop-blur-sm`
- Centers a `<Spinner size="lg" />` + optional `label` in font-mono text-muted below
- `pointer-events-auto` to block all clicks underneath

**Store integration**
- `uiStore.ts` → add `globalLoading: boolean` + `setGlobalLoading: (v: boolean) => void`
- Render `{globalLoading && <FullscreenLoader />}` in `app/cms/layout.tsx`

**Replace cursor-wait usages (3 cases):**

1. `NodeCard.tsx` (`isNavigating`): click en un nodo → spinner fullscreen hasta que Next.js completa la navegación
   - `setIsNavigating(true)` → `<FullscreenLoader label="Cargando…" />`
   - La navegación siempre termina (el componente se desmonta), nunca queda colgado

2. `InfiniteCanvas.tsx` (`isCheckingDelete`): comprobación de integridad antes de eliminar
   - `<style>cursor:wait</style>` → `<FullscreenLoader label="Verificando dependencias…" />`

3. `InfiniteCanvas.tsx` (`deleteIsPending`): mientras se ejecuta el borrado confirmado
   - `deleteIsPending && <FullscreenLoader label="Eliminando…" />`
   - Cubre el caso de `DangerResetDialog` también (usa `setGlobalLoading` desde la acción)

### Files Changed

| File | Change |
|---|---|
| `components/ui/atoms/Spinner.tsx` | new — SVG ring spinner with cva variants |
| `components/ui/atoms/FullscreenLoader.tsx` | new — full-screen overlay with Spinner |
| `lib/stores/uiStore.ts` | add `globalLoading` + `setGlobalLoading` |
| `app/cms/layout.tsx` | render `<FullscreenLoader>` when `globalLoading` |
| `components/ui/organisms/InfiniteCanvas.tsx` | replace cursor-wait (×2) con `<FullscreenLoader>` |
| `components/ui/molecules/NodeCard.tsx` | replace cursor-wait con `<FullscreenLoader>` |

---

## Execution Order

1. **Spinner/FullscreenLoader** — available for all subsequent tasks
2. **Settings panel title i18n** — trivial, unblocks correct `d.panelTitle` reference
3. **Password change** — new Server Action + UI sub-section in Account
4. **DB section** — largest scope: 3 Server Actions + 2 new components + i18n block

---

## Acceptance Criteria

### #1 — Settings panel title i18n
- [x] Con locale `es` el sidebar del panel muestra "AJUSTES"
- [x] Con locale `en` el sidebar del panel sigue mostrando "SETTINGS"
- [x] No hay strings de título hardcodeados en `SettingsPanel.tsx`

### #2 — Password change
- [x] Con contraseña actual correcta y nueva ≥ 12 chars → actualiza y muestra `toast.success`
- [x] Con contraseña actual incorrecta → error inline bajo el campo, sin toast
- [x] Nueva contraseña < 12 chars → botón "Cambiar" deshabilitado
- [x] Botón "Generar" produce una contraseña de 16+ chars seguros, la inserta en el campo `newPassword` y la copia al clipboard
- [x] Breve etiqueta "¡Copiado!" aparece en el botón tras copiar y vuelve a "Generar" tras 2s
- [x] Ambos campos se vacían tras éxito
- [x] Los textos del bloque están correctamente traducidos en `en` y `es`

### #3 — DB section
- [x] La sección "DB" / "Base de datos" aparece en el nav del panel sólo para superAdmin
- [x] "Exportar" genera y descarga un archivo `.json` con todos los datos del CMS (nodos, campos, registros, media)
- [x] El archivo exportado puede reimportarse sin errores
- [x] "Importar" con un `.json` válido restaura los datos y muestra `toast.success`
- [x] "Importar" con un archivo inválido o no-JSON muestra `toast.error`
- [x] El botón "Borrar todos los datos" abre `DangerResetDialog`
- [x] El botón de confirmación en `DangerResetDialog` está deshabilitado hasta escribir la frase exacta (`BORRAR PERMANENTEMENTE` / `DELETE PERMANENTLY`)
- [x] Texto incorrecto en el input → botón permanece deshabilitado
- [x] Tras confirmar el reset, redirige a `/setup/locale` y el CMS arranca como primera ejecución
- [x] Spinner visible durante export, import y reset (nunca cursor-wait)
- [x] Todas las cadenas del bloque DB están en `en` y `es`

### #4 — Global Spinner / FullscreenLoader
- [x] `<Spinner size="sm">` renderiza sin estilos externos, visible en cualquier fondo oscuro
- [x] `<Spinner size="md">` y `<Spinner size="lg">` escalan correctamente
- [x] `<FullscreenLoader>` cubre toda la pantalla y bloquea clics mientras está visible
- [x] `<FullscreenLoader label="…">` muestra el texto en font-mono debajo del spinner
- [x] `setGlobalLoading(true)` desde cualquier parte del CMS activa el loader global
- [x] `setGlobalLoading(false)` lo oculta sin artefactos visuales
- [x] Al hacer clic en un nodo se muestra el spinner fullscreen hasta completar la navegación
- [x] Durante la comprobación de integridad de borrado se muestra el spinner fullscreen
- [x] Durante el borrado confirmado de un nodo se muestra el spinner fullscreen
- [x] `InfiniteCanvas.tsx` ya no usa `<style>cursor:wait</style>` — usa `<FullscreenLoader>` (×2)
- [x] `NodeCard.tsx` ya no usa `<style>cursor:wait</style>` — usa `<FullscreenLoader>`
