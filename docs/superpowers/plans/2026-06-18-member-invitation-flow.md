# Member Invitation Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a trip owner invite others via a reusable, revocable share link (role chosen by owner), and manage trip membership — the unmet dependency for Expense splits.

**Architecture:** New `trip_invites` table (one active link per trip). App-level authorization in a new `member.service.ts` (no RLS, per AGENTS.md §5). A top-level `/join/[token]` route handles joining, reusing the existing `redirect_to` proxy param so logout→login→join survives. Members page replaces the current stub.

**Tech Stack:** Next.js 16 (App Router, Server Actions, `proxy.ts`), Supabase (PostgreSQL + Auth, RLS disabled), Zod v4, shadcn v4 (Base UI), Vitest, date-fns.

**Spec:** `docs/superpowers/specs/2026-06-18-member-invitation-flow-design.md`

**Conventions reminder (AGENTS.md):** never `any` (use `unknown`); services take `userId` explicitly and never call `getUser()`; Server Actions start with `getUser()` + auth check; style Base UI triggers via `buttonVariants()` (never `<Trigger asChild><Button>`); money/dates rules N/A here; **do not commit until the user says so** (hard rule #1) — the `git commit` steps below are prepared commands to run only after approval.

---

## File Structure

**Create:**
- `supabase/migrations/<timestamp>_trip_invites.sql` — table + disable RLS
- `src/lib/url.ts` — `safeRelativePath` open-redirect guard
- `src/services/member.service.ts` — membership + invite business logic
- `src/app/(app)/trips/[id]/members/actions.ts` — member/invite server actions
- `src/app/join/[token]/page.tsx` — join landing (top-level, outside `(app)`)
- `src/app/join/[token]/actions.ts` — `joinTripAction`
- `src/app/join/[token]/join-trip-button.tsx` — submit button (client)
- `src/components/features/member/role-badge.tsx` — owner/editor/viewer pill
- `src/components/features/member/invite-link-card.tsx` — copy/role/regenerate/revoke (client)
- `src/components/features/member/member-actions-menu.tsx` — per-member dropdown (client)
- `src/components/features/member/leave-trip-button.tsx` — leave button (client)
- `tests/lib/url.test.ts`
- `tests/services/member.service.test.ts`

**Modify:**
- `src/lib/supabase/session.ts` — add `/join` to `PROTECTED_PREFIXES`
- `src/app/(auth)/actions.ts` — `login`/`register` honor `redirect_to`
- `src/app/(auth)/login/page.tsx` — hidden `redirect_to` field + preserve on link
- `src/app/(auth)/register/page.tsx` — Suspense + hidden `redirect_to` field + preserve on link
- `src/app/(app)/trips/[id]/members/page.tsx` — replace stub with real UI
- `src/types/database.ts` — regenerated (not hand-edited)
- `AGENTS.md` — §4 table + D14 (Task 10, with approval)

---

## Task 1: Migration — `trip_invites` table

**Files:**
- Create: `supabase/migrations/<timestamp>_trip_invites.sql`
- Modify (generated): `src/types/database.ts`

- [ ] **Step 1: Create the migration file**

Generate a timestamped file:

```bash
supabase migration new trip_invites
```

Put this SQL in the created file (`supabase/migrations/<timestamp>_trip_invites.sql`):

```sql
-- Reusable per-trip invite link. Exactly one active link per trip.
create table public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips(id) on delete cascade,
  token text not null unique,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_trip_invites_token on public.trip_invites(token);

-- Reuse the existing updated_at trigger function (set_updated_at) used by other tables.
create trigger trip_invites_set_updated_at
  before update on public.trip_invites
  for each row execute function public.set_updated_at();

-- App-level authorization only (AGENTS.md §5): RLS stays disabled.
alter table public.trip_invites disable row level security;
```

> NOTE: confirm the trigger function name by checking an existing trigger in `supabase/migrations/20260522121348_initial_schema.sql` (search `set_updated_at`). If the function has a different name, use that name here.

- [ ] **Step 2: Push the migration**

Run: `supabase db push`
Expected: applies `<timestamp>_trip_invites.sql` with no error.

> If `supabase db push` requires linking/credentials you don't have, STOP and ask the user to run Steps 2–3. Do not fabricate types.

- [ ] **Step 3: Regenerate types**

Run: `npm run db:types`
Expected: `src/types/database.ts` now contains a `trip_invites` block (Row/Insert/Update with `token`, `role`, `created_by`, etc.).

Verify:

```bash
grep -n "trip_invites" src/types/database.ts
```

Expected: matches found.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/ src/types/database.ts
git commit -m "feat: add trip_invites table for member invitation links"
```

---

## Task 2: `safeRelativePath` open-redirect guard (TDD)

**Files:**
- Create: `src/lib/url.ts`
- Test: `tests/lib/url.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/lib/url.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { safeRelativePath } from '@/lib/url'

describe('safeRelativePath', () => {
  it('accepts a simple relative path', () => {
    expect(safeRelativePath('/join/abc')).toBe('/join/abc')
  })

  it('accepts a relative path with query string', () => {
    expect(safeRelativePath('/dashboard?tab=1')).toBe('/dashboard?tab=1')
  })

  it('rejects protocol-relative URLs', () => {
    expect(safeRelativePath('//evil.com')).toBeNull()
  })

  it('rejects absolute URLs', () => {
    expect(safeRelativePath('https://evil.com')).toBeNull()
    expect(safeRelativePath('http://evil.com')).toBeNull()
  })

  it('rejects javascript: and other schemes', () => {
    expect(safeRelativePath('javascript:alert(1)')).toBeNull()
  })

  it('rejects paths not starting with a slash', () => {
    expect(safeRelativePath('dashboard')).toBeNull()
  })

  it('rejects null, undefined, empty, and non-strings', () => {
    expect(safeRelativePath(null)).toBeNull()
    expect(safeRelativePath(undefined)).toBeNull()
    expect(safeRelativePath('')).toBeNull()
    expect(safeRelativePath(123)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/lib/url.test.ts`
Expected: FAIL — cannot resolve `@/lib/url` / `safeRelativePath is not a function`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/url.ts`:

```ts
/**
 * Returns `value` only if it is a safe, local (relative) path that begins with a
 * single "/". Rejects protocol-relative ("//host"), absolute URLs, and any
 * non-string. Used to guard post-login redirects against open-redirect attacks.
 */
export function safeRelativePath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!/^\/(?!\/)/.test(value)) return null
  return value
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/lib/url.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/url.ts tests/lib/url.test.ts
git commit -m "feat: add safeRelativePath open-redirect guard"
```

---

## Task 3: Wire `redirect_to` through auth

The proxy already redirects unauthenticated users on protected prefixes to
`/login?redirect_to=<path>`. We add `/join` to those prefixes and make
`login`/`register` honor the param.

**Files:**
- Modify: `src/lib/supabase/session.ts`
- Modify: `src/app/(auth)/actions.ts`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Add `/join` to protected prefixes**

In `src/lib/supabase/session.ts`, change the `PROTECTED_PREFIXES` constant:

```ts
const PROTECTED_PREFIXES = ['/dashboard', '/trips', '/settings', '/join']
```

- [ ] **Step 2: Make `login` honor `redirect_to`**

In `src/app/(auth)/actions.ts`, add the import at the top:

```ts
import { safeRelativePath } from '@/lib/url'
```

Replace the end of the `login` function (the `revalidatePath` + `redirect` lines) with:

```ts
  revalidatePath('/', 'layout')
  const redirectTo = safeRelativePath(formData.get('redirect_to')) ?? '/dashboard'
  redirect(redirectTo)
```

- [ ] **Step 3: Make `register` forward `redirect_to`**

In `src/app/(auth)/actions.ts`, replace the final `redirect('/login?registered=1')` in `register` with:

```ts
  const redirectTo = safeRelativePath(formData.get('redirect_to'))
  redirect(
    redirectTo
      ? `/login?registered=1&redirect_to=${encodeURIComponent(redirectTo)}`
      : '/login?registered=1'
  )
```

- [ ] **Step 4: Add hidden field to the login form**

In `src/app/(auth)/login/page.tsx`, inside `LoginForm`, after the existing
`const justRegistered = ...` line add:

```tsx
  const redirectTo = searchParams.get('redirect_to') ?? ''
```

Then, immediately inside `<form action={formAction}>` (before `<CardContent>`), add the hidden input:

```tsx
        <input type="hidden" name="redirect_to" value={redirectTo} />
```

And update the "Daftar" link to preserve the param:

```tsx
            <Link
              href={redirectTo ? `/register?redirect_to=${encodeURIComponent(redirectTo)}` : '/register'}
              className="underline"
            >
              Daftar
            </Link>
```

- [ ] **Step 5: Add Suspense + hidden field to the register form**

In `src/app/(auth)/register/page.tsx`, refactor to mirror the login page (Base UI / Next require a Suspense boundary around `useSearchParams`). Replace the whole file with:

```tsx
'use client'

import { Suspense, useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { register, type AuthState } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const initialState: AuthState = {}

function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, initialState)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect_to') ?? ''

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome to travelin</CardTitle>
        <CardDescription>Bikin akun, mulai rencanain trip lo</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <CardContent className="space-y-4">
          {state.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="displayName">Nama (opsional)</Label>
            <Input id="displayName" name="displayName" placeholder="Nama panggilan" />
            {state.fieldErrors?.displayName && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.displayName[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="kamu@email.com" required />
            {state.fieldErrors?.email && (
              <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="Min 8 karakter" required />
            {state.fieldErrors?.password && (
              <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Loading...' : 'Daftar'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Udah punya akun?{' '}
            <Link
              href={redirectTo ? `/login?redirect_to=${encodeURIComponent(redirectTo)}` : '/login'}
              className="underline"
            >
              Login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase/session.ts src/app/\(auth\)/actions.ts src/app/\(auth\)/login/page.tsx src/app/\(auth\)/register/page.tsx
git commit -m "feat: honor redirect_to through login/register for join flow"
```

---

## Task 4: `member.service.ts` + tests (TDD)

**Files:**
- Create: `src/services/member.service.ts`
- Test: `tests/services/member.service.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/services/member.service.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import {
  leaveTrip,
  removeMember,
  updateMemberRole,
  upsertInvite,
  revokeInvite,
  joinTripViaToken,
} from '@/services/member.service'

/**
 * Mock Supabase whose terminal calls (.maybeSingle / .single) resolve to the
 * queued values in order. Chain methods return the chain so call order doesn't
 * matter. insert/update/delete/upsert are tracked for assertions.
 */
function createMockSupabase(maybeSingleValues: unknown[]) {
  const queue = [...maybeSingleValues]
  const chain = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: queue.shift() ?? null, error: null })),
    single: vi.fn(async () => ({ data: queue.shift() ?? null, error: null })),
  }
  chain.from.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.delete.mockResolvedValue({ error: null })
  chain.upsert.mockReturnValue(chain)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return chain as any
}

describe('leaveTrip', () => {
  it('throws when the owner tries to leave', async () => {
    // assertTripMember -> getTripMembership -> maybeSingle -> { role: 'owner' }
    const supabase = createMockSupabase([{ role: 'owner' }])
    await expect(leaveTrip(supabase, 'trip-1', 'user-1')).rejects.toThrow(
      'Owner tidak bisa keluar'
    )
  })

  it('allows a non-owner member to leave', async () => {
    const supabase = createMockSupabase([{ role: 'editor' }])
    await expect(leaveTrip(supabase, 'trip-1', 'user-1')).resolves.toBeUndefined()
    expect(supabase.delete).toHaveBeenCalled()
  })
})

describe('removeMember', () => {
  it('throws when caller is not the owner', async () => {
    // assertTripOwner -> trips.owner_id -> maybeSingle -> { owner_id: 'someone-else' }
    const supabase = createMockSupabase([{ owner_id: 'someone-else' }])
    await expect(
      removeMember(supabase, 'trip-1', 'target', 'user-1')
    ).rejects.toThrow('Only the trip owner')
  })

  it('throws when trying to remove the owner', async () => {
    const supabase = createMockSupabase([{ owner_id: 'user-1' }])
    await expect(
      removeMember(supabase, 'trip-1', 'user-1', 'user-1')
    ).rejects.toThrow('Owner tidak bisa dikeluarkan')
  })

  it('removes a non-owner member when caller is owner', async () => {
    const supabase = createMockSupabase([{ owner_id: 'user-1' }])
    await expect(
      removeMember(supabase, 'trip-1', 'target', 'user-1')
    ).resolves.toBeUndefined()
    expect(supabase.delete).toHaveBeenCalled()
  })
})

describe('updateMemberRole', () => {
  it('throws when caller is not the owner', async () => {
    const supabase = createMockSupabase([{ owner_id: 'someone-else' }])
    await expect(
      updateMemberRole(supabase, 'trip-1', 'target', 'viewer', 'user-1')
    ).rejects.toThrow('Only the trip owner')
  })

  it('throws when changing the owner role', async () => {
    const supabase = createMockSupabase([{ owner_id: 'user-1' }])
    await expect(
      updateMemberRole(supabase, 'trip-1', 'user-1', 'viewer', 'user-1')
    ).rejects.toThrow('Role owner tidak bisa diubah')
  })
})

describe('upsertInvite / revokeInvite', () => {
  it('upsertInvite throws when caller is not the owner', async () => {
    const supabase = createMockSupabase([{ owner_id: 'someone-else' }])
    await expect(
      upsertInvite(supabase, 'trip-1', 'user-1', 'editor')
    ).rejects.toThrow('Only the trip owner')
  })

  it('revokeInvite throws when caller is not the owner', async () => {
    const supabase = createMockSupabase([{ owner_id: 'someone-else' }])
    await expect(revokeInvite(supabase, 'trip-1', 'user-1')).rejects.toThrow(
      'Only the trip owner'
    )
  })
})

describe('joinTripViaToken', () => {
  it('throws on an unknown/revoked token', async () => {
    // trip_invites lookup -> maybeSingle -> null
    const supabase = createMockSupabase([null])
    await expect(joinTripViaToken(supabase, 'bad-token', 'user-1')).rejects.toThrow(
      'tidak valid'
    )
  })

  it('is idempotent when already a member', async () => {
    // 1st maybeSingle: invite { trip_id, role }; 2nd: existing membership
    const supabase = createMockSupabase([
      { trip_id: 'trip-1', role: 'editor' },
      { role: 'editor' },
    ])
    const result = await joinTripViaToken(supabase, 'tok', 'user-1')
    expect(result).toEqual({ tripId: 'trip-1', alreadyMember: true })
    expect(supabase.insert).not.toHaveBeenCalled()
  })

  it('inserts membership when not yet a member', async () => {
    const supabase = createMockSupabase([
      { trip_id: 'trip-1', role: 'viewer' },
      null,
    ])
    const result = await joinTripViaToken(supabase, 'tok', 'user-1')
    expect(result).toEqual({ tripId: 'trip-1', alreadyMember: false })
    expect(supabase.insert).toHaveBeenCalledWith({
      trip_id: 'trip-1',
      profile_id: 'user-1',
      role: 'viewer',
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/services/member.service.test.ts`
Expected: FAIL — cannot resolve `@/services/member.service`.

- [ ] **Step 3: Write the implementation**

`src/services/member.service.ts`:

```ts
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  assertTripMember,
  assertTripOwner,
  getTripMembership,
} from '@/services/trip.service'

// =========================================
// SCHEMAS / TYPES
// =========================================

export const memberRoleSchema = z.enum(['editor', 'viewer'])
export type MemberRole = z.infer<typeof memberRoleSchema>

export type TripMemberWithProfile = {
  profile_id: string
  role: 'owner' | 'editor' | 'viewer'
  display_name: string
  avatar_url: string | null
}

export type TripInvite = {
  token: string
  role: 'editor' | 'viewer'
}

const ROLE_ORDER: Record<TripMemberWithProfile['role'], number> = {
  owner: 0,
  editor: 1,
  viewer: 2,
}

function generateToken(): string {
  return randomBytes(24).toString('base64url')
}

// =========================================
// QUERIES
// =========================================

/**
 * List members of a trip with their profile info. Requires the caller to be a
 * member. Owner is returned first, then editors, then viewers (alpha within).
 */
export async function listTripMembers(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
): Promise<TripMemberWithProfile[]> {
  await assertTripMember(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('trip_members')
    .select('profile_id, role, profiles!inner(display_name, avatar_url)')
    .eq('trip_id', tripId)

  if (error) throw new Error(`Failed to list members: ${error.message}`)

  const members: TripMemberWithProfile[] = (data ?? []).map((row) => {
    // profiles is a to-one relation; supabase-js may type it as object or array.
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      profile_id: row.profile_id,
      role: row.role as TripMemberWithProfile['role'],
      display_name: profile?.display_name ?? 'Traveler',
      avatar_url: profile?.avatar_url ?? null,
    }
  })

  return members.sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      a.display_name.localeCompare(b.display_name)
  )
}

export type InvitePreview = {
  tripId: string
  role: 'editor' | 'viewer'
  trip: {
    title: string
    destination: string | null
    start_date: string | null
    end_date: string | null
  }
}

/**
 * Look up an invite by token and return a trip preview for the join page.
 * NO authorization assert by design: the token itself is the capability, and the
 * caller may not yet be a member of the trip. Returns null for unknown/revoked.
 */
export async function getInvitePreview(
  supabase: SupabaseClient<Database>,
  token: string
): Promise<InvitePreview | null> {
  const { data, error } = await supabase
    .from('trip_invites')
    .select('trip_id, role, trips!inner(title, destination, start_date, end_date)')
    .eq('token', token)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch invite: ${error.message}`)
  if (!data) return null

  const trip = Array.isArray(data.trips) ? data.trips[0] : data.trips
  return {
    tripId: data.trip_id,
    role: data.role as 'editor' | 'viewer',
    trip: {
      title: trip?.title ?? 'Trip',
      destination: trip?.destination ?? null,
      start_date: trip?.start_date ?? null,
      end_date: trip?.end_date ?? null,
    },
  }
}

/**
 * Get the active invite link for a trip. Owner only. Returns null if none.
 */
export async function getInvite(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
): Promise<TripInvite | null> {
  await assertTripOwner(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('trip_invites')
    .select('token, role')
    .eq('trip_id', tripId)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch invite: ${error.message}`)
  return data as TripInvite | null
}

// =========================================
// MUTATIONS
// =========================================

/**
 * Create or regenerate the trip's invite link (new token each call). Owner only.
 */
export async function upsertInvite(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string,
  role: MemberRole
): Promise<TripInvite> {
  await assertTripOwner(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('trip_invites')
    .upsert(
      { trip_id: tripId, token: generateToken(), role, created_by: userId },
      { onConflict: 'trip_id' }
    )
    .select('token, role')
    .single()

  if (error) throw new Error(`Failed to create invite: ${error.message}`)
  return data as TripInvite
}

/**
 * Change the role the active invite grants (no token change). Owner only.
 */
export async function setInviteRole(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string,
  role: MemberRole
): Promise<TripInvite> {
  await assertTripOwner(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('trip_invites')
    .update({ role })
    .eq('trip_id', tripId)
    .select('token, role')
    .maybeSingle()

  if (error) throw new Error(`Failed to update invite role: ${error.message}`)
  if (!data) throw new Error('Belum ada link undangan untuk diubah')
  return data as TripInvite
}

/**
 * Revoke (delete) the trip's invite link. Owner only.
 */
export async function revokeInvite(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
): Promise<void> {
  await assertTripOwner(supabase, tripId, userId)

  const { error } = await supabase
    .from('trip_invites')
    .delete()
    .eq('trip_id', tripId)

  if (error) throw new Error(`Failed to revoke invite: ${error.message}`)
}

/**
 * Join a trip via an invite token. Any authenticated user. Idempotent: if the
 * user is already a member, returns alreadyMember = true without inserting.
 */
export async function joinTripViaToken(
  supabase: SupabaseClient<Database>,
  token: string,
  userId: string
): Promise<{ tripId: string; alreadyMember: boolean }> {
  const { data: invite, error } = await supabase
    .from('trip_invites')
    .select('trip_id, role')
    .eq('token', token)
    .maybeSingle()

  if (error) throw new Error(`Failed to look up invite: ${error.message}`)
  if (!invite) {
    throw new Error('Link undangan tidak valid atau sudah dinonaktifkan')
  }

  const existing = await getTripMembership(supabase, invite.trip_id, userId)
  if (existing) return { tripId: invite.trip_id, alreadyMember: true }

  const { error: insertError } = await supabase.from('trip_members').insert({
    trip_id: invite.trip_id,
    profile_id: userId,
    role: invite.role,
  })

  if (insertError) throw new Error(`Failed to join trip: ${insertError.message}`)
  return { tripId: invite.trip_id, alreadyMember: false }
}

/**
 * Remove a member from a trip. Owner only. Cannot remove the owner.
 */
export async function removeMember(
  supabase: SupabaseClient<Database>,
  tripId: string,
  memberProfileId: string,
  userId: string
): Promise<void> {
  await assertTripOwner(supabase, tripId, userId)
  // assertTripOwner guarantees userId === trip.owner_id, so the owner row is userId.
  if (memberProfileId === userId) {
    throw new Error('Owner tidak bisa dikeluarkan dari trip')
  }

  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('profile_id', memberProfileId)

  if (error) throw new Error(`Failed to remove member: ${error.message}`)
}

/**
 * Change a member's role (editor <-> viewer). Owner only. Cannot change owner.
 */
export async function updateMemberRole(
  supabase: SupabaseClient<Database>,
  tripId: string,
  memberProfileId: string,
  role: MemberRole,
  userId: string
): Promise<void> {
  await assertTripOwner(supabase, tripId, userId)
  if (memberProfileId === userId) {
    throw new Error('Role owner tidak bisa diubah')
  }

  const { error } = await supabase
    .from('trip_members')
    .update({ role })
    .eq('trip_id', tripId)
    .eq('profile_id', memberProfileId)

  if (error) throw new Error(`Failed to update member role: ${error.message}`)
}

/**
 * Leave a trip. Any member except the owner (owner must delete the trip).
 */
export async function leaveTrip(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
): Promise<void> {
  const member = await assertTripMember(supabase, tripId, userId)
  if (member.role === 'owner') {
    throw new Error('Owner tidak bisa keluar dari trip; hapus trip sebagai gantinya')
  }

  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('profile_id', userId)

  if (error) throw new Error(`Failed to leave trip: ${error.message}`)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/services/member.service.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: no errors. (If the `profiles` join produces a type error, the
`Array.isArray(row.profiles)` guard already handles both shapes; confirm no `any`
leaked.)

- [ ] **Step 6: Commit**

```bash
git add src/services/member.service.ts tests/services/member.service.test.ts
git commit -m "feat: add member.service for trip membership and invites"
```

---

## Task 5: Member server actions

**Files:**
- Create: `src/app/(app)/trips/[id]/members/actions.ts`

- [ ] **Step 1: Write the actions file**

`src/app/(app)/trips/[id]/members/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  upsertInvite,
  setInviteRole,
  revokeInvite,
  removeMember,
  updateMemberRole,
  leaveTrip,
  memberRoleSchema,
} from '@/services/member.service'

export type ActionState = {
  error?: string
  success?: boolean
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function generateInviteAction(
  tripId: string,
  role: 'editor' | 'viewer'
): Promise<ActionState> {
  const parsed = memberRoleSchema.safeParse(role)
  if (!parsed.success) return { error: 'Role tidak valid' }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await upsertInvite(supabase, tripId, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/members`)
  return { success: true }
}

export async function setInviteRoleAction(
  tripId: string,
  role: 'editor' | 'viewer'
): Promise<ActionState> {
  const parsed = memberRoleSchema.safeParse(role)
  if (!parsed.success) return { error: 'Role tidak valid' }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await setInviteRole(supabase, tripId, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/members`)
  return { success: true }
}

export async function revokeInviteAction(tripId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await revokeInvite(supabase, tripId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/members`)
  return { success: true }
}

export async function removeMemberAction(
  tripId: string,
  memberProfileId: string
): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await removeMember(supabase, tripId, memberProfileId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/members`)
  return { success: true }
}

export async function updateMemberRoleAction(
  tripId: string,
  memberProfileId: string,
  role: 'editor' | 'viewer'
): Promise<ActionState> {
  const parsed = memberRoleSchema.safeParse(role)
  if (!parsed.success) return { error: 'Role tidak valid' }

  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await updateMemberRole(supabase, tripId, memberProfileId, parsed.data, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/members`)
  return { success: true }
}

export async function leaveTripAction(tripId: string): Promise<ActionState> {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await leaveTrip(supabase, tripId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/trips/\[id\]/members/actions.ts
git commit -m "feat: add member management server actions"
```

---

## Task 6: Join route + action

**Files:**
- Create: `src/app/join/[token]/actions.ts`
- Create: `src/app/join/[token]/page.tsx`

- [ ] **Step 1: Write the join action**

`src/app/join/[token]/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { joinTripViaToken } from '@/services/member.service'

export type JoinState = { error?: string }

export async function joinTripAction(
  token: string,
  _prev: JoinState,
  _formData: FormData
): Promise<JoinState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect_to=/join/${token}`)

  let tripId: string
  try {
    const result = await joinTripViaToken(supabase, token, user.id)
    tripId = result.tripId
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Gagal join trip' }
  }

  revalidatePath('/dashboard')
  redirect(`/trips/${tripId}`)
}
```

- [ ] **Step 2: Write the join page**

`src/app/join/[token]/page.tsx`:

```tsx
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/services/profile.service'
import { getTripMembership } from '@/services/trip.service'
import { getInvitePreview } from '@/services/member.service'
import { formatTripDateRange } from '@/lib/format'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { JoinTripButton } from './join-trip-button'

const ROLE_LABEL: Record<string, string> = {
  editor: 'Editor (bisa ngedit isi trip)',
  viewer: 'Viewer (cuma bisa lihat)',
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Proxy normally redirects unauthenticated users; guard defensively.
  if (!user) redirect(`/login?redirect_to=/join/${token}`)
  await ensureProfile(supabase, user)

  const invite = await getInvitePreview(supabase, token)

  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">{children}</Card>
      </div>
    )
  }

  if (!invite) {
    return (
      <Shell>
        <CardHeader>
          <CardTitle>Link tidak valid</CardTitle>
          <CardDescription>
            Link undangan ini tidak valid atau sudah dinonaktifkan oleh owner.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
            Ke dashboard
          </Link>
        </CardFooter>
      </Shell>
    )
  }

  const trip = invite.trip
  const existing = await getTripMembership(supabase, invite.tripId, user.id)

  if (existing) {
    return (
      <Shell>
        <CardHeader>
          <CardTitle>Kamu sudah anggota</CardTitle>
          <CardDescription>
            Kamu sudah jadi anggota trip &quot;{trip.title}&quot;.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href={`/trips/${invite.tripId}`} className={buttonVariants()}>
            Buka trip
          </Link>
        </CardFooter>
      </Shell>
    )
  }

  return (
    <Shell>
      <CardHeader>
        <CardTitle>Kamu diundang ke trip</CardTitle>
        <CardDescription>{ROLE_LABEL[invite.role] ?? invite.role}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-lg font-semibold text-foreground">{trip.title}</p>
        {trip.destination && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {trip.destination}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {formatTripDateRange(trip.start_date, trip.end_date)}
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-3">
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
          Nanti aja
        </Link>
        <JoinTripButton token={token} />
      </CardFooter>
    </Shell>
  )
}
```

- [ ] **Step 3: Write the join button (client)**

`src/app/join/[token]/join-trip-button.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { joinTripAction, type JoinState } from './actions'

export function JoinTripButton({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<JoinState, FormData>(
    joinTripAction.bind(null, token),
    {}
  )

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Joining...' : 'Join trip'}
      </Button>
    </form>
  )
}
```

> NOTE: `join-trip-button.tsx` lives next to the route (not in `features/`) because
> it is tightly coupled to this single page's action.

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/join/
git commit -m "feat: add /join/[token] route to accept trip invites"
```

---

## Task 7: Member feature components

**Files:**
- Create: `src/components/features/member/role-badge.tsx`
- Create: `src/components/features/member/invite-link-card.tsx`
- Create: `src/components/features/member/member-actions-menu.tsx`
- Create: `src/components/features/member/leave-trip-button.tsx`

- [ ] **Step 1: Role badge**

`src/components/features/member/role-badge.tsx`:

```tsx
import { cn } from '@/lib/utils'

type Role = 'owner' | 'editor' | 'viewer'

const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
}

const ROLE_CLASSES: Record<Role, string> = {
  owner: 'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary',
  editor: 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent',
  viewer: 'bg-muted text-muted-foreground',
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        ROLE_CLASSES[role],
        className
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  )
}
```

- [ ] **Step 2: Invite link card (client)**

`src/components/features/member/invite-link-card.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, RefreshCw, Trash2, Link2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  generateInviteAction,
  setInviteRoleAction,
  revokeInviteAction,
} from '@/app/(app)/trips/[id]/members/actions'

type Invite = { token: string; role: 'editor' | 'viewer' } | null

export function InviteLinkCard({
  tripId,
  invite,
}: {
  tripId: string
  invite: Invite
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const url =
    invite && typeof window !== 'undefined'
      ? `${window.location.origin}/join/${invite.token}`
      : ''

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) setError(result.error)
      else router.refresh()
    })
  }

  async function copy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          Link undangan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!invite ? (
          <Button
            disabled={pending}
            onClick={() => run(() => generateInviteAction(tripId, 'editor'))}
          >
            {pending ? 'Membuat...' : 'Buat link undangan'}
          </Button>
        ) : (
          <>
            <div className="flex gap-2">
              <Input readOnly value={url} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copy}
                aria-label="Salin link"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role saat join</Label>
              <select
                id="invite-role"
                value={invite.role}
                disabled={pending}
                onChange={(e) =>
                  run(() =>
                    setInviteRoleAction(tripId, e.target.value as 'editor' | 'viewer')
                  )
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="editor">Editor (bisa ngedit isi trip)</option>
                <option value="viewer">Viewer (cuma bisa lihat)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => generateInviteAction(tripId, invite.role))}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="text-destructive"
                onClick={() => setRevokeOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Revoke
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan link undangan?</AlertDialogTitle>
            <AlertDialogDescription>
              Link yang sekarang bakal berhenti berfungsi. Kamu bisa bikin link
              baru kapan aja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending}
              onClick={() => {
                setRevokeOpen(false)
                run(() => revokeInviteAction(tripId))
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
```

- [ ] **Step 3: Member actions menu (client)**

`src/components/features/member/member-actions-menu.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, UserMinus, ArrowLeftRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  updateMemberRoleAction,
  removeMemberAction,
} from '@/app/(app)/trips/[id]/members/actions'

export function MemberActionsMenu({
  tripId,
  memberProfileId,
  memberName,
  role,
}: {
  tripId: string
  memberProfileId: string
  memberName: string
  role: 'editor' | 'viewer'
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [removeOpen, setRemoveOpen] = useState(false)
  const nextRole = role === 'editor' ? 'viewer' : 'editor'

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action()
      if (result?.error) alert(result.error)
      else router.refresh()
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          aria-label={`Kelola ${memberName}`}
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={pending}
            onClick={() =>
              run(() => updateMemberRoleAction(tripId, memberProfileId, nextRole))
            }
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Ubah jadi {nextRole === 'editor' ? 'Editor' : 'Viewer'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setRemoveOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Keluarkan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluarkan {memberName}?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberName} bakal kehilangan akses ke trip ini. Bisa diundang lagi
              pakai link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending}
              onClick={() => {
                setRemoveOpen(false)
                run(() => removeMemberAction(tripId, memberProfileId))
              }}
            >
              Keluarkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

- [ ] **Step 4: Leave trip button (client)**

`src/components/features/member/leave-trip-button.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { leaveTripAction } from '@/app/(app)/trips/[id]/members/actions'

export function LeaveTripButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleLeave() {
    setError(null)
    startTransition(async () => {
      // leaveTripAction redirects on success; only returns on error.
      const result = await leaveTripAction(tripId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <>
      <Button variant="outline" className="text-destructive" onClick={() => setOpen(true)}>
        <LogOut className="mr-2 h-4 w-4" />
        Leave trip
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari trip ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Kamu bakal kehilangan akses. Bisa join lagi kalau dapet link undangan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="px-1 text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending}
              onClick={handleLeave}
            >
              {pending ? 'Keluar...' : 'Leave'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/member/
git commit -m "feat: add member management UI components"
```

---

## Task 8: Members page UI

**Files:**
- Modify (replace): `src/app/(app)/trips/[id]/members/page.tsx`

- [ ] **Step 1: Replace the stub page**

`src/app/(app)/trips/[id]/members/page.tsx`:

```tsx
import { Crown, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listTripMembers, getInvite } from '@/services/member.service'
import { SectionHeader } from '@/components/ui/section-header'
import { ItemRow } from '@/components/ui/item-row'
import { RoleBadge } from '@/components/features/member/role-badge'
import { InviteLinkCard } from '@/components/features/member/invite-link-card'
import { MemberActionsMenu } from '@/components/features/member/member-actions-menu'
import { LeaveTripButton } from '@/components/features/member/leave-trip-button'

export default async function TripMembersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const members = await listTripMembers(supabase, id, user.id)
  const isOwner = members.some(
    (m) => m.profile_id === user.id && m.role === 'owner'
  )
  const invite = isOwner ? await getInvite(supabase, id, user.id) : null

  return (
    <div className="space-y-6">
      {isOwner && <InviteLinkCard tripId={id} invite={invite} />}

      <div className="space-y-3">
        <SectionHeader title={`Anggota (${members.length})`} />
        <div className="space-y-2">
          {members.map((m) => {
            const isSelf = m.profile_id === user.id
            const canManage = isOwner && m.role !== 'owner'
            return (
              <ItemRow
                key={m.profile_id}
                icon={m.role === 'owner' ? Crown : User}
                iconTone={m.role === 'owner' ? 'primary' : 'muted'}
                title={`${m.display_name}${isSelf ? ' (kamu)' : ''}`}
                actions={
                  <div className="flex items-center gap-2">
                    <RoleBadge role={m.role} />
                    {canManage && (
                      <MemberActionsMenu
                        tripId={id}
                        memberProfileId={m.profile_id}
                        memberName={m.display_name}
                        role={m.role as 'editor' | 'viewer'}
                      />
                    )}
                  </div>
                }
              />
            )
          })}
        </div>
      </div>

      {!isOwner && (
        <div className="flex justify-end">
          <LeaveTripButton tripId={id} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/trips/\[id\]/members/page.tsx
git commit -m "feat: build trip members page with invite and management"
```

---

## Task 9: Manual smoke test

No code; verify the whole flow end-to-end. Requires the dev server and (for the
logout→login leg) a second account or an incognito window.

- [ ] **Step 1: Start the app**

Run: `npm run dev`

- [ ] **Step 2: Owner generates a link**

1. Log in as the trip owner. Open a trip → **Members**.
2. Confirm the member list shows only the owner with an "Owner" badge and no
   per-row actions; the invite card is visible.
3. Click **Buat link undangan**. A link appears; click **Copy**; set role to
   **Viewer** then back to **Editor**.

- [ ] **Step 3: logout → login → join**

1. Copy the `…/join/<token>` URL. Open an incognito window (logged out) and paste it.
2. Expect redirect to `/login?redirect_to=/join/<token>`.
3. Log in as a *different* account. Expect to land back on the join page showing
   the trip preview ("Kamu diundang ke trip").
4. Click **Join trip**. Expect redirect to `/trips/<id>` with access.

- [ ] **Step 4: Management**

1. Back as owner, reload Members. The new member appears with an "Editor" badge
   and a `⋮` menu.
2. Use the menu → **Ubah jadi Viewer**; confirm the badge updates.
3. As the viewer account, open the trip and confirm editing booking/itinerary is
   blocked (mutations call `assertTripEditor`).
4. As the member, open Members → **Leave trip** → confirm redirect to `/dashboard`
   and the trip is gone from the list.
5. As owner, **Regenerate** then **Revoke** the link; confirm an old/revoked
   `…/join/<token>` shows "Link tidak valid".

- [ ] **Step 5: Record results**

Note any failures. If all pass, proceed to docs.

---

## Task 10: Documentation (AGENTS.md) — requires owner approval

AGENTS.md §14 requires explicit owner approval before editing that file. Confirm
with the user before this task.

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Add `trip_invites` to §4**

After the `expense_splits` block in the Schema section, add:

```
trip_invites
  id (uuid, PK, gen_random_uuid())
  trip_id (uuid, FK trips.id, ON DELETE CASCADE, NOT NULL, UNIQUE)
    ← exactly one active invite link per trip
  token (text, NOT NULL, UNIQUE)            ← random url-safe, base64url(24 bytes)
  role (text, NOT NULL, default 'editor')   ← CHECK in ('editor','viewer'); role granted on join
  created_by (uuid, FK profiles.id, NOT NULL)
  created_at (timestamptz, NOT NULL, default now())
  updated_at (timestamptz, NOT NULL, default now())  ← trigger trip_invites_set_updated_at
  INDEX: idx_trip_invites_token on (token)
```

- [ ] **Step 2: Add decision D14**

After D13 in §12, add:

```
### D14: Link-based member invitation over email invites

**Date**: Member invitation flow build.

**Context**: Expense splits (MVP #4) require a trip to have >1 member, but the
only membership path was the owner being auto-added on trip creation. Needed an
invitation mechanism. `profiles` has no email column, and Supabase's free tier
has email rate limits (§8).

**Decision**: Reusable, revocable per-trip share link (one active link per trip,
stored in `trip_invites`). The owner picks the role the link grants (editor or
viewer). Joining happens via a top-level `/join/[token]` route, reusing the
existing `redirect_to` proxy param so logout→login→join survives. Members can be
removed / re-roled by the owner; non-owners can leave.

**Rationale**:
- No email infrastructure needed (avoids §8 rate limits) and nothing to look up
  by email.
- Scope fits couples / small groups — the MVP target.
- App-level authorization is consistent with §5; viewer read-only is already
  enforced by existing `assertTripEditor` guards.

**Trade-offs accepted**:
- A leaked link works until revoked. Mitigated by owner revoke/regenerate.
- No per-invitee tracking (who joined via which link). Acceptable for MVP.

**Reversibility**: High — `trip_invites` is additive; an email-based flow can be
layered on later.
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document trip_invites schema and D14 invitation decision"
```

---

## Final Verification

- [ ] `npx tsc --noEmit` — no errors
- [ ] `npm run lint` — clean
- [ ] `npm run test` — all tests pass (url + member.service + existing)
- [ ] Manual smoke test (Task 9) all green
- [ ] Self-review checklist (AGENTS.md §9) satisfied

## Follow-up (next milestone, separate spec)

Expense tracker + splits, built on this member flow. Reconcile the AGENTS.md §4
`expenses` / `expense_splits` drift then.
```
