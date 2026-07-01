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
  on public.reading_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own reading sessions" on public.reading_sessions;
create policy "Users can insert own reading sessions"
  on public.reading_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own reading sessions" on public.reading_sessions;
create policy "Users can update own reading sessions"
  on public.reading_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reading sessions" on public.reading_sessions;
create policy "Users can delete own reading sessions"
  on public.reading_sessions for delete
  using (auth.uid() = user_id);
