# Design Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the design language foundation (Ocean & Forest tokens + hybrid shell + reusable patterns) so the upcoming Itinerary CRUD feature plugs into a coherent UI instead of inventing its own visual language ad-hoc.

**Architecture:** Three layers landed in order — (1) CSS tokens swap in `globals.css` (immediate visual shift), (2) primitive components (`StatusBadge`, `EmptyState`, `IconTile`, `ItemRow`, `Breadcrumb`, `ThemeToggle`, `UserMenu`, `Sheet`) with no app coupling, (3) shell components (`AppShell`, `GlobalSidebar`, `TopBar`, `TripShell`, `TripRail`, `TripSummaryBanner`) consumed by rewritten `(app)/layout.tsx` and a restructured `trips/[id]` route tree (`layout.tsx` + `page.tsx` Overview + four stub sub-routes). Existing trip CRUD components migrate to the new tokens. Pure helpers (`resolveTheme`, `avatarInitials`) are unit-tested; UI components are verified by manual smoke test (per AGENTS.md §10).

**Tech Stack:** Next.js 16 (App Router, `proxy.ts` not `middleware.ts`, async `params`), Tailwind CSS 4, shadcn v4 (Base UI primitives — **no** `<Trigger asChild><Button>` pattern), TypeScript strict, lucide-react, date-fns with Indonesian locale, Vitest for pure helper tests, Husky pre-commit + commitlint conventional commits.

**Reference:** Design spec at `docs/superpowers/specs/2026-05-28-design-language-design.md`. Mockup at `/tmp/travelin-mockup/index.html` (servable via `.claude/launch.json` `mockup` config).

---

## Task 1: Update color and radius tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Rewrite the `:root` and `.dark` blocks**

Replace lines 51–118 of `src/app/globals.css` with the new Ocean & Forest palette. Keep everything else (the `@import`, `@theme inline {}`, `@custom-variant dark`, `@layer base {}`) exactly as-is.

```css
:root {
  --background: oklch(0.985 0.001 75);          /* #FAFAF7 warm sand */
  --foreground: oklch(0.215 0.027 235);         /* #0F1F2C */
  --card: oklch(1 0 0);                         /* #FFFFFF */
  --card-foreground: oklch(0.215 0.027 235);    /* #0F1F2C */
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.215 0.027 235);
  --primary: oklch(0.65 0.115 184);             /* #0D9488 teal-600 */
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.965 0.003 188);          /* #F1F5F4 */
  --secondary-foreground: oklch(0.215 0.027 235);
  --muted: oklch(0.965 0.003 188);
  --muted-foreground: oklch(0.555 0.011 220);   /* #5F6E73 */
  --accent: oklch(0.59 0.155 237);              /* #0284C7 ocean blue */
  --accent-foreground: oklch(1 0 0);
  --destructive: oklch(0.577 0.245 27.325);     /* preserved */
  --border: oklch(0.925 0.005 184);             /* #E6EBE9 */
  --input: oklch(0.925 0.005 184);
  --ring: oklch(0.65 0.115 184);                /* primary teal */
  --chart-1: oklch(0.65 0.115 184);
  --chart-2: oklch(0.59 0.155 237);
  --chart-3: oklch(0.555 0.011 220);
  --chart-4: oklch(0.65 0.18 60);               /* warning amber */
  --chart-5: oklch(0.577 0.245 27.325);
  --radius: 0.625rem;
  --sidebar: oklch(1 0 0);
  --sidebar-foreground: oklch(0.215 0.027 235);
  --sidebar-primary: oklch(0.65 0.115 184);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.965 0.003 188);
  --sidebar-accent-foreground: oklch(0.215 0.027 235);
  --sidebar-border: oklch(0.925 0.005 184);
  --sidebar-ring: oklch(0.65 0.115 184);
}

.dark {
  --background: oklch(0.18 0.018 220);          /* #0A1A1F deep teal-black */
  --foreground: oklch(0.97 0.005 188);          /* #F0F5F4 */
  --card: oklch(0.245 0.025 225);               /* #0F2530 */
  --card-foreground: oklch(0.97 0.005 188);
  --popover: oklch(0.245 0.025 225);
  --popover-foreground: oklch(0.97 0.005 188);
  --primary: oklch(0.79 0.135 178);             /* #2DD4BF teal-400 */
  --primary-foreground: oklch(0.18 0.018 220);
  --secondary: oklch(0.275 0.018 215);          /* #1A2D33 */
  --secondary-foreground: oklch(0.97 0.005 188);
  --muted: oklch(0.275 0.018 215);
  --muted-foreground: oklch(0.7 0.018 220);     /* #8EA0A6 */
  --accent: oklch(0.77 0.135 230);              /* #38BDF8 sky-400 */
  --accent-foreground: oklch(0.18 0.018 220);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.32 0.022 228);              /* #1F3540 */
  --input: oklch(0.32 0.022 228);
  --ring: oklch(0.79 0.135 178);
  --chart-1: oklch(0.79 0.135 178);
  --chart-2: oklch(0.77 0.135 230);
  --chart-3: oklch(0.7 0.018 220);
  --chart-4: oklch(0.82 0.15 80);
  --chart-5: oklch(0.704 0.191 22.216);
  --sidebar: oklch(0.245 0.025 225);
  --sidebar-foreground: oklch(0.97 0.005 188);
  --sidebar-primary: oklch(0.79 0.135 178);
  --sidebar-primary-foreground: oklch(0.18 0.018 220);
  --sidebar-accent: oklch(0.275 0.018 215);
  --sidebar-accent-foreground: oklch(0.97 0.005 188);
  --sidebar-border: oklch(0.32 0.022 228);
  --sidebar-ring: oklch(0.79 0.135 178);
}
```

