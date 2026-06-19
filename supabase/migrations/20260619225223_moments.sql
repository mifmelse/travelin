-- Moments: per-trip documentation feed (posts + media + likes + comments).
-- App-level authorization only (AGENTS.md §5): RLS stays disabled on these tables.

create type post_media_type as enum ('image', 'video');

-- A post: text + optional location, authored by a trip member.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text,
  location_name text,
  -- Social-ready hook: only 'trip' for now. Add 'public' later, no rebuild.
  visibility text not null default 'trip' check (visibility in ('trip')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_posts_trip_created on public.posts(trip_id, created_at desc);

-- Ordered media attached to a post. First-class rows (not jsonb).
create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_type post_media_type not null,
  storage_path text not null,
  thumbnail_path text,
  position int not null,
  created_at timestamptz not null default now()
);

create index idx_post_media_post on public.post_media(post_id);

-- Like: single toggle, one per member per post.
create table public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, profile_id)
);

create index idx_post_reactions_post on public.post_reactions(post_id);

-- Comments with one level of replies (parent points to a top-level comment).
create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.post_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_post_comments_post on public.post_comments(post_id);

-- Reuse the shared updated_at trigger function used by other tables.
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create trigger post_comments_set_updated_at
  before update on public.post_comments
  for each row execute function public.set_updated_at();

-- App-level authorization only (AGENTS.md §5): RLS disabled.
alter table public.posts disable row level security;
alter table public.post_media disable row level security;
alter table public.post_reactions disable row level security;
alter table public.post_comments disable row level security;

-- Private bucket for trip media. Reads go through server-generated signed URLs.
insert into storage.buckets (id, name, public)
values ('trip-media', 'trip-media', false)
on conflict (id) do nothing;

-- Storage policies: allow the authenticated role full access to this bucket.
-- Actual authorization is the service layer (membership is asserted before any
-- storage_path is ever signed or handed to a client). Consistent with §5 — the
-- DB/storage is not the gate; the app is. A signed URL works until it expires.
create policy "trip-media authenticated read"
  on storage.objects for select to authenticated
  using (bucket_id = 'trip-media');

create policy "trip-media authenticated insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-media');

create policy "trip-media authenticated update"
  on storage.objects for update to authenticated
  using (bucket_id = 'trip-media');

create policy "trip-media authenticated delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'trip-media');
