# Moments — Trip Documentation Feature (Design Spec)

**Date:** 2026-06-20
**Status:** Approved design, pending implementation plan
**MVP relation:** Net-new feature beyond MVP #1–4. Fulfills the "to memory" pillar
of the product vision (AGENTS.md §1) that planning/itinerary/bookings/expenses do not.

---

## 1. Summary

**Moments** is a per-trip documentation feed — a private "memory book" of a trip,
modeled on the behavior of LINE Timeline. Trip members post moments (photos,
videos, and text, with an optional location), and other members can like and
comment on them. It lives as a new tab in the trip detail page, alongside
Itinerary / Bookings / Expenses / Members.

The feed is **private to trip members** (does not violate AGENTS.md §1 non-goal
"Social features (sharing trips publicly)"), but the data model is deliberately
shaped to be **social-ready** — opening it up later (public visibility, more
reaction types, realtime) requires additive changes only, no rebuild.

### In scope (v1)
- Posts with text + multiple photos/videos + optional location name
- Feed ordered by **post time** (newest first)
- LINE-style media grid (show up to 5; remainder behind a "+N" overlay) + lightbox
- Like (single toggle, one per member per post)
- Comments, collapsed by default, with **one level** of replies
- Role-based permissions consistent with the rest of the app
- First use of Supabase Storage, isolated behind `src/lib/storage.ts`

### Out of scope (deferred, all additive later)
- **Realtime / live sync** — explicit non-goal (AGENTS.md §1). v1 uses optimistic
  UI for the actor; other members see updates on next page load. Supabase Realtime
  can subscribe to the `post_*` tables later with **zero schema change**.
- **Music / audio on posts** — discussed and explicitly dropped. If ever revived,
  the only sanctioned shape is a Spotify/YouTube link (one nullable `audio_url`
  column), never a licensed library or user audio upload.
- Multiple reaction types (😆😍😢) — one `type` column added later.
- Public sharing / visibility beyond the trip.
- Lat/lng coordinates + map pins (two nullable columns added later).
- Server-side video transcoding / thumbnail pipeline (v1 captures the poster
  client-side).

---

## 2. Design decisions (locked)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Private-now, social-ready-later | User chose this explicitly. Cheap to prepare (one `visibility` column); like/comment are already social infra. |
| 2 | Media = photo + video + text, multiple per post | User requirement. |
| 3 | Feed ordered by **post time** (`created_at`), not event time | User requirement; matches LINE behavior. No `occurred_at` field. |
| 4 | Permissions follow existing role model | owner & editor create/like/comment; author manages own; owner moderates any; viewer read-only. Reuses `assertTripEditor` (§5). |
| 5 | Supabase Storage, isolated behind `src/lib/storage.ts` | Consistent with §2/D7 single-platform philosophy; auth already integrated. Module isolation keeps a future MinIO/S3 swap to one file (mirrors D16 `lib/` isolation). |
| 6 | Normalized `post_media` child table (not jsonb) | Media is first-class: ordered, per-item delete, typed (image/video). Mirrors `expense_splits` / `trip_members`. jsonb in this app is only for non-queried data. |
| 7 | Like = single toggle | YAGNI. Multi-reaction is a later `type` column. |
| 8 | Comments = one-level threading, flattened in service | Avoids runaway indentation on mobile; small groups rarely need deeper. |
| 9 | Realtime deferred | AGENTS.md §1 non-goal; different data-fetch model from the app's RSC + `revalidatePath` architecture. Additive later. |

---

## 3. Data model (new migration)

One new migration, following all §4 conventions: `gen_random_uuid()` PKs,
`timestamptz` defaults of `now()`, `ON DELETE CASCADE` on child tables, RLS
**disabled** (app-level auth per §5), `updated_at` triggers mirroring
`itinerary_items_set_updated_at`.

New enum: `post_media_type` = `image | video`.

