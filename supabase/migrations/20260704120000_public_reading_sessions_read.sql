-- Allow signed-in users to read others' reading sessions (for public streak display).

drop policy if exists "Authenticated users can view all reading sessions" on public.reading_sessions;
create policy "Authenticated users can view all reading sessions"
  on public.reading_sessions for select
  to authenticated
  using (true);
