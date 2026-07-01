alter table public.profiles
  add column if not exists shield_offer_dismissed_for text;