```
posts
  id              uuid PK gen_random_uuid()
  trip_id         uuid FK trips.id ON DELETE CASCADE, NOT NULL
  author_id       uuid FK profiles.id, NOT NULL
  body            text, nullable          -- caption; may be empty if >=1 media
  location_name   text, nullable          -- optional "Canggu, Bali"
  visibility      text NOT NULL default 'trip'   -- social-ready hook;
                                                  -- CHECK (visibility IN ('trip'))
                                                  -- add 'public' later
  created_at      timestamptz NOT NULL default now()
  updated_at      timestamptz NOT NULL default now()   -- trigger posts_set_updated_at
  INDEX idx_posts_trip_created ON (trip_id, created_at DESC)
  -- "post must not be empty" (body OR >=1 media) is enforced in Zod + service,
  --   NOT the DB (cross-table rule).

post_media
  id              uuid PK gen_random_uuid()
  post_id         uuid FK posts.id ON DELETE CASCADE, NOT NULL
  media_type      post_media_type NOT NULL        -- image | video
  storage_path    text NOT NULL                   -- path in Supabase bucket
  thumbnail_path  text, nullable                  -- poster for video
  position        int NOT NULL                    -- gallery order (0,1,2...)
  created_at      timestamptz NOT NULL default now()
  INDEX idx_post_media_post ON (post_id)

post_reactions                                    -- like (single toggle)
  id              uuid PK gen_random_uuid()
  post_id         uuid FK posts.id ON DELETE CASCADE, NOT NULL
  profile_id      uuid FK profiles.id ON DELETE CASCADE, NOT NULL
  created_at      timestamptz NOT NULL default now()
  UNIQUE (post_id, profile_id)                     -- 1 member = 1 like
  INDEX idx_post_reactions_post ON (post_id)

post_comments                                     -- comments + 1-level replies
  id                uuid PK gen_random_uuid()
  post_id           uuid FK posts.id ON DELETE CASCADE, NOT NULL
  author_id         uuid FK profiles.id ON DELETE CASCADE, NOT NULL
  parent_comment_id uuid FK post_comments.id ON DELETE CASCADE, nullable
                                                  -- null = top-level; reply points to top-level
  body              text NOT NULL
  created_at        timestamptz NOT NULL default now()
  updated_at        timestamptz NOT NULL default now()   -- trigger post_comments_set_updated_at
  INDEX idx_post_comments_post ON (post_id)
```

After migration: run `npm run db:types` to regenerate `src/types/database.ts` (§4).

---

## 4. Storage layer — `src/lib/storage.ts`

All Supabase Storage access is confined to one module. The Moments service never
calls Storage directly (anti-lock-in; mirrors D16 `lib/` isolation).

```typescript
uploadTripMedia(supabase, { tripId, postId, file }) -> { storagePath, mediaType }
createSignedMediaUrl(supabase, storagePath) -> string   // time-limited signed URL
deleteTripMedia(supabase, storagePaths[])               // called on post delete
```

- **Bucket `trip-media`, private** (not public). Reads go through **signed URLs**,
  so media is not accessible to outsiders even with the URL — this is what makes
  "private to members" enforced at the file level, not just the UI.
- **Path convention:** `trips/{tripId}/posts/{postId}/{uuid}.{ext}`.
- **Upload validation** (in the server action): MIME type (`image/*`, `video/*`),
  size limits (**photo ≤ 10MB, video ≤ 100MB**), and **≤ 10 media per post**.
- **Video thumbnail:** captured **client-side** before upload (canvas frame from a
  `<video>` element), uploaded as `thumbnail_path`. No server transcoding in v1.

---

## 5. Service layer — `src/services/post.service.ts`

Follows §5/§7: every function takes `userId`, asserts authorization, then touches
the DB. Reuses existing guards (`assertTripMember`, `assertTripEditor`) plus two
small new helpers.

```typescript
// Read (all members, incl. viewer)
listPosts(supabase, userId, tripId)         // assertTripMember -> feed + media + counts
getPost(supabase, userId, postId)           // assertTripMember (via the post's trip)

// Write post (owner & editor)
createPost(supabase, userId, input)         // assertTripEditor; insert post + post_media;
                                            //   rollback if media insert fails (createTrip pattern, §5.6)
updatePost(supabase, userId, postId, input) // assertPostAuthorOrTripOwner; edit caption/location/media
deletePost(supabase, userId, postId)        // assertPostAuthorOrTripOwner;
                                            //   delete Storage files FIRST, then DB rows

// Like
toggleReaction(supabase, userId, postId)    // assertTripEditor; insert/delete reaction row

// Comments (owner & editor; 1-level replies)
addComment(supabase, userId, postId, body, parentId?)  // assertTripEditor;
                                            //   if parentId points to a reply, use its top-level parent (flatten)
deleteComment(supabase, userId, commentId)  // assertCommentAuthorOrTripOwner
```

New guard helpers (mirror `assertTripOwner` style):
- **`assertPostAuthorOrTripOwner`** — allowed if you are the post author OR the trip owner.
- **`assertCommentAuthorOrTripOwner`** — same, for comments.

Enforced invariants (into the spec, re-checked server-side):
- **Non-empty post:** must have `body` OR ≥ 1 media — enforced in Zod refine AND
  re-checked in the service (mirrors split validation, D15).
- **Reply flattening:** `addComment` resolves any `parentId` to its top-level
  ancestor, so the DB can never store a thread deeper than one level.
- **Delete order:** `deletePost` deletes the Storage files first, then the DB rows
  (`ON DELETE CASCADE` removes child `post_media`/`reactions`/`comments`). Doing
  files-first avoids leaving orphaned objects in the bucket that no DB row points to.

