-- Reading progress: last page reached while reading
alter table public.user_books
  add column if not exists current_page integer check (current_page is null or current_page > 0);
