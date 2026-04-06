# Part 16 — Alert & Notification System (Sonner)

## Goal
Implement the global toast notification system using **Sonner v2** — the standard toast library for shadcn/ui projects. Sonner requires zero context setup, works from anywhere in the codebase via a simple `toast()` call, and has a built-in stacking animation. A thin `useToast()` wrapper provides type-safe shorthand methods and integrates with the translation system.

**This replaces the custom AlertContext/AlertProvider/AlertContainer system described in earlier drafts.**

## Prerequisites
- Part 07 (design tokens, Tailwind theme — used to match Sonner styles to Cartum palette)
- Part 15 (translation keys — error messages passed to `toast.error()`)

---

## Why Sonner over alternatives

| | Sonner 2.0.7 | react-hot-toast 2.6 | Sileo 0.1.5 |
|---|---|---|---|
| Weekly downloads | 31M+ | 3.5M | ~17K |
| Last publish | active | 8 months ago | 1 month ago (alpha) |
| shadcn/ui integration | ✓ official default | ✗ | ✗ |
| Promise API | ✓ `toast.promise()` | ✓ | unknown |
| Stacking / grouping | ✓ | ✗ | ✓ (physics) |
| Dark theme | ✓ `theme="dark"` | manual | unknown |
| Production maturity | high | high | none (v0.1.5) |

**Sileo** is interesting for its physics-based animations but at v0.1.5 with 15 total dependents it is not suitable for a production CMS. **react-hot-toast** is stagnating (8 months without update). **Sonner** is the clear choice — it's the official shadcn/ui default and Cartum already uses shadcn/ui.

---

## Installation

```bash
pnpm add sonner
```

---

## Setup: `<Toaster />` in Root Layout

Add the `<Toaster />` component once, at the root layout level. No context provider needed.

```tsx
// app/layout.tsx
import { Toaster } from 'sonner'

export default async function RootLayout({ children }) {
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <html lang={locale}>
      <body>
        <DictionaryProvider dict={dict}>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            richColors
            closeButton
            visibleToasts={3}
            gap={8}
            toastOptions={{
              classNames: {
                toast:        'font-mono text-sm border bg-surface border-border',
                title:        'text-text',
                description:  'text-text-muted',
                actionButton: 'bg-primary text-white text-xs',
                cancelButton: 'bg-surface-2 text-text-muted text-xs',
                closeButton:  'text-text-muted hover:text-text',
                success:      'border-success/30',
                error:        'border-danger/30',
                warning:      'border-yellow-500/30',
                info:         'border-primary/30',
              },
            }}
          />
        </DictionaryProvider>
      </body>
    </html>
  )
}
```

- `theme="dark"` → Sonner renders in dark mode automatically
- `richColors` → success/error/warning/info get their semantic colors
- `closeButton` → a dismiss `✕` appears on each toast
- `position="bottom-right"` → aligns with the dock layout
- `visibleToasts={3}` → max 3 stacked, older ones pushed out automatically

---

## Direct Usage (no hook required)

Sonner's `toast()` can be called from **any client component** without hooks or providers:

```ts
import { toast } from 'sonner'

toast('Record saved.')
toast.success('Record saved.')
toast.error('Upload failed. Try again.')
toast.warning('Connection unstable.')
toast.info('Changes are pending review.')

// Persistent (no auto-dismiss)
toast.error('Critical error.', { duration: Infinity })
```

---

## `useToast()` — Thin Wrapper Hook

A lightweight wrapper that adds type-safe named methods and translation integration:

```ts
// lib/hooks/useToast.ts
'use client'
import { toast } from 'sonner'
import { useDictionary } from '@/components/ui/providers/DictionaryProvider'
import { t } from '@/lib/i18n/t'
import type { ExternalToast } from 'sonner'

export function useToast() {
  const dict = useDictionary()

  return {
    success: (message: string, opts?: ExternalToast) =>
      toast.success(message, opts),

    error: (message: string, opts?: ExternalToast) =>
      toast.error(message, { duration: 6000, ...opts }),

    warning: (message: string, opts?: ExternalToast) =>
      toast.warning(message, opts),

    info: (message: string, opts?: ExternalToast) =>
      toast.info(message, opts),

    /** Show a translated message by dictionary key */
    errorKey: (key: Parameters<typeof t>[1], opts?: ExternalToast) =>
      toast.error(t(dict, key), { duration: 6000, ...opts }),

    /** Promise toast — shows loading → success/error automatically */
    promise: toast.promise,

    dismiss: toast.dismiss,
    dismissAll: () => toast.dismiss(),
  }
}
```

