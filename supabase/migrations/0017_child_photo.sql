-- Per-child photo avatar (Skylight-style). children rides to_jsonb(c) in
-- kiosk_snapshot, so photo_url flows to the wall automatically.
alter table public.children add column if not exists photo_url text;

-- Public bucket: the kiosk renders photos via their public URL (and falls back
-- to emoji/initial offline); parents upload from the companion app.
insert into storage.buckets (id, name, public)
values ('child-photos', 'child-photos', true)
on conflict (id) do nothing;

drop policy if exists "child_photos_read" on storage.objects;
drop policy if exists "child_photos_insert" on storage.objects;
drop policy if exists "child_photos_update" on storage.objects;
drop policy if exists "child_photos_delete" on storage.objects;

create policy "child_photos_read" on storage.objects
  for select using (bucket_id = 'child-photos');
create policy "child_photos_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'child-photos');
create policy "child_photos_update" on storage.objects
  for update to authenticated using (bucket_id = 'child-photos');
create policy "child_photos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'child-photos');