- [ ] **Step 2: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: PASS (CSS changes don't affect TS).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): swap to ocean & forest palette tokens

Replace shadcn neutral grayscale with teal primary (#0D9488) and
ocean blue accent (#0284C7). Warm sand background in light, deep
teal-black in dark. Existing components inherit new look via
CSS variables, no JSX changes yet."
```

Pre-commit will run lint-staged (no .ts changes, skipped) + typecheck. Should pass.

---

## Task 2: Add Sheet shadcn component for mobile nav

**Files:**
- Create: `src/components/ui/sheet.tsx` (via shadcn CLI)

- [ ] **Step 1: Run shadcn add**

```bash
npx shadcn@latest add sheet
```

Expected: file created at `src/components/ui/sheet.tsx`. If CLI prompts about overwriting, accept.

- [ ] **Step 2: Verify file content imports `@base-ui/react`**

Open `src/components/ui/sheet.tsx` and confirm it uses `@base-ui/react` primitives (not `@radix-ui`). If it pulled the Radix version, abort and ask shadcn config — but the existing `src/components/ui/` files already use `@base-ui/react/button` so it should match.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/sheet.tsx
git commit -m "chore(ui): add shadcn sheet primitive

Needed for mobile off-canvas navigation drawer (MobileNav)."
```

---

## Task 3: Create StatusBadge primitive

**Files:**
- Create: `src/components/ui/status-badge.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/ui/status-badge.tsx`:

```tsx
import { cn } from '@/lib/utils'

type Status = 'planning' | 'ongoing' | 'completed' | 'archived'

const STATUS_LABEL: Record<Status, string> = {
  planning: 'Planning',
  ongoing: 'Ongoing',
  completed: 'Completed',
  archived: 'Archived',
}

const STATUS_CLASSES: Record<Status, string> = {
  planning:
    'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent',
  ongoing:
    'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary',
  completed: 'bg-muted text-muted-foreground',
  archived: 'bg-muted text-muted-foreground opacity-70',
}

export function StatusBadge({
  status,
  className,
}: {
  status: Status
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_CLASSES[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/status-badge.tsx
git commit -m "feat(ui): add StatusBadge primitive

Replaces lib/format.ts statusLabel + statusColor. Uses token-driven
color-mix for soft tints so badges adapt to light/dark automatically."
```

---

## Task 4: Create EmptyState primitive

**Files:**
- Create: `src/components/ui/empty-state.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/ui/empty-state.tsx`:

```tsx
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center',
        className
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/empty-state.tsx
git commit -m "feat(ui): add EmptyState primitive

Replaces ad-hoc 'rounded-lg border border-dashed p-12' pattern
duplicated in dashboard and trip detail."
```

---

## Task 5: Create SectionHeader, IconTile, and ItemRow primitives

**Files:**
- Create: `src/components/ui/section-header.tsx`
- Create: `src/components/ui/icon-tile.tsx`
- Create: `src/components/ui/item-row.tsx`

- [ ] **Step 1: Write `section-header.tsx`**

```tsx
import { cn } from '@/lib/utils'

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('mb-4 flex items-start justify-between gap-3', className)}
    >
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
```

- [ ] **Step 2: Write `icon-tile.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type IconTone = 'primary' | 'accent' | 'muted'

const TILE_BG: Record<IconTone, string> = {
  primary:
    'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] dark:bg-[color-mix(in_oklab,var(--primary)_18%,transparent)]',
  accent:
    'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] dark:bg-[color-mix(in_oklab,var(--accent)_18%,transparent)]',
  muted: 'bg-muted',
}

const TILE_FG: Record<IconTone, string> = {
  primary: 'text-primary',
  accent: 'text-accent',
  muted: 'text-muted-foreground',
}

const TILE_SIZE = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
}

const ICON_SIZE = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
}

export function IconTile({
  icon: Icon,
  tone = 'primary',
  size = 'md',
  className,
}: {
  icon: LucideIcon
  tone?: IconTone
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg shrink-0',
        TILE_SIZE[size],
        TILE_BG[tone],
        className
      )}
    >
      <Icon className={cn(ICON_SIZE[size], TILE_FG[tone])} />
    </div>
  )
}
```

- [ ] **Step 3: Write `item-row.tsx`**

```tsx
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { IconTile, type IconTone } from './icon-tile'

type ItemRowProps = {
  icon: LucideIcon
  iconTone?: IconTone
  time?: string
  duration?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
  href?: string
  className?: string
}

export function ItemRow({
  icon,
  iconTone = 'primary',
  time,
  duration,
  title,
  subtitle,
  actions,
  href,
  className,
}: ItemRowProps) {
  const content = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors',
        href && 'hover:bg-[color-mix(in_oklab,var(--primary)_4%,var(--card))]',
        className
      )}
    >
      <IconTile icon={icon} tone={iconTone} />
      <div className="min-w-0 flex-1">
        {time || duration ? (
          <div className="mb-0.5 flex items-baseline gap-2">
            {time ? (
              <span className="text-xs font-medium text-muted-foreground">
                {time}
              </span>
            ) : null}
            {duration ? (
              <span className="text-xs text-muted-foreground">
                · {duration}
              </span>
            ) : null}
          </div>
        ) : null}
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }
  return content
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/section-header.tsx src/components/ui/icon-tile.tsx src/components/ui/item-row.tsx
git commit -m "feat(ui): add SectionHeader, IconTile, ItemRow primitives

Reusable cross-feature patterns. ItemRow is generic — it accepts
icon + tone + time/duration + title/subtitle + actions and will be
used by itinerary, bookings, and expenses item rendering."
```

---

## Task 6: Create Breadcrumb primitive

**Files:**
- Create: `src/components/ui/breadcrumb.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/ui/breadcrumb.tsx`:

```tsx
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export function Breadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[]
  className?: string
}) {
  if (items.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1 text-sm', className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {item.label}
              </span>
            )}
            {!isLast ? (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            ) : null}
          </span>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/breadcrumb.tsx
git commit -m "feat(ui): add Breadcrumb primitive

Used by TopBar in sub-pages (e.g., 'Trips > Bali Adventure')."
```

---

## Task 7: Add resolveTheme helper with unit tests

**Files:**
- Create: `src/lib/theme.ts`
- Create: `tests/lib/theme.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/theme.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveTheme, type ThemePreference } from '@/lib/theme'

describe('resolveTheme', () => {
  it('returns "light" when preference is light, regardless of system', () => {
    expect(resolveTheme('light', 'light')).toBe('light')
    expect(resolveTheme('light', 'dark')).toBe('light')
  })

  it('returns "dark" when preference is dark, regardless of system', () => {
    expect(resolveTheme('dark', 'light')).toBe('dark')
    expect(resolveTheme('dark', 'dark')).toBe('dark')
  })

  it('returns system when preference is "system"', () => {
    expect(resolveTheme('system', 'light')).toBe('light')
    expect(resolveTheme('system', 'dark')).toBe('dark')
  })

  it('defaults to light if preference is unknown', () => {
    expect(resolveTheme('weird' as ThemePreference, 'dark')).toBe('light')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/lib/theme.test.ts`
Expected: FAIL — `Cannot find module '@/lib/theme'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/theme.ts`:

```ts
export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

/**
 * Resolves user preference to an effective theme.
 * - 'light' or 'dark' → applied directly
 * - 'system' → follows the systemPreference argument
 * - any other value → safe-falls back to 'light'
 */
export function resolveTheme(
  preference: ThemePreference,
  systemPreference: ResolvedTheme
): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') return preference
  if (preference === 'system') return systemPreference
  return 'light'
}

export const THEME_STORAGE_KEY = 'travelin-theme'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/lib/theme.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts tests/lib/theme.test.ts
git commit -m "feat(lib): add resolveTheme helper with unit tests

Pure function that resolves a user's theme preference (light/dark/
system) into an effective theme, given the current system value.
Used by ThemeToggle and FOUC inline script."
```

---

## Task 8: Add ThemeToggle component and FOUC inline script

**Files:**
- Create: `src/components/ui/theme-toggle.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write `theme-toggle.tsx`**

Create `src/components/ui/theme-toggle.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import {
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/lib/theme'
import { cn } from '@/lib/utils'

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference, getSystemPreference())
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function ThemeToggle({ className }: { className?: string }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setPreferenceState(readPreference())
    setMounted(true)
  }, [])

  // React to OS-level changes when preference is 'system'
  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  const cycle = useCallback(() => {
    setPreferenceState((prev) => {
      const next: ThemePreference =
        prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
      applyTheme(next)
      return next
    })
  }, [])

  // Avoid hydration mismatch — render a stable placeholder before mount.
  if (!mounted) {
    return (
      <button
        type="button"
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground',
          className
        )}
        aria-label="Tema"
      >
        <Monitor className="h-4 w-4" />
      </button>
    )
  }

  const Icon =
    preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor
  const label =
    preference === 'light'
      ? 'Tema: terang'
      : preference === 'dark'
        ? 'Tema: gelap'
        : 'Tema: ikut sistem'

  return (
    <button
      type="button"
      onClick={cycle}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className
      )}
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
```

- [ ] **Step 2: Modify `src/app/layout.tsx` to inject the inline FOUC script**

Replace the existing body of the `RootLayout` function. The script must run synchronously before React hydrates so the `dark` class is set before paint, preventing a flash of incorrect theme. Final `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'travelin — Your travel companion',
    template: '%s · travelin',
  },
  description:
    'Plan, track, and remember every trip. Itinerary, bookings, expenses, and memories — all in one place.',
  keywords: [
    'travel app',
    'trip planner',
    'itinerary',
    'expense tracker',
    'travel companion',
    'Southeast Asia travel',
  ],
  authors: [{ name: 'mifmelse' }],
  creator: 'mifmelse',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  ),
  openGraph: {
    title: 'travelin — Your travel companion',
    description:
      'Plan, track, and remember every trip. Itinerary, bookings, expenses, and memories — all in one place.',
    url: '/',
    siteName: 'travelin',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'travelin — Your travel companion',
    description:
      'Plan, track, and remember every trip. Itinerary, bookings, expenses, and memories — all in one place.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF7' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1A1F' },
  ],
  width: 'device-width',
  initialScale: 1,
}

