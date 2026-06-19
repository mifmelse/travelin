# AGENTS.md

This document is the operating manual for AI agents (Claude Code, Cursor, etc.) working on this project. It is also a snapshot of the engineering decisions and conventions that shape `travelin`.

**Read this entire file before writing any code.** It is not optional. The content here was forged through real debugging and design decisions, not best-practice templates.

---

## 1. Project Overview

### What is travelin?

`travelin` is a travel companion app for solo and couple leisure travelers in Southeast Asia. It helps users manage their trips from planning through execution to memory, in one place.

### MVP scope

Three core features, in this order of importance:

1. **Trip planning** — Create, organize, and manage trips with destinations, dates, and details
2. **Itinerary** — Plan day-by-day activities, locations, and times for each trip
3. **Booking records** — Track confirmations from external services (Traveloka, Booking.com, airlines) in one place
4. **Expense tracker** — Log trip expenses with multi-currency support, optionally split between members

The app is **NOT** a booking aggregator. Bookings are *record-keeping only* — users input bookings made elsewhere. We do not integrate with hotel/flight APIs.

### Target users

- Solo travelers and couples
- Southeast Asia base (Indonesia, Singapore, Malaysia, Thailand, Vietnam, Philippines)
- Leisure (not business) travel
- Tech-comfortable but not power users

### Non-goals (for now)

- Real-time collaboration / live sync
- Native mobile apps (web-first, mobile-responsive)
- Booking integrations / payment processing
- AI-powered itinerary generation
- Social features (sharing trips publicly)

---

## 2. Tech Stack

### Versions matter — do not upgrade carelessly

| Layer | Tech | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 16.2.6 | App Router + Turbopack. **`proxy.ts` not `middleware.ts`** |
| Language | TypeScript | 5.x | Strict mode enabled |
| Styling | Tailwind CSS | 4.x | New engine, CSS-first config |
| UI Library | shadcn/ui | v4 (Base UI) | **NOT Radix UI** — uses `@base-ui/react` |
| Database | Supabase (PostgreSQL) | Latest | RLS **disabled** (see §5) |
| Auth | Supabase Auth | Latest | Email + password, SSR-aware |
| Validation | Zod | 4.x | **`.partial().refine()` does not chain** (see §8) |
| Date handling | date-fns | 4.x | Timezone-aware via `tz` helpers when needed |
| Icons | lucide-react | Latest | Default icon set |
| Font | Geist | via `next/font/google` | Geist Sans + Geist Mono |
| Pre-commit | Husky + lint-staged | 9.x / 16.x | Auto-run lint + typecheck before commit |
| Commit lint | commitlint | 19.x | Enforce conventional commit format |

### Why these choices

- **Next.js 16**: Latest stable, App Router maturity, Server Components default
- **Supabase**: Single platform for DB + Auth + Storage; fast to start; PostgreSQL = future-proof
- **shadcn v4 (Base UI)**: Composable, accessible, owned (copy-paste, not npm dependency)
- **Zod v4**: Strong validation, TypeScript-first, used at every boundary
- **No ORM**: Supabase client is enough for MVP. ORMs (Prisma, Drizzle) add complexity for solo MVP.

### Environment variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Never** commit `.env.local`. It is gitignored. `.env.example` is the template — keep it updated.

---

## 3. Project Structure

```
travelin/
├── AGENTS.md                  ← you are here
├── CLAUDE.md                  ← symlink/alias to AGENTS.md (for Claude Code)
├── src/
│   ├── app/
│   │   ├── (auth)/            ← public auth routes (login, register)
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── actions.ts     ← server actions for auth
│   │   ├── (app)/             ← protected routes (require login)
│   │   │   ├── layout.tsx     ← auth gate + profile creation
│   │   │   ├── dashboard/
│   │   │   └── trips/
│   │   │       ├── [id]/
│   │   │       └── actions.ts ← trip server actions
│   │   ├── auth/callback/     ← Supabase auth callback (route handler)
│   │   ├── layout.tsx         ← root layout + metadata + font
│   │   └── page.tsx           ← landing/redirect
│   ├── components/
│   │   ├── ui/                ← shadcn components (Button, Dialog, etc.)
│   │   └── features/          ← feature-specific components
│   │       └── trip/          ← TripCard, NewTripDialog, etc.
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts      ← browser client
│   │   │   ├── server.ts      ← server component / action client
│   │   │   └── session.ts     ← session helpers used by proxy.ts
│   │   ├── format.ts          ← formatTripDateRange, statusLabel, etc.
│   │   └── utils.ts           ← cn() and other shared helpers
│   ├── services/              ← business logic + DB access
│   │   ├── profile.service.ts
│   │   └── trip.service.ts
│   ├── types/
│   │   └── database.ts        ← auto-generated from `npm run db:types`
│   └── proxy.ts               ← Next.js 16 proxy (session refresh)
├── supabase/
│   └── migrations/            ← SQL migration files (append-only)
├── public/
├── tests/                     ← Vitest test files
├── .env.local                 ← gitignored
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
└── vitest.config.ts
```

### Folder conventions

- **`(auth)` and `(app)`** are Next.js route groups (parentheses) — they organize without affecting URL
- **`features/`** under components contains domain-specific UI (TripCard, etc.)
- **`services/`** contains business logic. Components and Server Actions call services, never query Supabase directly for complex logic.
- **`lib/`** is for utilities that don't belong to a domain
- **`types/database.ts`** is auto-generated — do not edit manually

---

## 4. Database Schema

### Tables

