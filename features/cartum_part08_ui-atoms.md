# Part 08 — UI Atoms & VHSTransition

## Goal
Build the VHSTransition effect component and all atomic UI building blocks (Button, Input, Badge, Icon, Label, Tooltip, Spinner). Every atom uses `cva()` for style variants and exports its prop types to `/types/ui.ts`. These atoms are the components every subsequent UI part imports for consistent styling.

## Prerequisites
- Part 07 (design tokens in `app/theme.css`, Tailwind v4 utility classes configured)

---

## VHS Transition Component

### `/components/ui/transitions/VHSTransition.tsx`

Client Component. Wraps any content and applies the VHS entry animation on mount (or when `trigger` prop changes).

**Props:**
```ts
interface VHSTransitionProps {
  children: React.ReactNode
  duration?: 'fast' | 'normal' | 'full'  // 300ms / 500ms / 800ms
  trigger?: unknown   // changing this value re-fires the effect
  className?: string
}
```

**Animation layers (CSS + inline keyframes):**
1. `scanlines` — repeating-linear-gradient overlay pseudo-element sweeping top to bottom
2. `rgb-shift` — `filter: blur()` + `drop-shadow()` on R/G/B channels via pseudo-elements
3. `glitch` — `transform: translateX()` keyframes with irregular steps
4. `focus-in` — `filter: blur(4px)` → `blur(0)` over the full duration

All layers are defined as `@keyframes` in `app/theme.css` (inside `@theme`) and composed via the `animate-vhs` utility class. No external animation library. The component applies `vhs-transition` class during animation and removes it via `animationend` event to restore normal rendering.

**Usage:**
```tsx
<VHSTransition duration="full">
  <NodeBoard />
</VHSTransition>
```

```tsx
// In-page content swap — re-fires when nodeId changes
<VHSTransition duration="fast" trigger={currentNodeId}>
  <NodeList nodes={nodes} />
</VHSTransition>
```

---

## Atom Components

All atoms use `cva()` for variants. All have named prop types exported to `/types/ui.ts`.

### `/components/ui/atoms/Button.tsx`
```ts
variants:
  variant: 'primary' | 'ghost' | 'danger' | 'outline'
  size: 'sm' | 'md' | 'lg' | 'icon'

States: hover (brightness shift), focus (accent ring), disabled (opacity 40%), loading (spinner replaces label)
```

### `/components/ui/atoms/Input.tsx`
```ts
variants:
  variant: 'default' | 'error'
  size: 'sm' | 'md'

Props: label, error, hint, prefix icon, suffix icon
Focus: border changes to --color-primary
Error: border changes to --color-danger, error message below
```

### `/components/ui/atoms/Badge.tsx`
```ts
variants:
  variant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted'
  size: 'sm' | 'md'
```

### `/components/ui/atoms/Icon.tsx`
Thin wrapper around Lucide icons. Consistent sizing via `size` prop. Sets color via `className`.

```ts
Props: name (LucideIconName), size ('sm'|'md'|'lg'), className
```

### `/components/ui/atoms/Label.tsx`
```ts
For form labels and technical labels. Uses --font-mono for technical variant.
variants:
  variant: 'default' | 'mono' | 'muted'
  size: 'sm' | 'md'
```

### `/components/ui/atoms/Tooltip.tsx`
Client Component. Renders children with a floating tooltip on hover.
```ts
Props: content (string), side ('top'|'bottom'|'left'|'right'), children
```
No library — uses CSS `position: absolute` + visibility toggle with `role="tooltip"` for accessibility.

### `/components/ui/atoms/Spinner.tsx`
Animated loading indicator. Used inside Button (loading state) and page-level loading.
```ts
variants:
  size: 'sm' | 'md' | 'lg'
  color: 'primary' | 'accent' | 'muted'
```

---

## Types to Add

### `/types/ui.ts`
```ts
export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline'
export type SizeVariant = 'sm' | 'md' | 'lg'
export type AlertType = 'success' | 'error' | 'warning' | 'info'
export type TooltipSide = 'top' | 'bottom' | 'left' | 'right'
```

---

## CVA Usage Pattern

Every atom follows this structure:

```ts
// components/ui/atoms/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:brightness-110',
        ghost: 'bg-transparent text-text hover:bg-surface-2',
        danger: 'bg-danger text-white hover:brightness-110',
        outline: 'border border-border text-text hover:bg-surface-2',
      },
      size: {
        sm: 'text-xs px-2 py-1 rounded-sm',
        md: 'text-sm px-4 py-2 rounded-md',
        lg: 'text-base px-6 py-3 rounded-lg',
        icon: 'p-2 rounded-md',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
  }

export function Button({ variant, size, loading, children, ...props }: ButtonProps) { ... }
```

**Regla**: ningún atom usa `style={{}}` ni valores de color hardcodeados. Solo utility classes de los tokens definidos en `app/theme.css`.

---

## Acceptance Criteria

- [ ] `VHSTransition` with `duration="full"` plays all 4 animation layers on mount
- [ ] `VHSTransition` re-fires when `trigger` prop value changes
- [ ] No animation runs on subsequent renders if `trigger` has not changed
- [ ] `vhs-transition` class is present during animation and removed on `animationend`
- [ ] All atoms (Button, Input, Badge, Icon, Label, Tooltip, Spinner) render without errors
- [ ] Button loading state shows Spinner and disables interaction
- [ ] Input with `error` prop shows red border and error message below
- [ ] Tooltip appears on hover and is accessible via keyboard focus (`role="tooltip"`, ARIA)
- [ ] All atom prop types are exported from `/types/ui.ts`
- [ ] Every atom uses `cva()` for all style variants — no conditional className string logic
- [ ] Cero `style={{ color: '...' }}` o `bg-[#hex]` en los atoms — solo utility classes de tokens
