# Design Language Spec — travelin

**Date**: 2026-05-28
**Status**: Draft, pending user review
**Scope**: Foundations + reusable patterns required to ship the Itinerary CRUD feature. Patterns outside that scope (date picker, map picker, member chip, expense category chart, etc.) are deferred to their respective feature specs.

---

## 1. Goals

Establish a coherent visual language for travelin **before** Itinerary, Bookings, Expenses, and Members CRUD features land. Each future feature inherits the same shell, palette, typography, and reusable patterns. The cost of defining the language now (one short spec) is much lower than the cost of refactoring three features into consistency later.

**Non-goals**:
- Full design system covering every conceivable component
- Brand mark / logo design beyond a wordmark + "t" monogram
- Animation library or page transitions
- Storybook or component documentation site
- Accessibility audit (WCAG compliance is a follow-up effort)

---

## 2. Principles

1. **Konten dulu, chrome belakangan** — UI elements (border, shadow, badge) must not overpower trip content. Cards prefer whitespace over heavy borders.
2. **Hierarki via ukuran + warna, bukan border** — heading size + weight + color carry hierarchy. Borders only separate structural regions (topbar bottom, section divider).
3. **Motion melayani feedback, bukan dekorasi** — `transition-colors` standard, `active:scale-[0.98]` for primary buttons, `hover:bg-accent/40` for interactive rows. No rotate, no scale > 1, no bounce. Always respect `prefers-reduced-motion`.
4. **Mobile pertama, desktop bonus** — if a desktop pattern has no clear mobile fallback, drop the pattern. Example: trip detail rail collapses to horizontal tab strip below `md`.
5. **Indonesia kasual, terms English OK** — copy: "Yuk, bikin trip baru lo". UI verbs: "Save", "Cancel", "Logout" stay English (universal in tech-comfortable SEA audience).
6. **Dua mode setara** — every new component must look and behave correctly in both light and dark. Dark is not an afterthought.

---

## 3. Foundations (tokens)

### 3.1 Color tokens

Stored as CSS custom properties in `src/app/globals.css`. Values in hex below; convert to `oklch` when writing CSS to match existing convention. All tokens have both light and dark values.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--background` | #FAFAF7 | #0A1A1F | Page background. Warm sand in light, deep teal-black in dark. |
| `--card` | #FFFFFF | #0F2530 | Surface (cards, sidebars, topbar). |
| `--foreground` | #0F1F2C | #F0F5F4 | Primary text. |
| `--muted` | #F1F5F4 | #1A2D33 | Secondary surface (hover bg, placeholder zone). |
| `--muted-foreground` | #5F6E73 | #8EA0A6 | Helper text, meta info, icon idle. |
| `--border` | #E6EBE9 | #1F3540 | Subtle separator. |
| `--primary` | #0D9488 | #2DD4BF | CTA, brand mark, active states. Teal. |
| `--primary-foreground` | #FFFFFF | #03131A | Text on primary. |
| `--accent` | #0284C7 | #38BDF8 | Info badges, secondary links, "movement" item icons (flight, transport). Ocean blue. |
| `--accent-foreground` | #FFFFFF | #03131A | Text on accent. |
| `--destructive` | #DC2626 | #F87171 | Delete actions, error states. |
| `--warning` | #D97706 | #FBBF24 | Reserved for later (overdue trips, etc). |

**Status badge mapping** (replaces `lib/format.ts → statusColor`):

| Status | Light/dark recipe |
|---|---|
| `planning` | `background: color-mix(in oklab, var(--accent) 14%, transparent); color: var(--accent)` |
| `ongoing` | `background: color-mix(in oklab, var(--primary) 14%, transparent); color: var(--primary)` |
| `completed` | `background: var(--muted); color: var(--muted-foreground)` |
| `archived` | `background: var(--muted); color: var(--muted-foreground); opacity: 0.7` |

### 3.2 Typography scale

Font: Geist Sans (already loaded via `next/font/google`). Mono: Geist Mono (reserve for code/numeric data — not used in MVP UI).

| Token | Class | Weight | When |
|---|---|---|---|
| `display` | `text-3xl` (30px) | `font-bold` | Page hero (trip detail title, dashboard greeting) |
| `h1` | `text-2xl` (24px) | `font-bold` | Page title |
| `h2` | `text-xl` (20px) | `font-semibold` | Section heading ("Itinerary", "Bookings") |
| `h3` | `text-lg` (18px) | `font-semibold` | Card title, sub-section heading |
| `body` | `text-base` (16px) | `font-normal` | Body copy |
| `body-sm` | `text-sm` (14px) | `font-normal` | Helper, meta, card description |
| `caption` | `text-xs` (12px) | `font-medium` | Badge, timestamp, tag |

### 3.3 Spacing rhythm

Use Tailwind 4 default scale (4px multiples). Conventions:

| Context | Spacing | Class |
|---|---|---|
| Icon + text gap | 8px | `gap-2` |
| Field stack inside card | 8px | `space-y-2` |
| Section stack inside page | 24px | `space-y-6` |
| Major section grouping | 32px | `space-y-8` |
| Container padding (mobile) | 16px × 24px | `px-4 py-6` |
| Container padding (≥ md) | 24px × 32px | `md:px-6 md:py-8` |

### 3.4 Radius

| Component | Class |
|---|---|
| Card | `rounded-xl` (≈10px) |
| TopBar / Trip summary banner | `rounded-2xl` |
| Button | `rounded-lg` |
| Input / Select / Textarea | `rounded-lg` |
| Dialog | `rounded-xl` |
| Badge / pill / Avatar | `rounded-full` |
| Icon tile (inside item row) | `rounded-lg` |

### 3.5 Motion tokens

| Token | Value | Use |
|---|---|---|
| `motion-fast` | 150ms ease-out | Hover, button press feedback |
| `motion-base` | 200ms ease-out | Color/background transitions, theme switch |
| `motion-enter` | 300ms ease-out | Dialog / dropdown open |

Apply as: `transition-colors duration-200`, `transition-transform duration-150 active:scale-[0.98]`, etc. Always wrap motion-heavy interactions in `@media (prefers-reduced-motion: no-preference)`.

---

## 4. Layout architecture

### 4.1 Shell hierarchy

```
RootLayout (src/app/layout.tsx)
  └─ AppLayout (src/app/(app)/layout.tsx)
       └─ AppShell
            ├─ GlobalSidebar (64px, icon-only)
            ├─ TopBar (card-shape, breadcrumb + user)
            └─ <main> (children)
                 ├─ Dashboard / Settings → full-width main content
                 └─ TripLayout (src/app/(app)/trips/[id]/layout.tsx)
                      └─ TripShell
                           ├─ TripSummaryBanner (full-width)
                           ├─ TripRail (w-44 sticky desktop, horizontal tabs mobile)
                           └─ <children> (section content)
