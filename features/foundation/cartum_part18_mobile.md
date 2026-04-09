# Part 18 — Mobile Layout

## Goal
Implement a completely separate mobile layout strategy. The infinite canvas node board is not usable on small screens — on mobile, the board becomes a card list. Content Mode (records) works fully on mobile. Navigation moves to a bottom tab bar.

## Prerequisites
- Part 07 (design system, atoms)
- Part 09 (desktop DockBar, to be shared partially)
- Part 12 (record forms — already mobile-friendly by design)

---

## Strategy: Server-Side Layout Split

Device detection runs on the **server** in the root layout using the `User-Agent` header. This avoids layout flash (the desktop layout never renders on mobile, and vice versa).

```ts
// lib/utils/device.ts (Server only)
import { headers } from 'next/headers'

const MOBILE_AGENTS = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

export async function isMobileDevice(): Promise<boolean> {
  const ua = (await headers()).get('user-agent') ?? ''
  return MOBILE_AGENTS.test(ua)
}
```

```tsx
// app/layout.tsx
import { isMobileDevice } from '@/lib/utils/device'
import { MobileLayout } from '@/components/ui/layouts/MobileLayout'
import { DesktopLayout } from '@/components/ui/layouts/DesktopLayout'

export default async function RootLayout({ children }) {
  const mobile = await isMobileDevice()
  const Layout = mobile ? MobileLayout : DesktopLayout
  // ...
  return (
    <html>
      <body>
        <DictionaryProvider dict={dict}>
          <Layout>{children}</Layout>
          <Toaster theme="dark" position="bottom-right" richColors closeButton visibleToasts={3} />
        </DictionaryProvider>
      </body>
    </html>
  )
}
```

---

## `MobileLayout` Component

```tsx
// components/ui/layouts/MobileLayout.tsx
'use client'
// Full-height column layout:
// ┌──────────────────────────────┐
// │         TopBar               │  48px
// ├──────────────────────────────┤
// │                              │
// │         Page content         │  flex-1, overflow-y-auto
// │         (safe area padding)  │
// │                              │
// ├──────────────────────────────┤
// │        BottomTabBar          │  56px + safe-area-inset-bottom
// └──────────────────────────────┘

export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-dvh bg-background">
      <MobileTopBar />
      <main className="flex-1 overflow-y-auto pb-safe">
        {children}
      </main>
      <BottomTabBar />
    </div>
  )
}
```

`pb-safe` → `padding-bottom: env(safe-area-inset-bottom)` for iPhone home indicator clearance.

---

## `BottomTabBar` Molecule

```tsx
// components/ui/molecules/BottomTabBar.tsx
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface Tab {
  href: string
  icon: React.ReactNode
  label: string
  exact?: boolean
}

const tabs: Tab[] = [
  { href: '/cms', icon: <HomeIcon />, label: 'Home', exact: true },
  { href: '/cms/content', icon: <FileTextIcon />, label: 'Content' },
  { href: '/cms/schema', icon: <LayoutIcon />, label: 'Schema' },
  { href: '/cms/settings', icon: <SettingsIcon />, label: 'Settings' },
]
```

Active tab highlighted with `text-primary`. Inactive tabs use `text-muted`.

---

## Mobile Node Board → InfiniteCanvas

The canvas board is the same on mobile and desktop. `InfiniteCanvas` renders on all devices.
Touch interactions are built in: pan (single finger), pinch-to-zoom (two fingers), long-press for context menu.

`MobileNodeList` was removed — the canvas is fully usable on touch devices.

---

## Mobile Breadcrumb

Same breadcrumb data as desktop — different visual treatment:

```
< Authors > Blog Posts
```

On mobile it renders as a horizontal scroll row pinned under the top bar, with just the parent name and a back arrow. Deeper paths truncate older ancestors with `…`.

---

## Content Mode on Mobile

Record forms are already responsive (from Part 11). On mobile, they render full-width. The content route structure is identical:

```
/cms/content/[nodeId]          → record list (cards, not table)
/cms/content/[nodeId]/new      → full-screen form
/cms/content/[nodeId]/[id]     → full-screen edit form
```

Record list on mobile:
- Cards instead of table rows
- Each card shows the first 2-3 fields as a preview
- Tap → opens the record edit form

```tsx
// components/ui/organisms/MobileRecordList.tsx
// Shared with desktop logic but different visual layout
// Desktop: DataTable
// Mobile: stacked cards
```

---

## Bottom Sheet Pattern

Modals and panels that use full dialogs on desktop use **bottom sheets** on mobile:

```
// components/ui/molecules/BottomSheet.tsx
// Slides up from the bottom (transform: translateY)
// Half-height or full-height depending on content
// Swipe-down gesture to dismiss (via touch events)
// Backdrop tap to dismiss
```

Used for:
- Field editor (mobile version of `FieldEditPanel`)
- Node creation quick form
- Confirmation dialogs
- Settings (full-height bottom sheet replacing the floating panel)

---

## Touch Interactions

| Desktop | Mobile equivalent |
|---|---|
| Hover on node → show connector ports | Long-press (500ms) on node card |
| Drag node to reposition | Not available (card list is auto-ordered) |
| Click node to select | Tap |
| Double-click node to enter/edit | Tap → navigate |
| Right-click context menu | Long-press context sheet |

### Long Press Implementation

```ts
// lib/hooks/useLongPress.ts
export function useLongPress(onLongPress: () => void, duration = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = () => {
    timerRef.current = setTimeout(onLongPress, duration)
  }

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
  }
}
```

---

## Viewport Meta

Next.js root layout must include the correct viewport meta:

```tsx
// app/layout.tsx
import type { Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,      // prevent iOS auto-zoom on input focus
  userScalable: false,
  viewportFit: 'cover', // allow drawing behind iPhone notch/home bar
}
```

---

## CSS Utilities

Add to `globals.css`:
```css
/* Safe area inset padding utilities */
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
.pt-safe { padding-top: env(safe-area-inset-top); }

/* Full-height including safe areas */
.h-dvh { height: 100dvh; } /* dynamic viewport height — handles mobile browser chrome */
```

---

## Breakpoint Rule

**Desktop layout:** ≥ 1024px (`lg`) — even if UA says desktop browser.  
**Mobile layout:** UA detection (server-side). Any tablet/phone UA gets mobile layout regardless of screen width.

This prevents iPad users from getting a canvas that's hard to use, and desktop users with small windows from accidentally getting the mobile layout.

---

## Acceptance Criteria

- [x] iPhone UA → `MobileLayout` renders (no flash of desktop layout)
- [x] Desktop UA → `DesktopLayout` renders
- [x] `BottomTabBar` shows 4 tabs with correct active highlight
- [x] `/cms/board` on mobile shows `InfiniteCanvas` with touch interactions
- [x] Pan (single finger), pinch-to-zoom (two fingers), long-press context menu
- [x] fit-to-view centers nodes correctly on any viewport size
- [x] Record list on mobile renders as stacked cards
- [x] Record create/edit forms are full-width and usable on 375px screens
- [x] Field edit opens as a bottom sheet on mobile
- [x] Settings opens as a full-height bottom sheet on mobile
- [x] Long-press (500ms) on a node card shows context actions
- [x] `height: 100dvh` prevents layout jumps when mobile browser chrome shows/hides
- [x] Safe-area padding is applied at bottom of content and bottom tab bar
- [x] `maximum-scale: 1` prevents iOS zooming on input focus
