-- Optional manual exchange rate from a booking's currency to the trip's
-- base_currency, mirroring expenses.exchange_rate (see D15/D16). No FX API.
alter table bookings
  add column exchange_rate numeric(20, 10);