```

### 4.2 Routing migration

Current `src/app/(app)/trips/[id]/page.tsx` is a single page. Restructure:

| Current | New |
|---|---|
| `trips/[id]/page.tsx` (entire detail) | `trips/[id]/layout.tsx` (TripShell wrapper) + `trips/[id]/page.tsx` (Overview content only) |
| _none_ | `trips/[id]/itinerary/page.tsx` |
| _none_ | `trips/[id]/bookings/page.tsx` |
| _none_ | `trips/[id]/expenses/page.tsx` |
| _none_ | `trips/[id]/members/page.tsx` |

Trip data is fetched once in `trips/[id]/layout.tsx` (membership check + trip row), then passed to children via a React context provider (`TripContext`). Sub-route pages consume the context via a `useTrip()` hook. This avoids 5× duplicate queries when navigating between sub-sections, and keeps sub-page server components free of trip-fetching boilerplate.

### 4.3 Responsive behavior

| Breakpoint | GlobalSidebar | TripRail | Breadcrumb |
|---|---|---|---|
| `< md` (< 768px) | Hidden by default. Hamburger in TopBar opens off-canvas `Sheet`. | Hidden. Replaced by sticky horizontal tab strip below summary banner. | Hidden (TopBar shows only brand + user). |
| `≥ md` | Visible, icon-only 64px. | Visible left rail w-44, sticky. | Visible. |

---

## 5. Component catalogue

### 5.1 Shell components

| Component | Path | Responsibility |
|---|---|---|
| `AppShell` | `src/components/shell/app-shell.tsx` | Global wrapper. Composes `GlobalSidebar` + `TopBar` + `<main>`. |
| `GlobalSidebar` | `src/components/shell/global-sidebar.tsx` | Icon-only 64px nav. Active state derived from `usePathname()`. Items hardcoded: Dashboard (`/dashboard`), Settings (`/settings` — placeholder until built). Bottom: `ThemeToggle` + `UserMenu`. |
| `TopBar` | `src/components/shell/top-bar.tsx` | Card-shape `rounded-2xl bg-card border shadow-sm`. Renders `Breadcrumb` (left) + summary `UserMenu` (right). On `< md`, also renders a hamburger button (left of breadcrumb) that opens `MobileNav`. |
| `MobileNav` | `src/components/shell/mobile-nav.tsx` | `Sheet`-based off-canvas replacement for `GlobalSidebar` at `< md`. |
| `TripShell` | `src/components/shell/trip-shell.tsx` | Wrapper for `/trips/[id]/*`. Composes `TripSummaryBanner` + `TripRail` + children. Accepts `trip` prop from layout. |
| `TripRail` | `src/components/shell/trip-rail.tsx` | Vertical nav for trip sub-sections. Items: Overview, Itinerary, Bookings, Expenses, Members. Active via `usePathname()`. Mobile: render as horizontal scroll tabs. |
| `TripSummaryBanner` | `src/components/features/trip/trip-summary-banner.tsx` | Card showing trip title (h1), `StatusBadge`, meta (destination + date range), and `TripActionsMenu`. |

### 5.2 Content components (reusable cross-feature)

| Component | Path | Signature |
|---|---|---|
| `StatusBadge` | `src/components/ui/status-badge.tsx` | `{ status: TripStatus }`. Replaces `statusColor()` from `lib/format.ts`. |
| `EmptyState` | `src/components/ui/empty-state.tsx` | `{ icon?: LucideIcon, title: string, description?: string, action?: ReactNode }`. Replaces ad-hoc `rounded-lg border border-dashed p-12` pattern (currently in dashboard + trip detail). |
| `SectionHeader` | `src/components/ui/section-header.tsx` | `{ title: string, description?: string, action?: ReactNode }`. Flex row, title left, action right, consistent margin-bottom. |
| `IconTile` | `src/components/ui/icon-tile.tsx` | `{ icon: LucideIcon, tone: 'primary' \| 'accent' \| 'muted', size?: 'sm' \| 'md' }`. Rounded-lg tinted square hosting an icon. |
| `ItemRow` | `src/components/ui/item-row.tsx` | `{ icon: LucideIcon, iconTone: IconTone, time?: string, duration?: string, title: string, subtitle?: string, actions?: ReactNode, href?: string }`. Reusable for itinerary, bookings, expenses. |
| `Breadcrumb` | `src/components/ui/breadcrumb.tsx` | `{ items: Array<{ label: string, href?: string }> }`. Last item bold + non-interactive. |

### 5.3 Feature-specific components for Itinerary

| Component | Path | Responsibility |
|---|---|---|
| `DayGroupHeader` | `src/components/features/itinerary/day-group-header.tsx` | Renders "Hari {n} · {EEEE, d MMM}" (date-fns with Indonesian locale). |
| `ItineraryTypeIcon` | `src/components/features/itinerary/itinerary-type-icon.tsx` | Maps `itinerary_item_type` enum → `{ icon, tone }` pair. Used to feed `IconTile` props inside an `ItemRow`. |

(Other itinerary components — `NewItineraryItemDialog`, `EditItineraryItemDialog`, `ItineraryItemRow` thin wrapper — are defined in the itinerary feature spec, not here.)

### 5.4 Interactive

| Component | Path | Notes |
|---|---|---|
| `ThemeToggle` | `src/components/ui/theme-toggle.tsx` | Client component. Preference state: `light \| dark \| system` — this is the **user's choice**, not the resolved theme. Persist preference in `localStorage["travelin-theme"]`. Resolution: if preference is `system`, follow `prefers-color-scheme`; otherwise apply preference directly by toggling `.dark` class on `<html>`. Inline `<script>` in `<head>` runs before hydration to read storage + set initial class (avoids FOUC). **Roll-own**, no `next-themes`. |
| `UserMenu` | `src/components/shell/user-menu.tsx` | Avatar (initial from `display_name`) + DropdownMenu. Items: Profile (placeholder), Settings (placeholder), `ThemeToggle` inline, Logout (form action). Used in both `GlobalSidebar` bottom and `TopBar` right (with `variant: 'compact' \| 'full'`). |

### 5.5 Icon system

- **Library**: continue with `lucide-react`
- **Size policy**:
  - 14px (`h-3.5 w-3.5`) — inline meta (badge time, card meta)
  - 16px (`h-4 w-4`) — inline button icon, sidebar nav alt
  - 20px (`h-5 w-5`) — sidebar nav primary, prominent inline
  - 24px (`h-6 w-6`) — hero/header context
- **Stroke**: default 2 (lucide default). Use 2.5 only inside primary buttons for emphasis.
- **Tone mapping for `IconTile`**:
  - `accent` (ocean blue) — flight, transport (movement)
  - `primary` (teal) — lodging, meal, activity, note, generic content
  - `muted` — placeholder/inactive

### 5.6 Existing components — disposition

| Component | Action |
|---|---|
| `Button`, `Input`, `Label`, `Textarea`, `Select`, `Card`, `Dialog`, `AlertDialog`, `DropdownMenu` | Unchanged. Radius/style adapts automatically via token updates. |
| `formatTripDateRange`, `formatCurrency` (lib/format.ts) | Unchanged. |
| `statusLabel`, `statusColor` (lib/format.ts) | **Remove**. Logic absorbed into `StatusBadge`. |
| Empty state pattern (`rounded-lg border border-dashed p-12`) | **Remove**. Replaced by `EmptyState` component. |
| `TripCard` | **Migrate**: adopt `StatusBadge` + updated radius/border. |
| `NewTripDialog`, `EditTripDialog`, `TripActionsMenu` | **Migrate**: no structural change, adopt new tokens. |
| `(app)/layout.tsx` | **Rewrite**: keep auth gate (`getUser` → redirect `/login`) + `ensureProfile` call. Replace manual `<header>` + `<main>` JSX with `<AppShell profile={profile}>{children}</AppShell>`. |
| `(app)/trips/[id]/page.tsx` | **Restructure** (see §4.2): split into layout (TripShell) + sub-routes. |

### 5.7 New shadcn component to add

- `Sheet` — needed for mobile off-canvas nav. Add via `npx shadcn@latest add sheet`.

---

## 6. Implementation order (high-level)

This spec produces the **scaffolding** that the Itinerary CRUD feature plugs into. Order matters because later phases depend on earlier phases.

1. **Tokens** — update `src/app/globals.css` with new color palette + radius scale. This immediately shifts the visual style of all existing components (e.g. primary buttons turn teal). That is expected — every later step assumes the new palette is live.
2. **Sheet** — `npx shadcn@latest add sheet`.
3. **Primitives** — create `StatusBadge`, `EmptyState`, `SectionHeader`, `IconTile`, `ItemRow`, `Breadcrumb`. Pure UI, no Supabase coupling.
4. **ThemeToggle** + inline FOUC script in `src/app/layout.tsx` `<head>`.
5. **Shell** — `AppShell`, `GlobalSidebar`, `TopBar`, `UserMenu`, `MobileNav`. Rewrite `(app)/layout.tsx` to use them.
6. **Migrate trip components** — `TripCard`, dialogs, `TripActionsMenu` to use `StatusBadge` + updated tokens.
7. **Trip detail restructure** — `(app)/trips/[id]/layout.tsx` with `TripShell` + `TripContext`. Move existing content to `page.tsx` (Overview). Stub routes: `itinerary/page.tsx`, `bookings/page.tsx`, `expenses/page.tsx`, `members/page.tsx` (each just shows EmptyState).
8. **Verify** light + dark + mobile breakpoint manually.

Itinerary CRUD feature spec starts from step 8 onward and assumes everything above is in place.

---

## 7. Testing

Per AGENTS.md §10 (Level 1 critical tests only), this spec adds the following test surface:

- **`StatusBadge` snapshot of all 4 statuses** (light + dark CSS class verification)
- **`EmptyState` renders title, description, and action** — render test
- **`ThemeToggle` state cycle**: light → dark → system → light. Verify class on `<html>` and localStorage value.

No tests for: shell components (visual), `TripRail` active state (covered by E2E later), animations.

---

## 8. Open questions / decisions to defer

These do not block this spec but should be revisited:

1. **Logo / brand mark beyond wordmark + "t" monogram** — out of scope for now. The "t" tile in the sidebar is the placeholder mark.
2. **Settings page content** — sidebar links to `/settings` but the page doesn't exist yet. Build when first setting (theme override, profile edit) is needed.
3. **`UserMenu` profile + settings links** — both placeholder until those pages exist. Logout works.
4. **`Avatar` initial generation** — implement a tiny utility to take first letters of `display_name`. Lives in `lib/avatar.ts` (not specified here, trivial).
5. **Accessibility audit** — keyboard nav across sidebar/rail, ARIA labels on icon buttons, focus rings. Deferred to dedicated A11y pass.

---

## 9. Files reference

**Mockup**: `/tmp/travelin-mockup/index.html` (static reference only — NOT part of the project codebase; served via `.claude/launch.json` mockup config).

**Preview config**: `.claude/launch.json` — exists in repo for re-running the mockup. Safe to commit; harmless if mockup dir is missing later (preview just fails to start).

---

*End of spec.*
