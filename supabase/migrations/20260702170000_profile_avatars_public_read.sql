-- Ensure profile avatars are visible to everyone (public bucket + read policies).

update storage.buckets
set public = true
where id = 'profile-avatars';

drop policy if exists "Profile avatars are publicly readable" on storage.objects;
create policy "Profile avatars are publicly readable"
  on storage.objects
  for select
  to public
  using (bucket_id = 'profile-avatars');

drop policy if exists "Authenticated users can view profile avatars" on storage.objects;
create policy "Authenticated users can view profile avatars"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'profile-avatars');
