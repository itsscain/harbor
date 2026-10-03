-- Child photos: scope storage policies to the uploader's OWN children.
-- Before: SELECT was granted to PUBLIC (anyone could list every family's child photos) and
-- INSERT/UPDATE/DELETE to ANY signed-in user (a parent could overwrite or delete another family's
-- photos). Uploads live at "<child_id>/avatar-<ts>.<ext>". Public object URLs for this public
-- bucket are served without RLS, so the wall + app keep displaying photos unchanged.
drop policy if exists child_photos_read on storage.objects;
drop policy if exists child_photos_insert on storage.objects;
drop policy if exists child_photos_update on storage.objects;
drop policy if exists child_photos_delete on storage.objects;

create policy child_photos_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'child-photos'
    and exists (
      select 1 from public.children ch
      where ch.id::text = (storage.foldername(name))[1]
        and public.household_is_mine(ch.household_id)
    )
  );

create policy child_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'child-photos'
    and exists (
      select 1 from public.children ch
      where ch.id::text = (storage.foldername(name))[1]
        and public.household_is_mine(ch.household_id)
    )
  );

create policy child_photos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'child-photos'
    and exists (
      select 1 from public.children ch
      where ch.id::text = (storage.foldername(name))[1]
        and public.household_is_mine(ch.household_id)
    )
  )
  with check (
    bucket_id = 'child-photos'
    and exists (
      select 1 from public.children ch
      where ch.id::text = (storage.foldername(name))[1]
        and public.household_is_mine(ch.household_id)
    )
  );

create policy child_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'child-photos'
    and exists (
      select 1 from public.children ch
      where ch.id::text = (storage.foldername(name))[1]
        and public.household_is_mine(ch.household_id)
    )
  );
