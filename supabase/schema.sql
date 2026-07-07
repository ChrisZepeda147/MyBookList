-- MyBookList Supabase schema (same as supabase/migrations/20260324120000_auth_profiles_books.sql)
-- Paste into the Supabase SQL editor and run once per project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Bookworm',
  avatar_url text not null default '',
  bio text not null default 'Tracking my reading journey one page at a time.',
  reading_goal integer not null default 24 check (reading_goal > 0),
  monthly_reading_goal integer not null default 2 check (monthly_reading_goal > 0),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

do $$ begin
  create type public.reading_status as enum (
    'reading', 'completed', 'on_hold', 'dnf', 'plan_to_read'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text not null,
  cover_url text,
  description text,
  page_count integer,
  page_count_locked boolean not null default false,
  current_page integer check (current_page is null or current_page > 0),
  api_categories text[] not null default '{}',
  categories text[] not null default '{}',
  status public.reading_status not null default 'plan_to_read',
  rating numeric(3,1) check (rating is null or (rating >= 0 and rating <= 5)),
  date_completed timestamptz,
  added_at timestamptz not null default now(),
  google_books_id text
);

create index if not exists user_books_user_id_idx on public.user_books(user_id);
create index if not exists user_books_status_idx on public.user_books(status);
create index if not exists user_books_added_at_idx on public.user_books(added_at desc);

alter table public.user_books enable row level security;

drop policy if exists "Users can view own books" on public.user_books;
create policy "Users can view own books"
  on public.user_books for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own books" on public.user_books;
create policy "Users can insert own books"
  on public.user_books for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own books" on public.user_books;
create policy "Users can update own books"
  on public.user_books for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own books" on public.user_books;
create policy "Users can delete own books"
  on public.user_books for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), 'Bookworm')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Reading session log (timed sessions and manual page logs)
create table if not exists public.reading_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid references public.user_books(id) on delete set null,
  book_title text not null,
  book_author text not null,
  start_page integer not null check (start_page > 0),
  end_page integer not null check (end_page >= start_page),
  pages_read integer not null check (pages_read >= 0),
  seconds_read integer not null check (seconds_read >= 0),
  minutes_read numeric(8, 2) not null,
  pages_per_hour numeric(8, 1) not null default 0,
  session_date timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists reading_sessions_user_id_idx
  on public.reading_sessions(user_id);

create index if not exists reading_sessions_user_session_date_idx
  on public.reading_sessions(user_id, session_date desc);

alter table public.reading_sessions enable row level security;

drop policy if exists "Users can view own reading sessions" on public.reading_sessions;
create policy "Users can view own reading sessions"
  on public.reading_sessions for select using (auth.uid() = user_id);

drop policy if exists "Authenticated users can view all reading sessions" on public.reading_sessions;
create policy "Authenticated users can view all reading sessions"
  on public.reading_sessions for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own reading sessions" on public.reading_sessions;
create policy "Users can insert own reading sessions"
  on public.reading_sessions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own reading sessions" on public.reading_sessions;
create policy "Users can update own reading sessions"
  on public.reading_sessions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reading sessions" on public.reading_sessions;
create policy "Users can delete own reading sessions"
  on public.reading_sessions for delete using (auth.uid() = user_id);
