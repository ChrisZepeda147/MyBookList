-- Streak Shield rewards: earned every 5 reading days, consumed when a day is missed.

alter table public.profiles
  add column if not exists streak_shields integer not null default 0
    check (streak_shields >= 0),
  add column if not exists last_shield_milestone integer not null default 0
    check (last_shield_milestone >= 0),
  add column if not exists last_shielded_date text,
  add column if not exists shield_activated_on text;
