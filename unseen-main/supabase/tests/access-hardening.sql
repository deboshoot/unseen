-- Run AFTER access-hardening.sql, inside a transaction ending in ROLLBACK.
-- Exercise policies with the same PostgREST roles and JWT claims as the app.
create temp table unseen_access_test as
select
  (select id from auth.users where lower(email)='deboshoot@gmail.com') as admin_id,
  'b01c6977-ded3-43f7-98de-8dbfd45d07d7'::uuid as user_id,
  (select count(*) from public.profiles) as profile_count,
  (select id from public.opere where status='accepted' order by id limit 1) as artwork_1,
  (select id from public.opere where status='accepted' order by id offset 1 limit 1) as artwork_2,
  (select id from public.opere where status='accepted' order by id offset 2 limit 1) as artwork_3,
  gen_random_uuid() as pending_id,gen_random_uuid() as active_id,
  gen_random_uuid() as future_id,gen_random_uuid() as expired_id,
  gen_random_uuid() as final_id,gen_random_uuid() as gallery_id;
grant select on unseen_access_test to anon,authenticated;

select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$
declare accepted bigint;
begin
  if public.is_unseen_admin() then raise exception 'Anonymous became admin'; end if;
  begin
    perform 1 from public.profiles limit 1;
    raise exception 'Anonymous can read profiles';
  exception when insufficient_privilege then null;
  end;
  if exists(select 1 from public.opere where status is distinct from 'accepted' and not coalesce(is_in_gallery,false)) then raise exception 'Private artworks visible'; end if;
  begin
    insert into public.opere(id,titolo,status) select pending_id,'UNSEEN access dry run','accepted' from unseen_access_test;
    raise exception 'Anonymous can auto approve';
  exception when insufficient_privilege then null;
  end;
  insert into public.opere(id,titolo,autore,status,is_in_gallery)
    select pending_id,'UNSEEN access dry run','Dry run','pending',false from unseen_access_test;
  begin
    perform public.cast_vote((select active_id from unseen_access_test),1::smallint);
    raise exception 'Anonymous can call voting RPC';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated','email','deboshoot@gmail.com')::text,true) from unseen_access_test;
set local role authenticated;
do $$
declare t record; affected bigint;
begin
  select * into t from unseen_access_test;
  if not public.is_unseen_admin() then raise exception 'Dashboard admin denied'; end if;
  if (select count(*) from public.profiles)<>t.profile_count then raise exception 'Admin profile statistics incomplete'; end if;
  update public.opere set status='accepted' where id=t.pending_id;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Admin moderation denied'; end if;
  delete from public.opere where id=t.pending_id;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Admin artwork deletion denied'; end if;
  insert into public.duels(id,champion_id,challenger_id,start_at,end_at,is_active,votes_champion,votes_challenger)
    values(t.active_id,t.artwork_1,t.artwork_2,now()-interval '1 minute',now()+interval '13 hours',true,0,0),
          (t.future_id,t.artwork_2,t.artwork_1,now()+interval '3 days',now()+interval '5 days',true,0,0),
          (t.expired_id,t.artwork_1,t.artwork_2,now()-interval '2 days',now()-interval '1 day',true,0,0);
  if not exists(select 1 from public.duels where id=t.future_id and champion_id=t.artwork_2 and challenger_id=t.artwork_1 and start_at=now()+interval '3 days' and end_at=now()+interval '5 days') then raise exception 'Trigger overwrote dashboard scheduling'; end if;
  update public.duels set end_at=now()+interval '15 hours' where id=t.active_id;
  if not exists(select 1 from public.duels where id=t.active_id and end_at=now()+interval '15 hours' and champion_id=t.artwork_1) then raise exception 'Admin duel update denied'; end if;
  insert into public.final_arenas(id,artwork_1_id,artwork_2_id,artwork_3_id,start_at,end_at,is_active)
    values(t.final_id,t.artwork_1,t.artwork_2,t.artwork_3,now()-interval '1 minute',now()+interval '1 day',true);
  update public.final_arenas set unseen_choice_id=t.artwork_1,most_wins_id=t.artwork_2,last_duel_winner_id=t.artwork_3 where id=t.final_id;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Admin final awards denied'; end if;
  insert into public.gallery_months(id,month_key,month_label,winner_id,people_choice_id,jury_choice_id)
    values(t.gallery_id,'1900-01-01','UNSEEN dry run',t.artwork_1,t.artwork_2,t.artwork_3);
  update public.gallery_months set month_label='UNSEEN dry run edited' where id=t.gallery_id;
  delete from public.gallery_months where id=t.gallery_id;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Admin gallery management denied'; end if;
