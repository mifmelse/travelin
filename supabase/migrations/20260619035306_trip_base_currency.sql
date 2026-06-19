-- Add a base currency per trip, used to aggregate multi-currency expenses into a
-- single grand total. Expenses keep their own `currency` + optional manual
-- `exchange_rate`; the trip's base_currency is the target unit for conversion.
-- Default 'IDR' matches the rest of the schema's money defaults.

alter table public.trips
  add column base_currency text not null default 'IDR';
