-- Rehearsal only: caller wraps this file in BEGIN ... ROLLBACK.
insert into auth.users(id,email,raw_user_meta_data) values('a0000000-0000-4000-8000-000000000099','unseen-r2-sql-fixture@example.invalid','{}');
set local role service_role;
select public.r2_reserve_upload('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000099','photo',
  '{"titolo":"R2 integration fixture","autore":"UNSEEN TEST","storia":"","social_link":""}',
  '[{"id":"a0000000-0000-4000-8000-000000000010","kind":"image","mime":"image/png","bytes":100,"key":"assets/a0000000-0000-4000-8000-000000000010/image.png","uploadKey":"incoming/a0000000-0000-4000-8000-000000000001/image.png"}]');
select public.r2_complete_upload('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000099','unseen-uploads','{"a0000000-0000-4000-8000-000000000010":"test-etag"}','https://media.example');
select public.r2_complete_upload('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000099','unseen-uploads','{}','https://media.example');
do $$ begin
  if (select count(*) from public.opere where id='a0000000-0000-4000-8000-000000000001')<>1 then raise exception 'Duplicate photo'; end if;
  if (select status from public.opere where id='a0000000-0000-4000-8000-000000000001')<>'pending' then raise exception 'Photo not pending'; end if;
  if (select is_public from public.media_assets where id='a0000000-0000-4000-8000-000000000010') then raise exception 'Media prematurely public'; end if;
  if not public.r2_claim_operation('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000011') then raise exception 'Lease not acquired'; end if;
  if public.r2_claim_operation('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000012') then raise exception 'Parallel lease acquired'; end if;
end; $$;
reset role;
-- Four further reservations reach the rolling daily quota, including failed ones.
set local role service_role;
do $$ declare i integer; begin
  for i in 1..4 loop
    perform public.r2_reserve_upload(gen_random_uuid(),'a0000000-0000-4000-8000-000000000099','photo',
      '{"titolo":"Quota fixture","autore":"TEST"}',
      '[{"id":"a0000000-0000-4000-8000-000000000020","kind":"image","mime":"image/png","bytes":100,"key":"assets/a0000000-0000-4000-8000-000000000020/image.png","uploadKey":"incoming/a0000000-0000-4000-8000-000000000001/image.png"}]');
  end loop;
  update public.r2_uploads set state='expired' where user_id='a0000000-0000-4000-8000-000000000099' and state='prepared';
  begin
    perform public.r2_reserve_upload(gen_random_uuid(),'a0000000-0000-4000-8000-000000000099','photo','{}','[]');
    raise exception 'Daily quota bypassed after expiration';
  exception when raise_exception then if sqlerrm not like 'Limite giornaliero%' then raise; end if; end;
end; $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
  if exists(select 1 from public.opere where id='a0000000-0000-4000-8000-000000000001') then raise exception 'Private photo leaked'; end if;
  begin perform count(*) from public.r2_uploads; raise exception 'Upload sessions readable'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.media_assets; raise exception 'Private assets readable'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"a0000000-0000-4000-8000-000000000099"}',true);
do $$ begin
  if public.is_unseen_admin() then raise exception 'Ordinary user privileged'; end if;
  if (select count(*) from public.media_assets where id='a0000000-0000-4000-8000-000000000010')<>1 then raise exception 'Owner metadata unavailable'; end if;
  begin perform public.r2_complete_upload('a0000000-0000-4000-8000-000000000001',auth.uid(),'evil','{}','https://evil.example'); raise exception 'Client can finalize'; exception when insufficient_privilege then null; end;
  begin insert into public.opere(titolo,status,media_asset_id) values('Forged reference','pending','a0000000-0000-4000-8000-000000000010'); raise exception 'Client can forge asset references'; exception when insufficient_privilege then null; end;
  update public.opere set status='accepted' where id='a0000000-0000-4000-8000-000000000001';
end; $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(select id from auth.users where lower(email)='deboshoot@gmail.com'))::text,true);
set local role authenticated;
do $$ begin
  if not public.is_unseen_admin() then raise exception 'Confirmed admin denied'; end if;
  if not exists(select 1 from public.opere where id='a0000000-0000-4000-8000-000000000001' and status='pending') then raise exception 'Private admin review denied'; end if;
  begin update public.opere set status='accepted' where id='a0000000-0000-4000-8000-000000000001'; raise exception 'Raw R2 approval bypassed'; exception when raise_exception then if sqlerrm not like 'Use R2 moderation%' then raise; end if; end;
  update public.opere set titolo='Edited by admin' where id='a0000000-0000-4000-8000-000000000001';
end; $$;
reset role;
set local role service_role;
select public.r2_set_moderation('photo','a0000000-0000-4000-8000-000000000001','accepted','unseen-media',true);
do $$ begin
  if not exists(select 1 from public.r2_delete_jobs where bucket='unseen-uploads' and object_key='assets/a0000000-0000-4000-8000-000000000010/image.png') then raise exception 'Old copy cleanup not queued atomically'; end if;
end; $$;
reset role;
set local role anon;
do $$ begin
  if not exists(select 1 from public.opere where id='a0000000-0000-4000-8000-000000000001' and status='accepted') then raise exception 'Published photo unavailable'; end if;
end; $$;
reset role;
set local role service_role;
delete from public.opere where id='a0000000-0000-4000-8000-000000000001';
do $$ begin
  if exists(select 1 from public.media_assets where id='a0000000-0000-4000-8000-000000000010') then raise exception 'Deleted artwork metadata orphan'; end if;
  if not exists(select 1 from public.r2_delete_jobs where bucket='unseen-media') then raise exception 'Deleted media cleanup not queued'; end if;
end; $$;
reset role;