const themeInitScript = `
(function() {
  try {
    var pref = localStorage.getItem('travelin-theme');
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var resolved = pref === 'light' || pref === 'dark' ? pref : (pref === 'system' || pref === null ? system : 'light');
    if (resolved === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
```

Note: also updated `viewport.themeColor` to match new palette and changed `<html lang="en">` to `<html lang="id">` (locale is now Indonesian per spec §2 principle #5).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/theme-toggle.tsx src/app/layout.tsx
git commit -m "feat(ui): add ThemeToggle with FOUC-prevention init script

Cycles light → dark → system. Persists in localStorage. Inline
script in <head> resolves theme before hydration so no flash on
initial paint. Locale set to id, themeColor matches new palette."
```

---

## Task 9: Create UserMenu component

**Files:**
- Create: `src/lib/avatar.ts`
- Create: `tests/lib/avatar.test.ts`
- Create: `src/components/shell/user-menu.tsx`

- [ ] **Step 1: Write the avatar helper test**

Create `tests/lib/avatar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { avatarInitials } from '@/lib/avatar'

describe('avatarInitials', () => {
  it('returns first letter for a single word', () => {
    expect(avatarInitials('Miftah')).toBe('M')
  })

  it('returns first letters of first two words', () => {
    expect(avatarInitials('Miftah Aulia')).toBe('MA')
  })

  it('ignores extra words beyond the second', () => {
    expect(avatarInitials('Miftah Aulia Rahman')).toBe('MA')
  })

  it('uppercases the result', () => {
    expect(avatarInitials('miftah aulia')).toBe('MA')
  })

  it('falls back to ? for empty input', () => {
    expect(avatarInitials('')).toBe('?')
    expect(avatarInitials('   ')).toBe('?')
    expect(avatarInitials(null)).toBe('?')
    expect(avatarInitials(undefined)).toBe('?')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- tests/lib/avatar.test.ts`
Expected: FAIL — `Cannot find module '@/lib/avatar'`.

- [ ] **Step 3: Write the avatar helper**

Create `src/lib/avatar.ts`:

```ts
export function avatarInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const words = trimmed.split(/\s+/).slice(0, 2)
  return words.map((w) => w[0]!.toUpperCase()).join('')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- tests/lib/avatar.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 5: Write the UserMenu component**

Create directory and file:

```bash
mkdir -p src/components/shell
```

Create `src/components/shell/user-menu.tsx`:

```tsx
'use client'

import { LogOut, User, Settings } from 'lucide-react'
import { logout } from '@/app/(auth)/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { avatarInitials } from '@/lib/avatar'
import { cn } from '@/lib/utils'

type UserMenuProps = {
  displayName: string | null
  email: string | null
  variant?: 'icon' | 'compact'
  className?: string
}

export function UserMenu({
  displayName,
  email,
  variant = 'compact',
  className,
}: UserMenuProps) {
  const initials = avatarInitials(displayName ?? email)
  const label = displayName ?? email ?? 'Akun'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-2 rounded-lg text-sm transition-colors hover:bg-muted',
          variant === 'icon' ? 'h-9 w-9 justify-center' : 'px-2 py-1.5',
          className
        )}
        aria-label="Akun"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
          {initials}
        </span>
        {variant === 'compact' ? (
          <span className="hidden md:inline truncate max-w-[8rem] text-muted-foreground">
            {label}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{displayName ?? 'Traveler'}</span>
            {email ? (
              <span className="text-xs text-muted-foreground truncate">
                {email}
              </span>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 6: Verify Profile/Settings items disabled state renders (they're placeholders per spec §8)**

This is a code-read confirmation — no command. The items use `disabled` prop; clicks should be no-ops.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/avatar.ts tests/lib/avatar.test.ts src/components/shell/user-menu.tsx
git commit -m "feat(shell): add UserMenu with avatar initials helper

Dropdown contains: user info, Profile (placeholder), Settings
(placeholder), inline ThemeToggle, and Logout (existing server
action). Uses display_name or email fallback for initials."
```

---

## Task 10: Create GlobalSidebar

**Files:**
- Create: `src/components/shell/global-sidebar.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/shell/global-sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Settings } from 'lucide-react'
import { UserMenu } from './user-menu'
import { cn } from '@/lib/utils'

type GlobalSidebarProps = {
  displayName: string | null
  email: string | null
}

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/settings', icon: Settings, label: 'Settings' },
] as const

export function GlobalSidebar({ displayName, email }: GlobalSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex h-screen w-16 shrink-0 flex-col items-center border-r border-border bg-card py-4 sticky top-0">
      <Link
        href="/dashboard"
        className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground"
        aria-label="travelin home"
      >
        t
      </Link>

      <nav className="flex flex-1 flex-col gap-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                active
                  ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={label}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
            </Link>
          )
        })}
      </nav>

      <UserMenu displayName={displayName} email={email} variant="icon" />
    </aside>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/global-sidebar.tsx
git commit -m "feat(shell): add GlobalSidebar (icon-only, desktop only)

Sticky 64px sidebar with brand mark, Dashboard + Settings nav,
and UserMenu at bottom. Hidden below md breakpoint; MobileNav
will provide the mobile equivalent."
```

---

## Task 11: Create MobileNav and TopBar

**Files:**
- Create: `src/components/shell/mobile-nav.tsx`
- Create: `src/components/shell/top-bar.tsx`

- [ ] **Step 1: Write `mobile-nav.tsx`**

Create `src/components/shell/mobile-nav.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Home, Settings } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/settings', icon: Settings, label: 'Settings' },
] as const

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
        <SheetDescription className="sr-only">
          Daftar halaman utama
        </SheetDescription>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
              t
            </div>
            <span className="text-base font-semibold text-foreground">
              travelin
            </span>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

If the generated `Sheet` API exports differ from the imports above (e.g. it uses `SheetHeader` instead of bare `SheetTitle`/`SheetDescription`), adjust this file to match. Open `src/components/ui/sheet.tsx` and align the imports/components accordingly. Keep the `sr-only` title/description for accessibility.

- [ ] **Step 2: Write `top-bar.tsx`**

Create `src/components/shell/top-bar.tsx`:

```tsx
import { UserMenu } from './user-menu'
import { MobileNav } from './mobile-nav'

type TopBarProps = {
  displayName: string | null
  email: string | null
}

export function TopBar({ displayName, email }: TopBarProps) {
  return (
    <div className="px-4 pt-4 md:px-6">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <MobileNav />
        </div>
        <UserMenu displayName={displayName} email={email} variant="compact" />
      </div>
    </div>
  )
}
```

**Breadcrumb placement note:** The breadcrumb does NOT live in TopBar. Because AppShell wraps the trip detail layout, child layouts can't push data up to TopBar without React-gymnastics. Breadcrumb is rendered inside `TripShell` instead (just above `TripSummaryBanner`). The visual position remains right under the topbar.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/shell/mobile-nav.tsx src/components/shell/top-bar.tsx
git commit -m "feat(shell): add MobileNav (sheet drawer) and TopBar

TopBar is a card-shape sticky bar: hamburger (mobile only) +
breadcrumb (desktop only) + UserMenu. MobileNav is the off-canvas
replacement for GlobalSidebar at < md."
```

---

## Task 12: Create AppShell and rewrite `(app)/layout.tsx`

**Files:**
- Create: `src/components/shell/app-shell.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Write `app-shell.tsx`**

Create `src/components/shell/app-shell.tsx`:

```tsx
import { GlobalSidebar } from './global-sidebar'
import { TopBar } from './top-bar'

type AppShellProps = {
  displayName: string | null
  email: string | null
  children: React.ReactNode
}

export function AppShell({ displayName, email, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <GlobalSidebar displayName={displayName} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar displayName={displayName} email={email} />
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `src/app/(app)/layout.tsx`**

The existing file does: auth gate + ensureProfile + manual header/main. Keep auth gate + ensureProfile, replace JSX with `AppShell`. New file:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/services/profile.service'
import { AppShell } from '@/components/shell/app-shell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await ensureProfile(supabase, user)

  return (
    <AppShell
      displayName={profile.display_name}
      email={user.email ?? null}
    >
      {children}
    </AppShell>
  )
}
```

Note: the previous layout imported `logout` from `../(auth)/actions` and `Button` from `@/components/ui/button` — these are now consumed inside `UserMenu`, so the imports here drop.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/shell/app-shell.tsx src/app/\(app\)/layout.tsx
git commit -m "feat(shell): wire AppShell into (app)/layout

Replaces hand-rolled header + main JSX with AppShell composition.
Auth gate + ensureProfile preserved. Dashboard and trip pages now
render inside the global sidebar + topbar shell."
```

---

## Task 13: Migrate TripCard and dashboard to StatusBadge + EmptyState

**Files:**
- Modify: `src/components/features/trip/trip-card.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Update `trip-card.tsx`**

Replace contents of `src/components/features/trip/trip-card.tsx`:

```tsx
import Link from 'next/link'
import { MapPin, Calendar } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatTripDateRange } from '@/lib/format'

type TripCardProps = {
  trip: {
    id: string
    title: string
    description: string | null
    destination: string | null
    start_date: string | null
    end_date: string | null
    status: 'planning' | 'ongoing' | 'completed' | 'archived'
  }
}

export function TripCard({ trip }: TripCardProps) {
  return (
    <Link href={`/trips/${trip.id}`} className="block">
      <Card className="transition-colors hover:bg-[color-mix(in_oklab,var(--primary)_4%,var(--card))]">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1">{trip.title}</CardTitle>
            <StatusBadge status={trip.status} className="shrink-0" />
          </div>
          {trip.description && (
            <CardDescription className="line-clamp-2">
              {trip.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {trip.destination && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{trip.destination}</span>
            </div>
          )}
          {(trip.start_date || trip.end_date) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatTripDateRange(trip.start_date, trip.end_date)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
```

Changes from before: imports `StatusBadge` instead of `statusLabel`/`statusColor`, replaces the inline `<span>` badge JSX, swaps `hover:bg-accent/50` to the primary-tinted hover via `color-mix`.

- [ ] **Step 2: Update `src/app/(app)/dashboard/page.tsx`**

Replace contents:

```tsx
import { MapPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/services/profile.service'
import { listTripsForUser } from '@/services/trip.service'
import { TripCard } from '@/components/features/trip/trip-card'
import { NewTripDialog } from '@/components/features/trip/new-trip-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [profile, trips] = await Promise.all([
    getCurrentProfile(supabase),
    listTripsForUser(supabase, user.id),
  ])

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Halo, ${profile?.display_name ?? 'Traveler'} 👋`}
        description={
          trips.length === 0
            ? 'Yuk, bikin trip pertama lo.'
            : `Lo punya ${trips.length} trip.`
        }
        action={<NewTripDialog />}
      />

      {trips.length === 0 ? (
        <EmptyState
          icon={MapPlus}
          title="Belum ada trip"
          description="Klik tombol 'Trip baru' di atas untuk mulai planning trip pertama lo."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  )
}
```

Notes: greeting is now in `SectionHeader` (consistent h2 size). Empty state uses `EmptyState` component with `MapPlus` icon. `NewTripDialog` already brings its own icons internally so no extra import here.

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. If lint warns about unused `Plus`, drop it.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/trip/trip-card.tsx src/app/\(app\)/dashboard/page.tsx
git commit -m "refactor(trip): migrate TripCard and dashboard to new primitives

TripCard now uses StatusBadge component instead of inline statusColor.
Dashboard greeting becomes SectionHeader; empty state becomes
EmptyState primitive. Visual matches design mockup."
```

---

## Task 14: Create TripContext and TripSummaryBanner

**Files:**
- Create: `src/components/features/trip/trip-context.tsx`
- Create: `src/components/features/trip/trip-summary-banner.tsx`

- [ ] **Step 1: Write `trip-context.tsx`**

Create `src/components/features/trip/trip-context.tsx`:

```tsx
'use client'

import { createContext, useContext } from 'react'
import type { Database } from '@/types/database'

export type TripRow = Database['public']['Tables']['trips']['Row']

type TripContextValue = {
  trip: TripRow
}

const TripContext = createContext<TripContextValue | null>(null)

export function TripProvider({
  trip,
  children,
}: {
  trip: TripRow
  children: React.ReactNode
}) {
  return (
    <TripContext.Provider value={{ trip }}>{children}</TripContext.Provider>
  )
}

export function useTrip(): TripRow {
  const ctx = useContext(TripContext)
  if (!ctx) {
    throw new Error('useTrip must be used within <TripProvider>')
  }
  return ctx.trip
}
```

- [ ] **Step 2: Write `trip-summary-banner.tsx`**

Create `src/components/features/trip/trip-summary-banner.tsx`:

```tsx
'use client'

import { MapPin, Calendar } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { TripActionsMenu } from './trip-actions-menu'
import { formatTripDateRange } from '@/lib/format'
import { useTrip } from './trip-context'

export function TripSummaryBanner() {
  const trip = useTrip()
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="truncate text-xl font-bold text-foreground">
            {trip.title}
          </h1>
          <StatusBadge status={trip.status} />
        </div>
        <TripActionsMenu trip={trip} />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {trip.destination ? (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span>{trip.destination}</span>
          </div>
        ) : null}
        {(trip.start_date || trip.end_date) && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatTripDateRange(trip.start_date, trip.end_date)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
```

Note: This uses `useTrip()` from the context provider. If `TripActionsMenu` requires a different prop signature (e.g. it expects more fields than `TripRow` exposes), open `src/components/features/trip/trip-actions-menu.tsx` and align — the file currently accepts `trip` props with `id`, `title`, `description`, `destination`, `start_date`, `end_date`, `status`, which is a subset of `TripRow`. Should be fine.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/trip/trip-context.tsx src/components/features/trip/trip-summary-banner.tsx
git commit -m "feat(trip): add TripContext provider and TripSummaryBanner

Context lets the banner + rail read trip data on the client without
re-fetching. Banner shows title + status + meta + actions menu in
a card above the rail."
```

---

## Task 15: Create TripRail

**Files:**
- Create: `src/components/shell/trip-rail.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/shell/trip-rail.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpenText,
  Calendar as CalendarIcon,
  ClipboardList,
  DollarSign,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TripRailProps = {
  tripId: string
}

const ITEMS = [
  { segment: '', icon: BookOpenText, label: 'Overview' },
  { segment: '/itinerary', icon: CalendarIcon, label: 'Itinerary' },
  { segment: '/bookings', icon: ClipboardList, label: 'Bookings' },
  { segment: '/expenses', icon: DollarSign, label: 'Expenses' },
  { segment: '/members', icon: Users, label: 'Members' },
] as const

export function TripRail({ tripId }: TripRailProps) {
  const pathname = usePathname()
  const base = `/trips/${tripId}`

  function isActive(segment: string) {
    const href = `${base}${segment}`
    if (segment === '') return pathname === base
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      {/* Desktop: vertical rail */}
      <nav className="hidden md:flex w-44 shrink-0 flex-col gap-0.5 rounded-xl border border-border bg-card p-2 self-start sticky top-24">
        {ITEMS.map(({ segment, icon: Icon, label }) => {
          const active = isActive(segment)
          return (
            <Link
              key={segment || 'overview'}
              href={`${base}${segment}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Mobile: horizontal scroll tabs */}
      <nav className="md:hidden -mx-4 px-4 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ITEMS.map(({ segment, icon: Icon, label }) => {
          const active = isActive(segment)
          return (
            <Link
              key={segment || 'overview'}
              href={`${base}${segment}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'shrink-0 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
                active
                  ? 'border-primary bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-primary font-medium'
                  : 'border-border bg-card text-muted-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/trip-rail.tsx
git commit -m "feat(shell): add TripRail for trip sub-section nav

Vertical rail (≥md) with 5 sub-sections. Collapses to horizontal
scroll tabs on mobile. Active state via usePathname matching."
```

---

## Task 16: Create TripShell and restructure `trips/[id]`

**Files:**
- Create: `src/components/shell/trip-shell.tsx`
- Create: `src/app/(app)/trips/[id]/layout.tsx`
- Modify: `src/app/(app)/trips/[id]/page.tsx` (becomes Overview)
- Create: `src/app/(app)/trips/[id]/itinerary/page.tsx`
- Create: `src/app/(app)/trips/[id]/bookings/page.tsx`
- Create: `src/app/(app)/trips/[id]/expenses/page.tsx`
- Create: `src/app/(app)/trips/[id]/members/page.tsx`

- [ ] **Step 1: Write `trip-shell.tsx`**

Create `src/components/shell/trip-shell.tsx`:

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { TripSummaryBanner } from '@/components/features/trip/trip-summary-banner'
import { TripRail } from '@/components/shell/trip-rail'

type TripShellProps = {
  tripId: string
  tripTitle: string
  children: React.ReactNode
}

export function TripShell({ tripId, tripTitle, children }: TripShellProps) {
  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: 'Trips', href: '/dashboard' },
          { label: tripTitle },
        ]}
        className="hidden md:flex"
      />
      <TripSummaryBanner />
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <TripRail tripId={tripId} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
```

Breadcrumb lives here (not in TopBar) because layout-to-shell data flow only goes downward in the React tree.

- [ ] **Step 2: Create `trips/[id]/layout.tsx`**

Create `src/app/(app)/trips/[id]/layout.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTripById } from '@/services/trip.service'
import { TripProvider } from '@/components/features/trip/trip-context'
import { TripShell } from '@/components/shell/trip-shell'

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const trip = await getTripById(supabase, id, user.id)
  if (!trip) notFound()

  return (
    <TripProvider trip={trip}>
      <TripShell tripId={trip.id} tripTitle={trip.title}>
        {children}
      </TripShell>
    </TripProvider>
  )
}
```

- [ ] **Step 3: Rewrite `trips/[id]/page.tsx` as Overview content only**

Replace contents of `src/app/(app)/trips/[id]/page.tsx`:

```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { BookOpenText } from 'lucide-react'

export default function TripOverviewPage() {
  return (
    <EmptyState
      icon={BookOpenText}
      title="Overview trip"
      description="Ringkasan trip (highlights, statistik, link cepat) bakal muncul di sini setelah fitur Itinerary, Bookings, dan Expenses jalan."
    />
  )
}
```

The trip title/status/meta/actions are now rendered by `TripSummaryBanner` (from the layout), so the page only needs to render the section content (here, Overview).

- [ ] **Step 4: Create stub sub-routes**

```bash
mkdir -p src/app/\(app\)/trips/\[id\]/itinerary
mkdir -p src/app/\(app\)/trips/\[id\]/bookings
mkdir -p src/app/\(app\)/trips/\[id\]/expenses
mkdir -p src/app/\(app\)/trips/\[id\]/members
```

Create `src/app/(app)/trips/[id]/itinerary/page.tsx`:

```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { Calendar } from 'lucide-react'

export default function TripItineraryPage() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Itinerary" />
      <EmptyState
        icon={Calendar}
        title="Belum ada itinerary"
        description="Itinerary CRUD masih dalam perjalanan. Stay tuned, ya."
      />
    </div>
  )
}
```

Create `src/app/(app)/trips/[id]/bookings/page.tsx`:

```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { ClipboardList } from 'lucide-react'

export default function TripBookingsPage() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Bookings" />
      <EmptyState
        icon={ClipboardList}
        title="Belum ada booking"
        description="Catatan booking dari Traveloka, Booking.com, dst. akan muncul di sini."
      />
    </div>
  )
}
```

Create `src/app/(app)/trips/[id]/expenses/page.tsx`:

```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { DollarSign } from 'lucide-react'

export default function TripExpensesPage() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Expenses" />
      <EmptyState
        icon={DollarSign}
        title="Belum ada expense"
        description="Pengeluaran trip lo bakal tercatat di sini, multi-currency."
      />
    </div>
  )
}
```

Create `src/app/(app)/trips/[id]/members/page.tsx`:

```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { Users } from 'lucide-react'

export default function TripMembersPage() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Members" />
      <EmptyState
        icon={Users}
        title="Cuma lo sendiri di trip ini"
        description="Invitation flow buat ajak teman/pasangan join trip lagi dirancang."
      />
    </div>
  )
}
```

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/shell/trip-shell.tsx src/app/\(app\)/trips/\[id\]/layout.tsx src/app/\(app\)/trips/\[id\]/page.tsx src/app/\(app\)/trips/\[id\]/itinerary src/app/\(app\)/trips/\[id\]/bookings src/app/\(app\)/trips/\[id\]/expenses src/app/\(app\)/trips/\[id\]/members
git commit -m "feat(trip): restructure trips/[id] with TripShell layout

Split the trip detail page into a layout (TripShell with summary
banner + rail) and section pages (Overview, Itinerary, Bookings,
Expenses, Members). Sub-pages are stubs rendering EmptyState; real
CRUD lands in subsequent feature plans."
```

