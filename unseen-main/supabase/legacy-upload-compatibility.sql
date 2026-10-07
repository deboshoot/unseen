-- Temporary compatibility while the original Vercel URL still serves its old
-- frontend. Remove with r2-cutover.sql only after its public redirect works.
drop policy if exists "UNSEEN pending photo submission" on public.opere;
create policy "UNSEEN pending photo submission" on public.opere for insert to anon,authenticated
  with check(status='pending' and not coalesce(is_in_gallery,false) and coalesce(voti,0)=0 and duello_fine is null and media_asset_id is null and owner_id is null);
drop policy if exists "UNSEEN photo upload" on storage.objects;
create policy "UNSEEN photo upload" on storage.objects for insert to anon,authenticated
  with check(bucket_id='galleria');
