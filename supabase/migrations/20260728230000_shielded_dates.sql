-- Remember every day bridged by a Streak Shield (not only the latest).

alter table public.profiles
  add column if not exists shielded_dates text[] not null default '{}'::text[];

-- Seed from legacy single last_shielded_date when present.
update public.profiles
set shielded_dates = array[last_shielded_date]
where last_shielded_date is not null
  and last_shielded_date <> ''
  and (shielded_dates is null or cardinality(shielded_dates) = 0);