---

## Task 17: Remove deprecated statusLabel and statusColor from lib/format.ts

**Files:**
- Modify: `src/lib/format.ts`

- [ ] **Step 1: Confirm there are no remaining callers**

Run: `grep -rn "statusLabel\|statusColor" src/ tests/ 2>/dev/null`
Expected: zero matches (TripCard was the only consumer, migrated in Task 13).

If matches appear, migrate those call sites to `StatusBadge` first.

- [ ] **Step 2: Remove the two functions**

Edit `src/lib/format.ts`, keep only `formatTripDateRange` and `formatCurrency`. Final content:

```ts
import { format, parseISO } from 'date-fns'

export function formatTripDateRange(
  startDate: string | null,
  endDate: string | null
): string {
  if (!startDate && !endDate) return 'Tanggal belum diisi'
  if (startDate && !endDate)
    return `Mulai ${format(parseISO(startDate), 'd MMM yyyy')}`
  if (!startDate && endDate)
    return `Sampai ${format(parseISO(endDate), 'd MMM yyyy')}`

  const start = parseISO(startDate!)
  const end = parseISO(endDate!)

  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'd')}–${format(end, 'd MMM yyyy')}`
    }
    return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`
  }

  return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`
}

export function formatCurrency(amountCents: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100)
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/format.ts
git commit -m "refactor(lib): drop statusLabel + statusColor from format.ts