end;
$$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated')::text,true) from unseen_access_test;
set local role authenticated;
do $$
declare t record; affected bigint;
begin
  select * into t from unseen_access_test;
  if public.is_unseen_admin() then raise exception 'Legacy account retained admin rights'; end if;
  if exists(select 1 from public.profiles where id<>t.user_id) then raise exception 'User can read other profiles'; end if;
  begin
    insert into unseen_private.admin_accounts(user_id) values(t.user_id);
    raise exception 'User can promote self';
  exception when insufficient_privilege then null;
  end;
  update public.opere set status='rejected' where id=t.artwork_1;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Ordinary user can moderate'; end if;
  if exists(select 1 from public.duels where id=t.future_id) then raise exception 'Future duel visible'; end if;
  begin
    insert into public.votes(user_id,duel_id,vote_slot) values(t.user_id,t.active_id,'1');
    raise exception 'Direct vote insertion allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.activate_scheduled_duel();
    raise exception 'User can manage scheduled duels';
  exception when raise_exception then
    if sqlerrm<>'Administrator required' then raise; end if;
  end;
  begin
    perform public.cast_vote(t.future_id,1::smallint);
    raise exception 'Early vote accepted';
  exception when raise_exception then
    if sqlerrm<>'Duel is not active' then raise; end if;
  end;
  begin
    perform public.cast_vote(t.expired_id,1::smallint);
    raise exception 'Expired vote accepted';
  exception when raise_exception then
    if sqlerrm<>'Duel is not active' then raise; end if;
  end;
  begin
    perform public.cast_vote(t.active_id,null::smallint);
    raise exception 'NULL vote accepted';
  exception when raise_exception then
    if sqlerrm<>'Invalid vote slot' then raise; end if;
  end;
  perform public.cast_vote(t.active_id,1::smallint);
  if (select votes_champion from public.duels where id=t.active_id)<>1 then raise exception 'Vote counter incorrect'; end if;
  begin
    perform public.cast_vote(t.active_id,2::smallint);
    raise exception 'Duplicate vote accepted';
  exception when raise_exception then
    if sqlerrm<>'You have already voted in this duel' then raise; end if;
  end;
  if (select count(*) from public.votes where duel_id=t.active_id)<>1 then raise exception 'Duplicate persisted'; end if;
  begin
    perform public.cast_final_arena_vote(t.final_id,null::smallint);
    raise exception 'NULL final vote accepted';
  exception when raise_exception then
    if sqlerrm<>'Invalid artwork slot' then raise; end if;
  end;
  perform public.cast_final_arena_vote(t.final_id,2::smallint);
  if (select votes_2 from public.final_arenas where id=t.final_id)<>1 then raise exception 'Final counter incorrect'; end if;
  begin
    perform public.cast_final_arena_vote(t.final_id,3::smallint);
    raise exception 'Duplicate final vote accepted';
  exception when raise_exception then
    if sqlerrm<>'You have already voted in this final arena' then raise; end if;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated','email','deboshoot@gmail.com')::text,true) from unseen_access_test;
set local role authenticated;
do $$
declare t record;
begin
  select * into t from unseen_access_test;
  if (select count(*) from public.votes where duel_id=t.active_id)<>1 then raise exception 'Admin cannot inspect votes'; end if;
  if (select count(*) from public.final_arena_votes where final_arena_id=t.final_id)<>1 then raise exception 'Admin cannot inspect final votes'; end if;
  perform public.activate_scheduled_duel();
  if not exists(select 1 from public.duels where id=t.future_id and is_active and start_at=now()+interval '3 days' and end_at=now()+interval '5 days') then raise exception 'Admin scheduler altered future duel'; end if;
end;
$$;
reset role;
select set_config('request.jwt.claims','',true);
-- Simulate the existing postgres cron job: it must remain allowed.
select public.activate_scheduled_duel();
do $$
begin
  if (select file_size_limit from storage.buckets where id='galleria')<>5242880 then raise exception 'Upload size limit missing'; end if;
  if (select allowed_mime_types from storage.buckets where id='galleria') is null then raise exception 'Upload format limits missing'; end if;
  if not exists(select 1 from pg_constraint where conrelid='public.votes'::regclass and conname='votes_user_id_duel_id_key' and contype='u') then raise exception 'Unique vote constraint lost'; end if;
end;
$$;