```
profiles
  id (uuid, PK, references auth.users.id)
  display_name (text, NOT NULL)
  avatar_url (text, nullable)
  created_at (timestamptz, default now())
  updated_at (timestamptz, default now())

trips
  id (uuid, PK, gen_random_uuid())
  owner_id (uuid, FK profiles.id, NOT NULL)
  title (text, NOT NULL)
  description (text, nullable)
  destination (text, nullable)
  start_date (date, nullable)
  end_date (date, nullable)
  status (text, NOT NULL, default 'planning')
    ENUM: planning | ongoing | completed | archived
  cover_image_url (text, nullable)
  created_at (timestamptz, default now())
  updated_at (timestamptz, default now())

trip_members
  id (uuid, PK, gen_random_uuid())
  trip_id (uuid, FK trips.id, ON DELETE CASCADE, NOT NULL)
  profile_id (uuid, FK profiles.id, NOT NULL)
  role (text, NOT NULL, default 'editor')
    ENUM: owner | editor | viewer
  created_at (timestamptz, default now())
  UNIQUE (trip_id, profile_id)

bookings
  id (uuid, PK, gen_random_uuid())
  trip_id (uuid, FK trips.id, ON DELETE CASCADE, NOT NULL)
  type (booking_type enum, NOT NULL)
    ENUM values: flight | lodging | activity | transport | other
  provider (text, nullable)
  confirmation_code (text, nullable)
  amount_cents (bigint, nullable)
  currency (text, default 'IDR')
  booked_at (timestamptz, nullable)
  attachments (jsonb, default '[]'::jsonb)
    ← reserved for future file/email attachments (not used in MVP UI)
  raw_email_id (text, nullable)
    ← reserved for future email-parsing ingestion (not used in MVP UI)
  created_at (timestamptz, NOT NULL, default now())
  updated_at (timestamptz, NOT NULL, default now())
  INDEX: idx_bookings_trip on (trip_id)
  -- NOTE: no `notes` column. There is a single `booked_at` (not start_at/end_at).

itinerary_items
  id (uuid, PK, gen_random_uuid())
  trip_id (uuid, FK trips.id, ON DELETE CASCADE, NOT NULL)
  type (itinerary_item_type enum, NOT NULL)
    ENUM values: flight | lodging | activity | transport | meal | note
  title (text, NOT NULL)
  start_at (timestamptz, nullable)
  end_at (timestamptz, nullable)
  location_name (text, nullable)
  location_lat (numeric(10, 7), nullable)
  location_lng (numeric(10, 7), nullable)
  details (jsonb, default '{}'::jsonb)
    ← flexible type-specific data (e.g., flight number, hotel address)
  booking_id (uuid, FK bookings.id, ON DELETE SET NULL, nullable)
    ← optional link to a booking record
  notes (text, nullable)
  created_at (timestamptz, NOT NULL, default now())
  updated_at (timestamptz, NOT NULL, default now())
    ← auto-updated via trigger itinerary_items_set_updated_at
  CHECK constraint itinerary_items_time_check:
    end_at is null or start_at is null or end_at >= start_at
  INDEX: idx_itinerary_trip on (trip_id)
  INDEX: idx_itinerary_start on (start_at)

expenses
  id (uuid, PK)
  trip_id (uuid, FK trips.id, ON DELETE CASCADE, NOT NULL)
  paid_by (uuid, FK profiles.id, NOT NULL)
  amount_cents (bigint, NOT NULL)
  currency (text, NOT NULL, default 'IDR')
  category (text, nullable)
  description (text, nullable)
  occurred_at (timestamptz, default now())
  created_at (timestamptz)

expense_splits
  id (uuid, PK)
  expense_id (uuid, FK expenses.id, ON DELETE CASCADE, NOT NULL)
  profile_id (uuid, FK profiles.id, NOT NULL)
  amount_cents (bigint, NOT NULL)
  UNIQUE (expense_id, profile_id)

trip_invites
  id (uuid, PK, gen_random_uuid())
  trip_id (uuid, FK trips.id, ON DELETE CASCADE, NOT NULL, UNIQUE)
    ← exactly one active invite link per trip (reusable, revocable)
  token (text, NOT NULL, UNIQUE)            ← random url-safe, base64url(24 bytes)
  role (text, NOT NULL, default 'editor')   ← CHECK in ('editor','viewer'); role granted on join
  created_by (uuid, FK profiles.id, NOT NULL)
  created_at (timestamptz, NOT NULL, default now())
  updated_at (timestamptz, NOT NULL, default now())  ← trigger trip_invites_set_updated_at
  INDEX: idx_trip_invites_token on (token)
```

### Schema design principles

1. **Money is `amount_cents bigint`** — never `decimal`/`numeric`/`float`. Reason: floating-point errors in money operations are unacceptable. `Rp 150.000` is stored as `15000000` (cents).

2. **Timestamps are `timestamptz`** — always timezone-aware. Use `now()` as default. Display in user's locale on the client.

3. **Currency per row** — `currency` column on every money-storing table. Multi-currency from day 1.

4. **UUIDs via `gen_random_uuid()`** — built-in to Postgres 13+. Do not use `uuid_generate_v4()` (requires extension).

5. **`trip_members` exists from MVP** — even though we are solo-user focused, the schema is ready for collaboration. The owner is always added as a `trip_members` row with `role = 'owner'` on trip creation.

6. **`details jsonb`** — for itinerary items, allows storing type-specific data (e.g., flight number for flight-type items) without schema changes.