Both functions are now superseded by the StatusBadge component.
formatTripDateRange and formatCurrency remain."
```

---

## Task 18: Manual smoke test in dev server

**Files:**
- Modify: `.claude/launch.json` (add `dev` config alongside the existing `mockup` config)

The goal of this task is to verify the implementation visually matches the design mockup in both light and dark modes and across breakpoints. No code-under-test, but we make small fixes inline if anything breaks.

- [ ] **Step 1: Add a `dev` config to `.claude/launch.json`**

Replace the file with:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "mockup",
      "runtimeExecutable": "python3",
      "runtimeArgs": ["-m", "http.server", "4321", "--directory", "/tmp/travelin-mockup"],
      "port": 4321
    },
    {
      "name": "dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 3000
    }
  ]
}
```

- [ ] **Step 2: Start the dev server**

In the operator's loop, call `mcp__Claude_Preview__preview_start` with `name: "dev"`. Wait for the dev server log to settle (Next 16 + Turbopack typically ~3s).

- [ ] **Step 3: Resize and screenshot the dashboard (desktop, light)**

```
preview_resize → preset: desktop, colorScheme: light
preview_screenshot → save reference
```

Navigate to `/dashboard` (sign-in first if needed via real credentials in your local Supabase). Expect: warm sand background, teal "Trip baru" CTA, global icon sidebar, trip cards with `StatusBadge`. Match against `Dashboard Light` panel in the mockup.

