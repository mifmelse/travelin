-- =========================================
-- TRAVELIN: Authorization Strategy
-- =========================================
-- This project uses APP-LEVEL authorization instead of RLS.
-- All data access is mediated by Server Components and Server Actions
-- that check user authentication and ownership before any query.
--
-- See:
--   - src/services/trip.service.ts (ownership checks)
--   - src/services/profile.service.ts (lazy profile creation)
--   - src/app/(app)/layout.tsx (auth gating for all protected routes)
--
-- RLS is INTENTIONALLY disabled. Do not re-enable without
-- updating service layer to remove redundant ownership checks.

-- Ensure RLS is disabled on all tables
alter table public.profiles disable row level security;
alter table public.trips disable row level security;
alter table public.trip_members disable row level security;
alter table public.bookings disable row level security;
alter table public.itinerary_items disable row level security;
alter table public.expenses disable row level security;
alter table public.expense_splits disable row level security;