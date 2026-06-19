# Design: Member Invitation Flow

**Date:** 2026-06-18
**Status:** Approved (design), pending implementation plan
**Author:** AI agent + @mifmelse

## Context & Motivation

The Expense tracker (MVP feature #4) is specified as "Log trip expenses with
multi-currency support, **optionally split between members**." Splitting an
expense between members requires a trip to have more than one member. Today the
only way a trip gains members is the owner being auto-added on trip creation
(`trip.service.ts` → `createTrip`). The members page is a stub ("invitation flow
lagi dirancang").

Per the project principle "selesaikan dependensi dulu, baru lanjut ke yang
seharusnya dikerjakan", the member invitation flow is the unmet dependency for
expense splits and is therefore built first. **This spec covers only the member
invitation flow.** Expenses + splits is the follow-up milestone (its own spec).

## Decisions (from brainstorming)

1. **Invite mechanism:** share link / kode invite (no email infra — avoids the
   Supabase email rate limits noted in AGENTS.md §8; `profiles` has no email
   column to look users up by anyway).
2. **Link nature:** reusable per trip — one active link per trip, valid until the
   owner revokes or regenerates it.
3. **Role on join:** owner picks the role the link grants (`editor` or `viewer`).
4. **Management capabilities (all in MVP):**
   - Owner can remove a member.
   - Owner can change a member's role (editor ↔ viewer).
   - A non-owner member can leave the trip themselves.
   - Owner can revoke / regenerate the link.
5. **Token storage:** new `trip_invites` table (Approach A), not columns on
   `trips`, to keep the trips table focused and support role + revoke cleanly.

## Non-goals (this milestone)

- Email-based invitations / pending-invite-by-email.
- Ownership transfer (owner cannot leave; must delete trip).
- Multiple concurrent links per trip (exactly one active link per trip).
- Viewer-specific UI beyond read-only enforcement (already automatic, see §Auth).

## Data Model

New table `trip_invites`:

```
trip_invites
  id          uuid PK default gen_random_uuid()
  trip_id     uuid FK trips(id) ON DELETE CASCADE, NOT NULL, UNIQUE  -- 1 active link/trip
  token       text NOT NULL UNIQUE                                   -- random url-safe
  role        text NOT NULL default 'editor'   -- 'editor' | 'viewer' (granted on join)
  created_by  uuid FK profiles(id) NOT NULL
  created_at  timestamptz NOT NULL default now()
  updated_at  timestamptz NOT NULL default now()  -- trigger set_updated_at (existing pattern)
```

- `UNIQUE(trip_id)` enforces exactly one active link per trip.
- **Revoke** = delete the row (no active link).
- **Regenerate** = update `token` to a fresh value.
- **Change link role** = update `role`.
- Migration also runs `alter table public.trip_invites disable row level
  security;` to stay consistent with AGENTS.md §5 (app-level authorization).
- After migration: `npm run db:types` to regenerate `src/types/database.ts`.

Token generation: `node:crypto` `randomBytes(24).toString('base64url')` in the
service layer (server-only).

## Authorization (app-level, AGENTS.md §5)

| Action                                          | Guard                       |
| ----------------------------------------------- | --------------------------- |
| Generate / regenerate / revoke link, set role   | owner only (`assertTripOwner`) |
| Remove member, change member role               | owner only; cannot target the owner row |
| Leave trip                                       | member, not owner (self only) |
| Join via token                                   | any authenticated user (token = capability); idempotent if already a member |
| List members                                     | any member (`assertTripMember`) |

**Viewer enforcement is already automatic.** All mutating service functions in
`booking.service.ts` and `itinerary.service.ts` call `assertTripEditor` (which
rejects `viewer`), and all reads call `assertTripMember`. No changes needed to
those services. The future expense service must follow the same pattern.

## Service Layer — `src/services/member.service.ts`

New service (mirrors the structure of `booking.service.ts`). Functions take
`userId` explicitly; never call `getUser()` internally (AGENTS.md §5).

- `listTripMembers(supabase, tripId, userId)` — `assertTripMember`; returns
  members joined with `profiles` (display_name, avatar_url) + role, owner first.
- `getInvite(supabase, tripId, userId)` — `assertTripOwner`; returns the active
  invite row or `null`.
- `upsertInvite(supabase, tripId, userId, role)` — `assertTripOwner`;
  create-or-regenerate the token for the trip (new token each call), set role.
- `setInviteRole(supabase, tripId, userId, role)` — `assertTripOwner`; update
  role on the existing invite (no token change).
- `revokeInvite(supabase, tripId, userId)` — `assertTripOwner`; delete the row.
- `joinTripViaToken(supabase, token, userId)` — look up invite by token; throw if
  none; insert `trip_members` (role = invite.role); if the user is already a
  member, no-op (idempotent); return `{ tripId, alreadyMember }`.
- `removeMember(supabase, tripId, memberProfileId, userId)` — `assertTripOwner`;
  throw if target is the owner; delete the `trip_members` row.
- `updateMemberRole(supabase, tripId, memberProfileId, role, userId)` —
  `assertTripOwner`; throw if target is the owner; update role.
- `leaveTrip(supabase, tripId, userId)` — must be a member and not the owner;
  delete own `trip_members` row.

Zod schemas: `inviteRoleSchema` (`z.enum(['editor','viewer'])`),
`memberRoleSchema` (same), validated in actions.

## Server Actions

`src/app/(app)/trips/[id]/members/actions.ts` (template per AGENTS.md §7:
validate → `getUser()` → auth check → service → `revalidatePath`):

- `generateInviteAction(tripId, role)` — create/regenerate link.
- `setInviteRoleAction(tripId, role)` — change link role.
- `revokeInviteAction(tripId)` — revoke link.
- `removeMemberAction(tripId, memberProfileId)`
- `updateMemberRoleAction(tripId, memberProfileId, role)`
- `leaveTripAction(tripId)` — on success `redirect('/dashboard')`.

`src/app/join/[token]/actions.ts`:

- `joinTripAction(token)` — `getUser()` → `joinTripViaToken` →
  `redirect('/trips/<tripId>')`.

All `revalidatePath('/trips/<id>/members')` after membership/link mutations.

## Join Route & Edge Cases — `src/app/join/[token]/page.tsx`

Placed at **top-level** (outside the `(app)` route group) so the blanket
`(app)/layout.tsx` redirect does not swallow it. `/join` is added to
`PROTECTED_PREFIXES` in `src/lib/supabase/session.ts` so the proxy uniformly
redirects unauthenticated users to `/login?redirect_to=/join/<token>` (reusing
the **existing** `redirect_to` param the proxy already sets).

Server component flow:

1. `getUser()` — defensively; proxy normally guarantees a user here.
2. Look up invite by token (+ its trip). If missing/revoked → render error state
   ("Link undangan tidak valid atau sudah dinonaktifkan").
3. If the user is already a member → render "Kamu sudah anggota trip ini" +
   "Buka trip" → `/trips/<id>`.
4. Otherwise → render trip preview (title, destination, date range via
   `formatTripDateRange`, "Kamu diundang sebagai <role>") + **Join** button →
   `joinTripAction(token)`.

### logout → login → join

- Logged-out click → proxy redirects to `/login?redirect_to=/join/<token>`.
- `login` / `register` pages read `redirect_to` from `searchParams` and render it
  as a hidden `<input name="redirect_to">`.
- `login` action reads `redirect_to`, validates it with `safeRelativePath()`
  (must start with a single `/`; reject `//` and absolute URLs → open-redirect
  guard), then `redirect(safe ?? '/dashboard')`.
- `register` action forwards `redirect_to` through to the login page
  (`/login?registered=1&redirect_to=...`) so the loop continues after
  confirmation/login.
- Back at `/join/<token>`, now authenticated → preview + Join.

### Other edge cases

- Already a member (incl. owner clicking own link) → "Buka trip", join is no-op.
- Invalid / revoked token → error state.
- Open redirect → blocked by `safeRelativePath()`.

New helper: `safeRelativePath(value)` in `src/lib/url.ts` returns `value` only if
`/^\/(?!\/)/.test(value)`, else `null`.

## UI — `src/components/features/member/`

Members page (`src/app/(app)/trips/[id]/members/page.tsx`) replaces the stub.
Server component fetches `listTripMembers` (+ `getInvite` if the viewer is owner).
Reuses existing primitives: `Card`, `SectionHeader`, `ItemRow`, `IconTile`,
`Select`, `DropdownMenu`, `AlertDialog`, `Input`, `buttonVariants`.

**A. Invite card (owner only):**

- No active link → "Buat link undangan" button (`generateInviteAction`, default
  role editor).
- Active link → read-only `Input` with `…/join/<token>` + **Copy** button
  (client, `navigator.clipboard`); role `Select` (Editor/Viewer →
  `setInviteRoleAction`); **Regenerate** and **Revoke** buttons, each behind an
  `AlertDialog` confirmation.

**B. Member list:**

- `SectionHeader` "Anggota (N)" + list of `ItemRow`: `Crown` icon for owner /
  `User` for others; title = `display_name` (+ "(kamu)" for self); small role
  badge (`role-badge.tsx`, modeled on `StatusBadge`: owner/editor/viewer).
- Right-side actions: non-owner rows get `member-actions-menu.tsx` (DropdownMenu)
  — "Ubah jadi Editor/Viewer" (`updateMemberRoleAction`) + "Keluarkan"
  (`AlertDialog` → `removeMemberAction`). Owner row: no actions.
- If the current user is a non-owner member → "Leave trip" button (`AlertDialog`
  → `leaveTripAction`).

**Client components (`'use client'`):** `invite-link-card.tsx` (copy + role +
regenerate/revoke), `member-actions-menu.tsx`. Follow gotcha AGENTS.md §8: style
triggers via `buttonVariants()`, never `<Trigger asChild><Button>`.

**Join page UI:** centered `Card` (like login) with trip details + Join.

## Testing (Level 1, AGENTS.md §10)

`tests/services/member.service.test.ts` (mock SupabaseClient per §10):

- `leaveTrip` throws for the owner; succeeds for a non-owner member.
- `removeMember` / `updateMemberRole` require owner; throw when targeting owner.
- `joinTripViaToken` throws on unknown/revoked token; idempotent when already a
  member.
- `upsertInvite` / `setInviteRole` / `revokeInvite` require owner.

`tests/lib/url.test.ts` (or extend an existing util test):

- `safeRelativePath` accepts `/join/x`; rejects `//evil.com`, `https://evil.com`,
  `javascript:…`, empty.

(Per §10 we do not unit-test components, server actions e2e, or live DB queries.)

## Documentation Updates

- **AGENTS.md §4:** add the `trip_invites` table.
- **AGENTS.md §12 (Decision Log):** add **D14** — link-based member invitation
  (reusable per trip, role-on-link), rationale (avoid email infra §8, scope =
  couples/small groups), trade-offs (leaked link works until revoked; mitigated
  by revoke/regenerate).
- AGENTS.md §14 requires owner approval for edits to that file — these updates are
  proposed as part of the implementation plan, applied only with approval.
- Known pre-existing drift in §4 (`expenses` / `expense_splits`) is **out of
  scope** here; it will be reconciled in the expense milestone.

## Implementation Order (high level)

1. Migration `trip_invites` + disable RLS → `supabase db push` → `npm run db:types`.
   (DB push / type regen may require the owner's Supabase credentials.)
2. `safeRelativePath` helper + `session.ts` (`/join` prefix) + `(auth)/actions.ts`
   & login/register pages (`redirect_to`).
3. `member.service.ts` + Zod schemas + service tests.
4. Member server actions + join action.
5. Join route/page.
6. Members page UI + feature components + `role-badge.tsx`.
7. AGENTS.md §4 + D14 (with approval).
8. Type check, lint, tests, manual smoke test.

## Follow-up (next milestone, not this spec)

Expense tracker + splits, built on top of this member flow. Reconcile AGENTS.md §4
`expenses` / `expense_splits` drift at that time.
