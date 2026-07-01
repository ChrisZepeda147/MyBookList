-- Public profile browsing: email on profiles + read-only SELECT for authenticated users.

alter table public.profiles
  add column if not exists email text;

-- Backfill emails from auth for existing accounts.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

-- Any signed-in user may read profiles (browse directory).
drop policy if exists "Authenticated users can view all profiles" on public.profiles;
create policy "Authenticated users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Any signed-in user may read book lists (browse libraries); writes stay owner-only.
drop policy if exists "Authenticated users can view all books" on public.user_books;
create policy "Authenticated users can view all books"
  on public.user_books for select
  to authenticated
  using (true);

-- Keep email in sync when accounts are created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), 'Bookworm'),
    new.email
  )
  on conflict (id) do update
  set email = excluded.email
  where public.profiles.email is distinct from excluded.email;
  return new;
end;
$$;
