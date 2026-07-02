-- Persist photo bookshelf spine positions per user (syncs across devices).
alter table public.profiles
  add column if not exists shelf_layout jsonb not null default '{"placed":[]}'::jsonb;