7. **`ON DELETE CASCADE`** on child tables — deleting a trip cleans up all related data.

### Generating TypeScript types

```bash
npm run db:types
```

This writes `src/types/database.ts`. Run this after any migration that changes schema.

---

## 5. Authorization Strategy — CRITICAL

### TL;DR

**This project uses APP-LEVEL authorization, NOT Row Level Security (RLS).**

RLS is **intentionally disabled** on all tables. Do not re-enable it without reading this section, the decision log (§12), and refactoring the service layer.

### Why not RLS?

We spent over 3 hours debugging RLS in Next.js 16 + `@supabase/ssr`. The behavior was inconsistent:
- Same insert worked via SQL Editor with manual JWT claims
- Same insert via server-side `createClient()` failed with `42501`
- `auth.uid()` returned correct user ID, all policies looked correct
- Even disabling triggers and policies separately did not isolate the cause

The root cause was likely an interaction between the Next.js 16 runtime and `@supabase/ssr`'s session context propagation. For a solo MVP, this complexity is not worth the defense-in-depth benefit.

### What we use instead

Authorization is enforced **in the service layer**, before every database operation:

```typescript
// src/services/trip.service.ts

async function assertTripMember(supabase, tripId, userId) {
  const member = await getTripMembership(supabase, tripId, userId)
  if (!member) throw new Error('Trip not found or access denied')
  return member
}

async function assertTripEditor(supabase, tripId, userId) {
  const member = await assertTripMember(supabase, tripId, userId)
  if (member.role !== 'owner' && member.role !== 'editor') {
    throw new Error('You do not have permission to edit this trip')
  }
}

async function assertTripOwner(supabase, tripId, userId) {
  const { data } = await supabase
    .from('trips')
    .select('owner_id')
    .eq('id', tripId)
    .maybeSingle()
  if (!data || data.owner_id !== userId) {
    throw new Error('Only the trip owner can perform this action')
  }
}
```

### Rules

1. **Every service function that touches user-scoped data MUST accept `userId` as a parameter.** Do not let services call `getUser()` internally — that's the Server Action's job.

2. **Every Server Action MUST start with:**
   ```typescript
   const supabase = await createClient()
   const { data: { user } } = await supabase.auth.getUser()
   if (!user) return { error: 'Unauthorized' }
   ```

3. **List queries filter by membership** via join:
   ```typescript
   await supabase
     .from('trips')
     .select('*, trip_members!inner(profile_id)')
     .eq('trip_members.profile_id', userId)
   ```

4. **Read-by-id queries check membership first:**
   ```typescript
   const member = await getTripMembership(supabase, tripId, userId)
   if (!member) return null  // 404
   ```

5. **Mutate queries assert permission before mutation:**
   - `updateTrip` → `assertTripEditor`
   - `deleteTrip` → `assertTripOwner`

6. **`createTrip` is special** — no permission to assert, but it must atomically insert the trip AND insert the creator as `owner` in `trip_members`. If member insert fails, rollback the trip.

### When this strategy fails

App-level authorization has a fundamental weakness: **if you forget the auth check, data is exposed.** Mitigation:
- All Server Actions follow a strict template (see §7)
- Service functions throw on missing permission (loud failure)
- Code review (you, the human) catches missed checks

If `travelin` grows to multi-tenant SaaS or has paying users, consider:
- Re-introducing RLS with extreme care + proper local testing
- Or: dedicated authorization library (CASL, Oso) at the service layer

---

## 6. Coding Conventions

### TypeScript

- **Strict mode is on.** Do not turn it off.
- **No `any`.** If you need a flexible type, use `unknown` and narrow with type guards.
- **Database types are imported from `@/types/database`.** Use `Database['public']['Tables']['trips']['Row']` etc.
- **Prefer named exports** for components and utilities. Default exports for pages and route handlers (Next.js convention).

### React

- **Server Components by default.** Only add `'use client'` when you need interactivity (state, effects, event handlers).
- **Use `async` Server Components** to fetch data. Don't use React Query / SWR client-side for SSR-able data.
- **Composition over prop drilling.** Pass children, not data through layers.

### Money handling

- **Always store in cents** as `bigint` in DB
- **Always display in user's locale** using `Intl.NumberFormat`
- **Never do math on display strings** — convert to cents, calculate, convert back

```typescript
// Bad
const total = (parseFloat(amountStr) * 1.1).toFixed(2)

// Good
const amountCents = parseAmountToCents(amountStr)
const totalCents = Math.round(amountCents * 1.1)
const display = formatCurrency(totalCents, 'IDR')
```

### Date and time handling

- **Always `timestamptz` in DB** for moments in time (e.g., `created_at`, `occurred_at`)
- **Use `date` (no time)** for calendar dates without timezone (e.g., `trip.start_date`, `itinerary.day_date`)
- **Use `date-fns`** for parsing and formatting. Prefer `format(date, 'PPP', { locale: id })` over manual formatting.
- **Never use `new Date(str).toISOString().split('T')[0]`** — timezone bug waiting to happen

### Naming

- **Files**: `kebab-case.tsx` (`trip-card.tsx`, `new-trip-dialog.tsx`)
- **Components**: `PascalCase` (`TripCard`, `NewTripDialog`)
- **Functions and variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE` (but only for true constants, not config)
- **Database**: `snake_case` (`trip_members`, `profile_id`)

### Comments

- **Why, not what.** The code shows what; comments explain why.
- **`// NOTE:`** for non-obvious behavior
- **`// HACK:`** for known-suboptimal-but-pragmatic code
- **`// TODO:`** with owner and context (`// TODO(if): revisit when we add collaboration`)
- **JSDoc** for service functions, especially those with side effects or authorization

