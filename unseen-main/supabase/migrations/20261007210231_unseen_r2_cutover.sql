-- Apply only after the production frontend uses r2-media for all new uploads.
-- Existing Supabase objects and their public read policy remain available.
drop policy if exists "UNSEEN pending photo submission" on public.opere;
drop policy if exists "UNSEEN photo upload" on storage.objects;
drop policy if exists "UNSEEN admin media" on storage.objects;
drop policy if exists "UNSEEN admin legacy media read" on storage.objects;
drop policy if exists "UNSEEN admin legacy media update" on storage.objects;
drop policy if exists "UNSEEN admin legacy media delete" on storage.objects;
create policy "UNSEEN admin legacy media read" on storage.objects for select to authenticated
  using ((select public.is_unseen_admin()) and bucket_id='galleria');
create policy "UNSEEN admin legacy media update" on storage.objects for update to authenticated
  using ((select public.is_unseen_admin()) and bucket_id='galleria')
  with check ((select public.is_unseen_admin()) and bucket_id='galleria');
create policy "UNSEEN admin legacy media delete" on storage.objects for delete to authenticated
  using ((select public.is_unseen_admin()) and bucket_id='galleria');
