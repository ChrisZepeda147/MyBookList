-- Authoritative server clock for streak day boundaries (immune to client clock skew).
create or replace function public.server_now()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select now();
$$;

grant execute on function public.server_now() to authenticated;
grant execute on function public.server_now() to anon;
