-- Guest preview: allow anonymous read of the demo account only.

create policy "Anon can view demo preview profile"
  on public.profiles
  for select
  to anon
  using (lower(email) = lower('chriszepeda147@gmail.com'));

create policy "Anon can view demo preview books"
  on public.user_books
  for select
  to anon
  using (
    user_id in (
      select id from public.profiles
      where lower(email) = lower('chriszepeda147@gmail.com')
    )
  );

create policy "Anon can view demo preview sessions"
  on public.reading_sessions
  for select
  to anon
  using (
    user_id in (
      select id from public.profiles
      where lower(email) = lower('chriszepeda147@gmail.com')
    )
  );
