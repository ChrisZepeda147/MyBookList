-- Reduce Disk IO: covering indexes + auth.uid() initplan fixes.

create index if not exists user_books_user_added_at_idx
  on public.user_books (user_id, added_at desc);

create index if not exists reading_sessions_book_id_idx
  on public.reading_sessions (book_id);

-- Wrap auth.uid() in (select ...) so Postgres evaluates it once per query.
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Authenticated already has "view all profiles"; drop duplicate own-view if present.
drop policy if exists "Users can view own profile" on public.profiles;

drop policy if exists "Users can insert own books" on public.user_books;
create policy "Users can insert own books"
  on public.user_books for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own books" on public.user_books;
create policy "Users can update own books"
  on public.user_books for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own books" on public.user_books;
create policy "Users can delete own books"
  on public.user_books for delete
  using ((select auth.uid()) = user_id);

-- Authenticated already has "view all books".
drop policy if exists "Users can view own books" on public.user_books;

drop policy if exists "Users can view own reading sessions" on public.reading_sessions;
create policy "Users can view own reading sessions"
  on public.reading_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own reading sessions" on public.reading_sessions;
create policy "Users can insert own reading sessions"
  on public.reading_sessions for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own reading sessions" on public.reading_sessions;
create policy "Users can update own reading sessions"
  on public.reading_sessions for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own reading sessions" on public.reading_sessions;
create policy "Users can delete own reading sessions"
  on public.reading_sessions for delete
  using ((select auth.uid()) = user_id);
