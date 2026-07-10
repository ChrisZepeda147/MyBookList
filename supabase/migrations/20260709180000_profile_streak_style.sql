-- Equipped streak rank style (selectable at 30+ day streak).
alter table public.profiles
  add column if not exists streak_style_id text;

comment on column public.profiles.streak_style_id is
  'Equipped streak rank style id when streak >= 30; null uses earned tier.';
