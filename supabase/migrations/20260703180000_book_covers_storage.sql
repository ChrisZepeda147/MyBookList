-- User-uploaded book cover images (2 MB, images only). Paths: {user_id}/covers/{id}.{ext}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-covers',
  'book-covers',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Book covers are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'book-covers');

create policy "Users can upload their book covers"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'book-covers'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their book covers"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'book-covers'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'book-covers'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their book covers"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'book-covers'
  and auth.uid()::text = (storage.foldername(name))[1]
);