- [ ] **Step 4: Screenshot the dashboard (desktop, dark)**

```
preview_resize → preset: desktop, colorScheme: dark
preview_screenshot
```

Confirm theme initial script applied class without flash. Match against `Dashboard Dark` panel in mockup.

- [ ] **Step 5: Screenshot a trip detail (desktop, light + dark)**

Click into any trip. Verify:
- Breadcrumb appears in TopBar: `Trips › <title>`
- `TripSummaryBanner` shows title + status + meta + 3-dot menu
- Rail shows Overview (active), Itinerary, Bookings, Expenses, Members
- Overview content shows EmptyState placeholder
- Click each rail link → URL changes, active state moves, sub-page shows its own EmptyState

- [ ] **Step 6: Test ThemeToggle cycle**

Open UserMenu → click ThemeToggle. Verify icon cycles Sun → Moon → Monitor → Sun and `<html>` class toggles. Reload page → preference persists.

- [ ] **Step 7: Resize and screenshot mobile (375×812)**

```
preview_resize → preset: mobile
```

On `/dashboard`: verify GlobalSidebar is hidden, hamburger appears in TopBar, tapping it opens the Sheet drawer. On `/trips/<id>`: verify TripRail collapsed to horizontal scroll chips below the summary banner.

- [ ] **Step 8: Stop the dev server**