Usage:
```ts
const { success, error, errorKey, promise } = useToast()

success('Record saved.')
error('Upload failed.')
errorKey('media.uploadError')    // resolves translation key

// Promise (automatic loading → success/error)
promise(saveRecord(data), {
  loading: 'Saving…',
  success: 'Record saved.',
  error: (err) => err.message ?? 'Something went wrong.',
})
```

---

## `toast.promise()` — The Standard Pattern for Server Actions

```ts
// In a 'use client' component
import { toast } from 'sonner'

async function handleSave(formData: FormData) {
  toast.promise(
    createRecord(formData).then((result) => {
      if (!result.success) throw new Error(result.error)
      return result
    }),
    {
      loading: 'Saving record…',
      success: 'Record saved.',
      error: (err) => err.message,
    }
  )
}
```

This handles the loading spinner state, error state, and success state of the toast automatically — no manual state machine needed.

---

## Confirmation Dialogs

For destructive actions (Delete node, Revoke token, Remove user), use a **confirmation modal** — NOT a toast. Toasts are for passive notifications, not blocking confirmations.

```tsx
// components/ui/molecules/ConfirmDialog.tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/shadcn/alert-dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', onConfirm, onCancel, destructive }: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent className="vhs-panel">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? 'bg-danger hover:bg-danger/90' : ''}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## CSS Variable Mapping

Override Sonner's dark theme tokens in `globals.css` to match Cartum's palette:

```css
/* globals.css */
:root {
  --normal-bg: var(--color-surface);
  --normal-border: var(--color-border);
  --normal-text: var(--color-text);
  --success-bg: var(--color-surface);
  --success-border: color-mix(in srgb, var(--color-success) 30%, transparent);
  --success-text: var(--color-success);
  --error-bg: var(--color-surface);
  --error-border: color-mix(in srgb, var(--color-danger) 30%, transparent);
  --error-text: var(--color-danger);
  --gray1: var(--color-surface-2);
  --gray4: var(--color-border);
  --gray12: var(--color-text);
}
```

---

## Sonner Configuration Reference

| Prop | Value | Description |
|---|---|---|
| `theme` | `"dark"` | Dark mode |
| `position` | `"bottom-right"` | Above the dock |
| `richColors` | `true` | Semantic colors |
| `closeButton` | `true` | Dismiss button on every toast |
| `visibleToasts` | `3` | Max stacked |
| `gap` | `8` | Pixels between stacked toasts |
| `duration` | `4000` | Default auto-dismiss (ms) |

---

## What was removed (vs. the custom system)

| Removed | Replaced by |
|---|---|
| `lib/context/AlertContext.tsx` | `<Toaster />` in root layout |
| `components/ui/organisms/AlertContainer.tsx` | Built into Sonner |
| `components/ui/molecules/AlertToast.tsx` | Built into Sonner |
| `types/alerts.ts` | `ExternalToast` type from `sonner` |
| Custom `AlertProvider` wrapper | Not needed |

The only new file to create: `lib/hooks/useToast.ts`.

---

## Acceptance Criteria

- [ ] `pnpm add sonner` is in package.json (^2.0.7)
- [ ] `<Toaster theme="dark" position="bottom-right" richColors closeButton visibleToasts={3} />` in root layout
- [ ] `toast.success('msg')` shows a green toast in the bottom-right corner
- [ ] `toast.error('msg')` shows a red toast, auto-dismisses after 6s
- [ ] 4th toast replaces the oldest (maxed at 3 via `visibleToasts`)
- [ ] `toast.dismiss()` with no args clears all toasts
- [ ] `toast.promise()` shows loading → success/error states automatically
- [ ] `useToast().errorKey('media.uploadError')` resolves and shows the translated string
- [ ] `closeButton` appears and dismisses on click
- [ ] CSS variables override makes toasts match Cartum's dark palette (surface bg, border colors)
- [ ] No `AlertContext`, `AlertProvider`, or `AlertContainer` files exist
- [ ] `ConfirmDialog` molecule exists using shadcn/ui `<AlertDialog>` for destructive actions
- [ ] Persistent toasts work with `duration: Infinity`

