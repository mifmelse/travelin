-- =========================================
-- TRAVELIN: Initial Schema
-- =========================================
-- Lazy profile creation approach: no trigger on auth.users.
-- Profile is created on-demand by app code (see services/profile.service.ts).

-- =========================================
-- PROFILES
-- =========================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  home_currency text not null default 'IDR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User profile data. Created lazily by app code on first authenticated request.';

-- =========================================
-- TRIPS
-- =========================================
create type trip_status as enum ('planning', 'ongoing', 'completed', 'archived');

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  start_date date,
  end_date date,
  destination text,
  status trip_status not null default 'planning',
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_date_check check (end_date is null or start_date is null or end_date >= start_date)
);

create index idx_trips_owner on public.trips(owner_id);
create index idx_trips_status on public.trips(status);

-- =========================================
-- TRIP MEMBERS
-- =========================================
create type trip_role as enum ('owner', 'editor', 'viewer');

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role trip_role not null default 'viewer',
  joined_at timestamptz not null default now(),
  unique(trip_id, profile_id)
);

create index idx_trip_members_trip on public.trip_members(trip_id);
create index idx_trip_members_profile on public.trip_members(profile_id);

-- =========================================
-- AUTO-ADD OWNER AS MEMBER (this trigger is OK — owned by postgres)
-- =========================================
create or replace function public.handle_new_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_members (trip_id, profile_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

-- =========================================
-- BOOKINGS
-- =========================================
create type booking_type as enum ('flight', 'lodging', 'activity', 'transport', 'other');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  type booking_type not null,
  provider text,
  confirmation_code text,
  amount_cents bigint,
  currency text default 'IDR',
  booked_at timestamptz,
  attachments jsonb default '[]'::jsonb,
  raw_email_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bookings_trip on public.bookings(trip_id);

-- =========================================
-- ITINERARY ITEMS
-- =========================================
create type itinerary_item_type as enum (
  'flight', 'lodging', 'activity', 'transport', 'meal', 'note'
);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  type itinerary_item_type not null,
  title text not null,
  start_at timestamptz,
  end_at timestamptz,
  location_name text,
  location_lat numeric(10, 7),
  location_lng numeric(10, 7),
  details jsonb default '{}'::jsonb,
  booking_id uuid references public.bookings(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint itinerary_items_time_check check (end_at is null or start_at is null or end_at >= start_at)
);

create index idx_itinerary_trip on public.itinerary_items(trip_id);
create index idx_itinerary_start on public.itinerary_items(start_at);

-- =========================================
-- EXPENSES
-- =========================================
create type expense_category as enum (
  'food', 'transport', 'lodging', 'activity', 'shopping', 'other'
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  paid_by uuid not null references public.profiles(id),
  amount_cents bigint not null,
  currency text not null default 'IDR',
  exchange_rate numeric(20, 10),
  category expense_category not null default 'other',
  description text,
  occurred_at timestamptz not null default now(),
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_expenses_trip on public.expenses(trip_id);
create index idx_expenses_paid_by on public.expenses(paid_by);

-- =========================================
-- EXPENSE SPLITS
-- =========================================
create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  share_cents bigint not null,
  settled boolean not null default false,
  settled_at timestamptz,
  unique(expense_id, profile_id)
);

create index idx_splits_expense on public.expense_splits(expense_id);
create index idx_splits_profile on public.expense_splits(profile_id);

-- =========================================
-- UPDATED_AT TRIGGERS
-- =========================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trips_set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();

create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

create trigger itinerary_items_set_updated_at before update on public.itinerary_items
  for each row execute function public.set_updated_at();

create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();