-- Run inside BEGIN/ROLLBACK. All permission checks use application roles.
create temp table second_admin_test as select
  (select id from auth.users where lower(email)='irushadissanayake2@gmail.com') as new_admin,
  (select id from auth.users where lower(email)='deboshoot@gmail.com') as original_admin,
  (select id from auth.users where id not in(select user_id from unseen_private.admin_accounts) order by id limit 1) as ordinary_user,
  (select count(*) from public.profiles) as profile_count,
  gen_random_uuid() as photo_id,gen_random_uuid() as track_id,gen_random_uuid() as cover_id,gen_random_uuid() as audio_id;
grant select on second_admin_test to authenticated;
insert into public.opere(id,titolo,autore,status,is_in_gallery)
select photo_id,'UNSEEN temporary admin check','TEST','pending',false from second_admin_test;
insert into public.media_assets(id,owner_id,bucket,object_key,kind,mime_type,bytes,etag)
select cover_id,ordinary_user,'unseen-uploads','assets/'||cover_id||'/cover.png','cover','image/png',100,'test' from second_admin_test
union all select audio_id,ordinary_user,'unseen-uploads','assets/'||audio_id||'/audio.wav','audio','audio/wav',100,'test' from second_admin_test;
insert into public.music_tracks(id,user_id,title,artist,cover_url,audio_url,status,cover_asset_id,audio_asset_id)
select track_id,ordinary_user,'UNSEEN temporary admin check','TEST','https://example.invalid/cover.jpg','https://example.invalid/audio.wav','pending',cover_id,audio_id from second_admin_test;

select set_config('request.jwt.claims',jsonb_build_object('sub',new_admin,'role','authenticated')::text,true) from second_admin_test;
set local role authenticated;
do $$
declare t record; affected bigint;
begin
  select * into t from second_admin_test;
  if not public.is_unseen_admin() then raise exception 'New administrator denied'; end if;
  if (select count(*) from public.profiles)<>t.profile_count then raise exception 'Admin statistics restricted'; end if;
  perform public.get_admin_community(0,0);
  update public.opere set status='accepted' where id=t.photo_id;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Admin photo moderation denied'; end if;
  if not exists(select 1 from public.music_tracks where id=t.track_id and status='pending') then raise exception 'Admin music review denied'; end if;
  if (select count(*) from public.media_assets where id in(t.cover_id,t.audio_id))<>2 then raise exception 'Admin private media review denied'; end if;
end; $$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',original_admin,'role','authenticated')::text,true) from second_admin_test;
set local role authenticated;
do $$ begin if not public.is_unseen_admin() then raise exception 'Original administrator lost access'; end if; end; $$;
reset role;

-- A forged administrator email claim cannot promote another account.
select set_config('request.jwt.claims',jsonb_build_object('sub',ordinary_user,'role','authenticated','email','irushadissanayake2@gmail.com')::text,true) from second_admin_test;
set local role authenticated;
do $$
begin
  if public.is_unseen_admin() then raise exception 'Ordinary user promoted'; end if;
  begin
    insert into unseen_private.admin_accounts(user_id) select ordinary_user from second_admin_test;
    raise exception 'Ordinary user can promote self';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin if public.is_unseen_admin() then raise exception 'Anonymous promoted'; end if; end; $$;
reset role;