Call `mcp__Claude_Preview__preview_stop` with the serverId returned from start.

- [ ] **Step 9: Wrap up**

`.claude/` is gitignored (verify with `git check-ignore .claude/launch.json` — exit 0 means ignored). The `dev` config addition stays local only; nothing to commit there.

If steps 3–7 surfaced any visual bugs, fix them inline in the relevant component file, run `npm run typecheck && npm run lint`, then commit with the conventional format:

```bash
git commit -m "fix(design): <short bug description>"
```

---

## Out of scope (explicitly deferred)

These are recognized as needed but not in this plan:

- `/settings` page route — GlobalSidebar links to it but no page exists. Returns 404 when clicked. Build when first setting (e.g., display name edit) is wanted.
- `Profile` and `Settings` items in `UserMenu` are placeholder/disabled.
- Accessibility audit (keyboard nav, focus ring polish, ARIA on icon-only buttons beyond the labels we set).
- Itinerary CRUD itself — runs as its own plan after this one merges.
- Booking CRUD, Expense CRUD, Members CRUD — separate plans.
- Storybook / visual regression — out of MVP per AGENTS.md §10.

---

## Plan summary

| # | Task | Files touched |
|---|---|---|
| 1 | Update color/radius tokens | `globals.css` |
| 2 | Add Sheet shadcn component | `ui/sheet.tsx` |
| 3 | StatusBadge primitive | `ui/status-badge.tsx` |
| 4 | EmptyState primitive | `ui/empty-state.tsx` |
| 5 | SectionHeader + IconTile + ItemRow | 3 new files in `ui/` |
| 6 | Breadcrumb primitive | `ui/breadcrumb.tsx` |
| 7 | resolveTheme helper + tests | `lib/theme.ts`, test |
| 8 | ThemeToggle + FOUC script | `ui/theme-toggle.tsx`, `app/layout.tsx` |
| 9 | UserMenu + avatar helper + tests | 3 new files + test |
| 10 | GlobalSidebar | `shell/global-sidebar.tsx` |
| 11 | MobileNav + TopBar | 2 new files in `shell/` |
| 12 | AppShell + rewrite `(app)/layout.tsx` | 1 new + 1 modified |
| 13 | Migrate TripCard + dashboard | 2 modified |
| 14 | TripContext + TripSummaryBanner | 2 new files |
| 15 | TripRail | `shell/trip-rail.tsx` |
| 16 | TripShell + trip layout + sub-routes | 7 new + 1 modified |
| 17 | Remove deprecated statusLabel/statusColor | 1 modified |
| 18 | Manual smoke test in dev server | `.claude/launch.json` (local only) |

Total: ~22 new files, ~5 modified, ~17 commits. Each commit is a runnable working state.