---

## 7. Architecture Patterns

### The flow of a feature

For any feature involving user-scoped data:

```
User clicks button
    ↓
Client component dispatches Server Action
    ↓
Server Action:
  1. Parse FormData with Zod
  2. Get user via supabase.auth.getUser()
  3. Check auth (if !user → return error)
  4. Call service function with userId
  5. revalidatePath() for affected pages
  6. redirect() or return success state
    ↓
Service function:
  1. Assert authorization (member/editor/owner)
  2. Perform DB operation via Supabase client
  3. Return data or throw error
    ↓
DB response
    ↓
Page re-renders (Server Component re-fetches)
```

### Server Action template

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { mySchema, myServiceFunction } from '@/services/my.service'

export type ActionState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export async function myAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Validate
  const parsed = mySchema.safeParse({
    field: formData.get('field'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  // 2. Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // 3. Business logic
  try {
    await myServiceFunction(supabase, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  // 4. Revalidate + redirect/return
  revalidatePath('/relevant-path')
  return { success: true }
}
```

### Service function template

```typescript
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const mySchema = z.object({
  // ... fields
})
export type MyInput = z.infer<typeof mySchema>

export async function myServiceFunction(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: MyInput
) {
  // 1. Assert authorization (if applicable)
  await assertSomething(supabase, input.relatedId, userId)

  // 2. Perform DB operation
  const { data, error } = await supabase
    .from('table')
    .insert({ ...input, owner_id: userId })
    .select()
    .single()

  // 3. Handle error
  if (error) throw new Error(`Failed to do thing: ${error.message}`)

  return data
}
```

### Form pattern: useActionState

For forms, always use `useActionState` for pending state and error handling:

```tsx
'use client'

import { useActionState } from 'react'
import { myAction } from './actions'

export function MyForm() {
  const [state, formAction, pending] = useActionState(myAction, {})

  return (
    <form action={formAction}>
      <Input name="field" />
      {state.fieldErrors?.field && (
        <p className="text-destructive">{state.fieldErrors.field[0]}</p>
      )}
      {state.error && <p className="text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving...' : 'Save'}
      </Button>
    </form>
  )
}
```

### Form pattern: controlled vs uncontrolled

- **Create forms** (NewTripDialog): uncontrolled is OK (start from empty, no reset issue)
- **Edit forms** (EditTripDialog): MUST be controlled with `useState` + `useEffect` to reset on dialog open. Reason: Base UI warns about changing `defaultValue` on uncontrolled inputs, and dialogs reuse the same form instance.

```tsx
// Edit dialog: controlled
const [title, setTitle] = useState(trip.title)

useEffect(() => {
  if (open) setTitle(trip.title)
}, [open, trip])

<Input value={title} onChange={(e) => setTitle(e.target.value)} />
```

---

## 8. Gotchas Catalog

These are real issues encountered in this project. **Do not re-discover them the hard way.**

### Zod v4: `.partial()` does not chain with `.refine()`

**Problem**: `z.object({...}).partial().refine(...)` throws TypeScript error because `partial()` returns a different type that doesn't preserve refinements.

**Solution**: Separate base schema, apply refinements separately:

```typescript
const tripBaseSchema = z.object({
  title: z.string().min(1).max(100),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

const dateRangeRefine = (data: { start_date?: string; end_date?: string }) => {
  if (!data.start_date || !data.end_date) return true
  return new Date(data.end_date) >= new Date(data.start_date)
}
const dateRangeError = {
  message: 'End date must be after start date',
  path: ['end_date'],
}

export const createTripSchema = tripBaseSchema.refine(dateRangeRefine, dateRangeError)

export const updateTripSchema = tripBaseSchema
  .partial()
  .extend({ status: z.enum(['planning', 'ongoing', 'completed', 'archived']).optional() })
  .refine(dateRangeRefine, dateRangeError)
```

### shadcn v4 + Base UI: `<Trigger asChild><Button>` causes nested button hydration error

**Problem**: `DialogTrigger`, `DropdownMenuTrigger`, `AlertDialogTrigger` in shadcn v4 render their own `<button>` element. Wrapping a `<Button>` component with `asChild` produces nested `<button>` → React hydration error.

**Solution**: Style the trigger directly using `buttonVariants()`:

```tsx
import { buttonVariants } from '@/components/ui/button'

// Bad
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>

// Good
<DialogTrigger className={buttonVariants({ variant: 'default' })}>
  Open
</DialogTrigger>
```

This applies to:
- `DialogTrigger`
- `DropdownMenuTrigger`
- `AlertDialogTrigger`
- `PopoverTrigger`
- Any other Base UI trigger that renders its own button

### Next.js 16: `middleware.ts` is `proxy.ts`

**Problem**: Next.js 16 deprecated `middleware.ts`. The file is now `proxy.ts`, and the function is named `proxy()`.

**Solution**:
- File: `src/proxy.ts` (not `src/middleware.ts`)
- Function: `export async function proxy(request: NextRequest) { ... }`
- Internal helper file in `src/lib/supabase/` is renamed `session.ts` (not `middleware.ts`)

### Next.js 16: `params` is now async

**Problem**: In dynamic routes, `params` is a Promise that must be awaited.

**Solution**:
```tsx
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // ...
}
```

### Supabase: `single()` vs `maybeSingle()`

- **`.single()`** throws if no row found
- **`.maybeSingle()`** returns `null` if no row found

Use `maybeSingle()` for read-or-null patterns (membership check, find profile, etc.). Use `single()` after insert/update when a row is guaranteed.

### Supabase: row-level security disabled

See §5. **Do not re-enable RLS** without refactoring services to remove redundant ownership checks. Migration file `supabase/migrations/*_rls_policies.sql` explicitly disables RLS — keep that file.

### React: do not put forms inside Dialog content with default Base UI

Base UI's `Dialog` portals content, which can break form submission with Server Actions in some edge cases. **Currently working**, but if you see weird `formData` issues, this is the place to look.

### Email confirmation in development

Supabase free tier has email rate limits (2 emails/hour). For local development:
- Disable email confirmation in Supabase Dashboard → Auth → Settings → "Enable email confirmations" OFF
- Re-enable before production deploy

### `npm run build` clobbers a running `npm run dev`

**Problem**: Running `next build` writes a production `.next/`, overwriting the
dev server's `.next/`. If `npm run dev` is running at the same time, its routes
start returning **404 (or other broken behavior) even though the route files
exist** — because the running dev server is now reading a stale/mismatched
`.next/`. This looks like a routing bug but is purely an environment collision.

**Solution / rule for agents**:
- Do NOT run `npm run build` while the user's `npm run dev` may be running. For
  verification, rely on `npx tsc --noEmit` + `npm run test` + `npm run lint`.
- If a build was run against a live dev server, the fix is: stop dev, `rm -rf
  .next`, restart `npm run dev`.
- Encountered live during the member-invitation flow build (2026-06-18): a
  freshly created trip's detail pages 404'd; cause was a build over a running dev
  server, fixed by deleting `.next` and restarting.

---

## 9. Working with AI Agents

This project explicitly supports AI agent collaboration (Claude Code, Cursor, etc.). The following rules apply to **any AI agent** working in this codebase.

### Hard rules (NEVER violate)

1. **NEVER auto-commit.** All commits require explicit user permission.
2. **NEVER auto-push.** Pushing to remote requires explicit user permission.
3. **NEVER re-enable RLS** without reading §5 and refactoring services.
4. **NEVER use `any`** in TypeScript. Use `unknown` + narrowing.
5. **NEVER expose service role key** to client components or commit it to the repo.
6. **NEVER bypass the service layer** — components and actions call services, not raw Supabase queries (for user-scoped data).
7. **NEVER skip auth check** in Server Actions. The pattern is non-negotiable.
8. **NEVER commit `.env.local`** or any file containing secrets.
9. **NEVER edit existing migration files** that have been pushed. Migrations are append-only. Create a new migration.
10. **NEVER use `<Trigger asChild><Button>`** pattern (see §8).
11. **NEVER use `git commit --no-verify`** to bypass pre-commit hooks unless explicitly approved by the user. The hooks exist to catch real issues.

### Pre-commit hooks (active)

The repo has Husky pre-commit hooks that will:
- Run `eslint --fix` on staged `.ts`/`.tsx` files
- Run `tsc --noEmit` on the entire project (full type check)

And a commit-msg hook that:
- Validates conventional commit format via commitlint

**If a hook fails, the commit is blocked. Do NOT use `--no-verify` to bypass.** Fix the underlying issue.

Hook configuration files:
- `.husky/pre-commit` — runs lint-staged + typecheck
- `.husky/commit-msg` — runs commitlint
- `commitlint.config.js` — commitlint rules
- `package.json` → `lint-staged` field — file pattern matching

### Workflow for adding a new feature

1. **Read this file** in full before starting
2. **Confirm understanding with user** — explain what you plan to do, list files you'll touch
3. **Wait for user approval** before writing code
4. **Write code following patterns** in §7
5. **Run type check**: `npx tsc --noEmit`
6. **Run lint**: `npm run lint`
7. **Manual smoke test**: list the steps you took to verify the feature
8. **Run tests if applicable**: `npm run test`
9. **Report status to user** — show diff, list files changed, smoke test results
10. **WAIT for user to say "commit"** — do not commit before this
11. **Use conventional commit format** (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`)
12. **Granular commits** — one logical change per commit
13. **WAIT for user to say "push"** — do not push before this

### Self-review checklist (run before reporting "done")

- [ ] Files follow project structure (§3)
- [ ] Service layer has authorization check
- [ ] Server Action has `getUser()` + auth check
- [ ] Zod schema validates input
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Linter passes (`npm run lint`)
- [ ] No `any`, no `console.log` left over, no commented-out code
- [ ] No new dependencies added without discussion
- [ ] If schema changed: migration file created + `npm run db:types` run
- [ ] If new file: imports are clean (no `../../../`)
- [ ] If new component: follows naming conventions
- [ ] Manual smoke test plan written

### Commit message format

```
<type>: <short description>

<optional body explaining why>
<optional footer with issue refs>
```

Types: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `style`, `perf`

Examples:
```
feat: add itinerary CRUD
fix: handle null end_date in trip date range formatter
refactor: extract authorization helpers into trip.service.ts
chore: bump Next.js to 16.2.6
```

**No AI attribution trailers.** Owner preference (2026-06-18): commit messages must
NOT include a `Co-Authored-By:` trailer or any "Generated with / Co-authored by AI"
footer. Keep messages to the conventional `<type>: <description>` + optional body.
This applies whether an agent commits directly or drafts messages for the owner to
paste.

### What to do when uncertain

- **Don't guess.** Ask the user.
- **Don't assume defaults.** Read AGENTS.md.
- **Don't fix what you didn't break.** Unrelated changes go in separate commits, with discussion.
- **Don't argue with this file.** If you disagree, raise it with the user, don't override silently.

---

## 10. Testing Strategy

### Current phase: Level 1 Critical Tests

We are NOT doing comprehensive testing. We test:

1. **Service layer authorization logic** — without RLS, this is the only safety net
2. **Zod schemas** — input validation edge cases
3. **Pure utility functions** — money math, date formatting

We do NOT test:

- ❌ Component rendering (Storybook would be better, but not in MVP)
- ❌ Server Actions end-to-end (needs integration test setup)
- ❌ Database queries directly (needs test database)
- ❌ Form behavior (too coupled to React/Base UI internals)

### Tooling

- **Vitest** — test runner
- **@vitest/coverage-v8** — coverage reporting
- (Future: **@testing-library/react** for component tests, **Playwright** for E2E)

### File organization

```
tests/
├── services/
│   ├── trip.service.test.ts
│   └── profile.service.test.ts
├── schemas/
│   └── trip.schema.test.ts
└── lib/
    └── format.test.ts
```

### What to test (and what NOT to test)

**Test these:**
- `assertTripMember`, `assertTripEditor`, `assertTripOwner` — throws when expected
- `createTripSchema` — accepts valid input, rejects invalid (date range, length limits)
- `updateTripSchema` — partial works, refinement still applies
- `formatCurrency` — IDR, USD, edge cases (0, negative, big numbers)
- `formatTripDateRange` — both dates, only start, only end, neither

**Don't test these:**
- Supabase client method calls (use real client, mock at integration level later)
- React components (UI changes too often in MVP)
- Server Actions (run manually for now)
- Anything that requires a live database

### Mocking Supabase in service tests

Mock the `SupabaseClient` interface, not the entire library:

```typescript
import { describe, it, expect, vi } from 'vitest'

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
} as any  // pragmatic any for mock objects

it('throws when user is not a member', async () => {
  mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null })
  await expect(
    assertTripMember(mockSupabase, 'trip-1', 'user-1')
  ).rejects.toThrow('Trip not found or access denied')
})
```

### Running tests

```bash
npm run test          # run all tests
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

### Exit criteria for "Level 2: Integration tests"

Add integration tests (Playwright E2E) when:
- App is deployed to production
- At least one real user is using it
- A bug regression has occurred (signal that we need a safety net)

---

## 11. Common Workflows

### Guiding principle: dependencies first

Follow the plan — but if the planned work has an **unmet dependency**, stop and
finish that dependency first, then return to the planned work. Apply this to
**every** process, not just features. Before starting a task, identify its
dependency chain; if a prerequisite is missing (a table, a flow, another
feature), build the prerequisite as its own scoped piece first.

Example (2026-06-18): Expense splits (MVP #4) depend on a trip having >1 member,
which depended on a member-invitation flow that did not yet exist. So the member
flow was designed and built first (see D14), and the expense tracker resumes
afterward. "Selesaikan dependensi dulu, baru kembali ke yang seharusnya
dikerjakan."

### Standard feature workflow

1. Discuss scope with user
2. Read AGENTS.md §3, §6, §7
3. **If the feature touches the database**: cross-reference AGENTS.md §4 against actual migration files (`cat supabase/migrations/*.sql`). Update AGENTS.md first if there's drift. See D12 for rationale.
4. Plan files to create/modify
5. Get user approval
6. Create migration (if schema changes): `supabase/migrations/<timestamp>_<description>.sql`
7. Push migration: `supabase db push`
8. Regenerate types: `npm run db:types`
9. Write service layer (with auth checks)
10. Write Server Actions
11. Write components (Server Component default, Client only when needed)
12. Update relevant pages
13. Run type check + lint
14. Write critical tests (Level 1: service + Zod)
15. Manual smoke test
16. Report to user, wait for commit/push approval

### Running a migration

```bash
# Create migration file
supabase migration new <description>

# Edit the SQL file in supabase/migrations/

# Push to remote
supabase db push

# Regenerate types
npm run db:types
```

### Regenerating database types

```bash
npm run db:types
```

This runs `supabase gen types typescript --linked > src/types/database.ts`.

### Resetting database (DESTRUCTIVE — local only ideally)

```bash
npm run db:reset
```

**Never run this on production.** This drops and recreates all tables.

### Adding a shadcn component

```bash
npx shadcn@latest add <component-name>
```

The component is added to `src/components/ui/`. Edit it as needed (you own it).

### Adding a new npm dependency

1. **Pause and ask user** — every dependency is technical debt
2. Confirm the package: name, purpose, alternatives considered
3. Install: `npm install <package>` or `npm install -D <package>` for dev
4. Add entry to AGENTS.md §2 if it's a significant addition
5. Lock the version (no `^` or `~`) for critical deps

### Bypassing pre-commit hooks (emergency only)

Pre-commit hooks block commits with lint or type errors. Do NOT bypass casually.

**Acceptable reason to use `--no-verify`**:
- Truly emergency hotfix where the failing check is unrelated to the fix
- Documented in commit message body why bypass was needed
- Follow-up commit must fix the underlying issue immediately

**Never use `--no-verify` for**:
- "Just to get this commit done"
- TypeScript errors you don't understand
- Lint warnings you don't want to read

If a hook is consistently blocking valid commits, the hook configuration is wrong, not the code. Fix the hook.

---

## 12. Decision Log

This section captures key engineering decisions and their rationale. It is both a memory aid and a portfolio/blog asset.

### D1: App-level authorization over RLS

**Date**: Early in development, before any feature was shipped.

**Context**: Standard Supabase pattern is Row Level Security (RLS). We started with RLS policies covering all 7 tables. After implementing trip CRUD, the create operation failed with `42501` row-level security violation despite:
- `auth.uid()` returning correct user ID in DB
- Policies looking syntactically correct
- SQL Editor with `set local role authenticated` succeeding

**Decision**: Switch to app-level authorization. Disable RLS entirely. Enforce auth checks in service layer.

**Rationale**:
- 3+ hours of debugging exhausted reasonable hypotheses
- Likely interaction bug between Next.js 16 + `@supabase/ssr` session context
- Solo MVP doesn't need defense-in-depth at DB level
- App-level auth is more debuggable, more testable, and what most startups actually use
- Sunk-cost fallacy avoided — pivot was the right call

**Trade-offs accepted**:
- No DB-level safety net — if a Server Action forgets `getUser()`, data leaks
- Mitigated by: strict service layer template + tests + code review

**Reversibility**: Medium. To re-enable RLS, must remove redundant ownership checks from services (would otherwise double-check).

### D2: Money as `bigint` cents, not `decimal`

**Decision**: All money stored as `bigint` representing cents (smallest currency unit).

**Rationale**:
- Floating-point math errors are unacceptable for money
- `bigint` is platform-independent (Postgres + JS both safe at our scale)
- Integer math is fast and exact

**Trade-off**: All display logic needs format conversion. Acceptable cost.

### D3: `currency` per row, multi-currency from day 1

**Decision**: Every money-storing table has a `currency` column (default 'IDR').

**Rationale**:
- Target users are Southeast Asia travelers — they will mix IDR, SGD, USD, etc.
- Schema migration to add multi-currency later is painful
- Cost of adding column now is near-zero

**Open question**: How to handle multi-currency aggregation (e.g., total trip expense across IDR + USD)? Deferred to expense tracker feature.

### D4: `trip_members` schema even though solo-user focused

**Decision**: Schema includes `trip_members` table from the start, even though MVP is single-user.

**Rationale**:
- Couple travel is in scope from day 1
- Future-proofing for collaboration
- Pattern (owner inserted on create) is already in service layer

### D5: shadcn/ui v4 over Material UI / Chakra / Mantine

**Decision**: shadcn/ui (v4 with Base UI).

**Rationale**:
- Composable, accessible primitives
- Source-code ownership (copy-paste, not npm dep) — full control
- Tailwind-native styling
- Active development, modern patterns

**Trade-off**: Less batteries-included than Chakra/Mantine. More wiring required. Acceptable for control.

### D6: Server Actions over API Routes

**Decision**: Server Actions are the default for mutations. API Routes are used only for webhooks, OAuth callbacks, and public APIs.

**Rationale**:
- Server Actions are tightly integrated with React (form actions, `useActionState`)
- Less boilerplate than API routes for typical CRUD
- Type-safe end-to-end without OpenAPI/tRPC overhead

### D7: No ORM (Prisma/Drizzle)

**Decision**: Use Supabase client directly, no ORM layer.

**Rationale**:
- Supabase client is already a query builder
- ORMs add complexity for solo MVP
- Schema is simple enough to reason about directly
- `db:types` gives us full TypeScript types from Postgres

**Re-evaluation trigger**: If queries become complex enough that we're writing raw SQL fragments often, revisit (Drizzle would be the candidate).

### D8: Strict commit policy for AI agents

**Decision**: AI agents (Claude Code, Cursor) MUST stop before committing and wait for explicit user approval. No auto-push.

**Rationale**:
- Solo dev = solo quality gate. No second reviewer.
- AI agents are velocity multipliers, not quality multipliers
- A bad commit in `main` is harder to clean than waiting 30 seconds for review
- Trust builds with track record — strict now, relax later

### D9: Level 1 critical tests, not zero, not comprehensive

**Decision**: Test service layer + Zod schemas + utilities. Do not test components, Server Actions end-to-end, or DB queries.

**Rationale**:
- Without RLS, service layer is the only auth safety net → must be tested
- Components change too fast in MVP — tests would be obsolete weekly
- E2E tests are valuable but require live infrastructure (defer)

**Exit criteria for Level 2**: Production deploy, real users, or first regression.

### D10: AGENTS.md as single source of truth

**Decision**: This file is the operating manual. CLAUDE.md is an alias/symlink.

**Rationale**:
- AI agents need explicit conventions
- New contributors (human or AI) onboard from one document
- Decision log doubles as portfolio/blog material

### D11: Pre-commit hooks via Husky + lint-staged + commitlint

**Date**: Day 2 of development.

**Context**: AGENTS.md establishes commit policies (no auto-commit, no auto-push, conventional commits). But policies are not enforcement — they can be forgotten or bypassed. Tooling-level enforcement is needed.

**Decision**: Set up Husky to run:
- Pre-commit: `lint-staged` (eslint --fix on .ts/.tsx) + `tsc --noEmit` (full project type check)
- Commit-msg: `commitlint` enforcing conventional commit format

**Rationale**:
- Pre-commit type check is the strongest possible safety net — broken types cannot reach the repo
- Auto-fix via lint-staged saves manual cleanup
- Conventional commit format keeps git history readable and enables auto-changelog later
- Hooks block bad commits without requiring discipline

**Trade-offs accepted**:
- Slower commits (~3-5 seconds for typecheck)
- `--no-verify` is an escape hatch that exists; relies on discipline not to abuse it

**Validation**: Upon installation, hooks immediately caught 5 pre-existing TypeScript errors and 1 React anti-pattern (setState-in-effect) that had slipped through Next.js dev mode's tolerance. This validated the investment within the same session.

**Reversibility**: High. Uninstalling Husky is a single command and the codebase remains functional.

### D12: Schema-documentation drift resolved (Day 2)

**Date**: Day 2 of development, pre-Step D (first Claude Code delegation).

**Context**: During preparation for delegating Itinerary CRUD to Claude Code, cross-referenced AGENTS.md Section 4 against the actual migration file. Found that the documented `itinerary_items` schema described `day_date + start_time + end_time + location + order_index`, while the migration actually had `start_at timestamptz + end_at timestamptz + location_name + location_lat/lng + booking_id + type enum + details jsonb`. The migration schema was significantly richer.

**Decision**: Update AGENTS.md to reflect the actual migration schema (not the other way around). Update Section 4 with the accurate field list, enum values, indices, triggers, and CHECK constraint.

**Rationale**:
- Migration is the source of truth — TypeScript types are generated from it via `npm run db:types`. Any drift becomes runtime errors.
- The richer schema (coordinates, booking link, type enum) was an investment already made; abandoning it to match a simplified doc would lose features.
- Catching this BEFORE delegating to Claude Code avoided wasted iteration on misaligned code.

**Trade-offs accepted**:
- AGENTS.md must be re-verified against migrations before any future delegation. Add to pre-delegation checklist.

**Lesson learned**: Documents written from memory drift from reality. The fix is not "write better docs" — it's "cross-reference docs against source-of-truth artifacts before relying on them for decisions." This is now a workflow step before any Claude Code delegation involving database schema.

**Reversibility**: N/A — this is a documentation update, no code or data affected.

### D13: Bookings schema drift resolved (Booking records feature)

**Date**: During the Booking records feature build.

**Context**: Before implementing Booking records CRUD, cross-referenced AGENTS.md Section 4 against the migration (`20260522121348_initial_schema.sql`) and generated types (`src/types/database.ts`), per the D12 workflow. Found the documented `bookings` schema drifted from reality: doc had `vendor`, `confirmation_number`, `start_at`/`end_at`, `notes`, and enum `flight | hotel | transport | activity | other`. The actual table has `provider`, `confirmation_code`, a single `booked_at`, no `notes`, plus `attachments` (jsonb) and `raw_email_id`, and the `booking_type` enum is `flight | lodging | activity | transport | other`.

**Decision**: Update Section 4 to match the migration (source of truth). Built the feature against the real schema. Scoped the MVP form to core fields (type, provider, confirmation_code, booked_at, amount_cents, currency); left `attachments` and `raw_email_id` reserved for future email-parsing/upload work.

**Rationale**: Same as D12 — the migration generates the TypeScript types, so any drift becomes runtime/type errors. Catching it before writing code avoided building against a fictional schema.

**Reversibility**: N/A — documentation update plus net-new feature code.

### D14: Link-based member invitation over email invites

**Date**: Member invitation flow build (dependency for Expense splits).

**Context**: Expense splits (MVP #4) require a trip to have >1 member, but the only membership path was the owner being auto-added on trip creation. Needed an invitation mechanism. `profiles` has no email column to look users up by, and Supabase's free tier has email rate limits (§8). Applied the project principle "selesaikan dependensi dulu": built the member flow before resuming the expense tracker.

**Decision**: Reusable, revocable per-trip share link (exactly one active link per trip, stored in `trip_invites`). The owner picks the role the link grants (editor or viewer). Joining happens via a top-level `/join/[token]` route (outside the `(app)` group) and reuses the existing `redirect_to` proxy param so logout→login→join survives. The owner can remove members and change roles; non-owner members can leave. Viewer read-only is enforced automatically by the existing `assertTripEditor` guards.

**Rationale**:
- No email infrastructure needed (avoids §8 rate limits) and nothing to look up by email.
- Scope fits couples / small groups — the MVP target.
- App-level authorization stays consistent with §5; the service layer (`member.service.ts`) asserts owner/member before every mutation.

**Trade-offs accepted**:
- A leaked link works until revoked. Mitigated by owner revoke/regenerate (one active token per trip).
- No per-invitee tracking (who joined via which link). Acceptable for MVP.

**Reversibility**: High — `trip_invites` is additive; an email-based flow can be layered on later.

---

## 13. Glossary

- **Trip**: A single travel plan with destination(s), dates, members, and content (itinerary, bookings, expenses)
- **Owner**: The user who created the trip; has full delete authority
- **Editor**: A member who can modify trip content but not delete the trip
- **Viewer**: A member with read-only access (not implemented yet)
- **Itinerary item**: A planned activity within a trip's day
- **Booking record**: A record of an external booking (hotel, flight, etc.) — not a live booking
- **Expense**: A logged spending event within a trip
- **Expense split**: How an expense is divided among trip members

---

## 14. Contact & Maintenance

- **Owner**: @mifmelse
- **Repository**: https://github.com/mifmelse/travelin (private)
- **Status**: Active development, MVP phase

If you are an AI agent reading this: do not modify this file without explicit instruction from the human owner. Suggest changes in a discussion, not in code.

If you are a human reader: keep this file alive. Every gotcha, every decision, every "we tried X and it didn't work" — capture it here while it's fresh.

---

*Last meaningful update: when feature delegation to Claude Code begins.*