---

## 6. Routes & UI components

Follows the per-feature pattern: one route under `trips/[id]/`, one `actions.ts`,
components under `features/`.

```
src/app/(app)/trips/[id]/moments/
  page.tsx        -- Server Component: listPosts() -> feed + "New Moment" button
  actions.ts      -- server actions (§7 template: Zod -> getUser -> service -> revalidatePath)
```

Server actions (each starts with `getUser()` + auth check, §5 non-negotiable):
`createPostAction`, `updatePostAction`, `deletePostAction`, `toggleReactionAction`,
`addCommentAction`, `deleteCommentAction`.

```
src/components/features/moments/
  moment-feed.tsx            -- list of cards (Server Component; receives posts from page)
  moment-card.tsx            -- one post: author header, caption, location, gallery, action row
  media-gallery.tsx          -- LINE-style grid: shows <=5 media; extra behind "+N" overlay;
                                 click -> lightbox; video shows poster + duration badge
  media-lightbox.tsx         -- 'use client'; full-screen viewer, all media, thumbnail strip,
                                 video playback
  new-moment-dialog.tsx      -- create form (uncontrolled, §7); pick files + caption + location
  edit-moment-dialog.tsx     -- edit form (controlled + reset-on-open, §7)
  moment-actions-menu.tsx    -- ... menu (Edit/Delete) via buttonVariants, NOT <Trigger asChild> (§8)
  like-button.tsx            -- 'use client'; optimistic toggle; shows like count
  comment-section.tsx        -- 'use client'; collapsed by default; expands to thread +
                                 1-level replies + compose box
  media-meta.ts              -- constants (size/count limits, type labels) — *-meta.ts pattern
```

Integration & UX notes:
- Add a **"Moments"** tab to the trip detail nav (`trips/[id]/layout.tsx`), level
  with Itinerary / Bookings / Expenses / Members.
- **Media grid:** feed renders up to 5 media; if more, the last tile becomes a
  "+N" overlay. Grid layout adapts to count (1 full, 2 side-by-side, 3/4/5
  LINE-style arrangement).
- **Lightbox:** clicking any media opens a full-screen viewer with all media and a
  thumbnail strip; video plays here.
- **Comments collapsed** by default ("View N comments"); expand on click.
- **Optimistic UI** for like and comment so the acting member gets instant
  feedback (stand-in for deferred realtime).
- Upload uses `File`/multipart via server action (FormData); if portaled Dialog
  causes `formData` quirks, that is the §8 "forms inside Dialog" caveat.
- Author avatar/name come from `profiles` via join (same pattern as `paid_by` in
  expenses).
- **Viewer** role: composer and like/comment controls are hidden; read-only feed.

---

## 7. Testing (Level 1, §10)

Only the critical layer — service authorization + Zod + pure utils. No component
or upload tests.

```
tests/services/post.service.test.ts
  - assertPostAuthorOrTripOwner: author ok, owner ok, other denied
  - assertCommentAuthorOrTripOwner: same
  - createPost: viewer denied (assertTripEditor); empty post (no body + no media) denied
  - addComment: reply-to-a-reply flattens to top-level parent
tests/schemas/post.schema.test.ts
  - createPostSchema: reject empty body + empty media; accept either; caption length limit
  - commentSchema: reject empty body; length limit
tests/lib/storage.test.ts (optional, pure logic only)
  - path convention + type/size validation (pure functions, no real Storage)
```

Verify with `npx tsc --noEmit` + `npm run test` + `npm run lint` — **not**
`npm run build` (§8: build clobbers a running dev server).

---

## 8. Build sequence (high level)

1. Migration (`posts`, `post_media`, `post_reactions`, `post_comments`, enum,
   triggers, indexes) → `supabase db push` → `npm run db:types`.
2. `src/lib/storage.ts` + create the private `trip-media` bucket.
3. `src/services/post.service.ts` (Zod schemas + service fns + guard helpers).
4. Level 1 tests for service + schemas.
5. `trips/[id]/moments/actions.ts` server actions.
6. `features/moments/` components + `moments/page.tsx`.
7. Add "Moments" tab to trip detail nav.
8. Manual smoke test; `tsc --noEmit` + `test` + `lint`.

---

## 9. Open questions / future hooks

- **Realtime:** subscribe to `post_*` tables via Supabase Realtime when desired —
  additive, no schema change.
- **Public sharing:** flip `visibility` to allow `'public'`; add a share route.
- **Reactions beyond like:** add `type` to `post_reactions`.
- **Map:** add nullable `location_lat`/`location_lng` to `posts`.
- **Music:** if ever, a single nullable `audio_url` (Spotify/YouTube link only).
