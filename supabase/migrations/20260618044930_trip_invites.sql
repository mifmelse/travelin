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

-- Reuse the existing updated_at trigger function used by other tables.
create trigger trip_invites_set_updated_at
  before update on public.trip_invites
  for each row execute function public.set_updated_at();

-- App-level authorization only (AGENTS.md §5): RLS stays disabled.
alter table public.trip_invites disable row level security;
