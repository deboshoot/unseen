-- Executed ONLY inside a rolled-back transaction against real schema/roles.
create temporary table championship_test_state(key text primary key,val uuid);
grant all on championship_test_state to authenticated,anon;
insert into auth.users(id,email,raw_user_meta_data) values('b0000000-0000-4000-8000-000000000099','championship-fixture@example.invalid','{}');
insert into public.opere(id,titolo,autore,immagine_url,status)
select ('b0000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Championship test '||n,'Fixture author '||n,'https://example.invalid/fixture.webp','accepted' from generate_series(1,16) n;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(select id from auth.users where lower(email)='deboshoot@gmail.com'))::text,true);
set local role authenticated;
insert into championship_test_state values('main',public.create_championship('photo','Championship SQL fixture',(select array_agg(id order by autore) from public.opere where titolo like 'Championship test %'),null));
do $$ declare cid uuid:=(select val from championship_test_state where key='main'); begin
  if (select count(*) from public.championship_entries where championship_id=cid)<>16 or (select count(*) from public.championship_matches where championship_id=cid)<>15 then raise exception 'Wrong bracket size'; end if;
  if (select end_at-start_at from public.championships where id=cid)<>interval '720 hours' then raise exception 'Wrong total duration'; end if;
  if exists(select 1 from public.championship_matches m join public.championships c on c.id=m.championship_id where c.id=cid and (m.start_at<>c.start_at+(m.number-1)*interval '48 hours' or m.end_at-m.start_at<>interval '48 hours')) then raise exception 'Wrong match schedule'; end if;
  begin perform public.create_championship('music','Invalid',array[gen_random_uuid()],null); raise exception 'Invalid size accepted'; exception when raise_exception then if sqlerrm<>'Select exactly 16 different entries' then raise; end if; end;
  begin update public.championship_matches set votes_1=999 where championship_id=cid; raise exception 'Raw score mutation allowed'; exception when insufficient_privilege then null; end;
  begin delete from public.opere where id=(select artwork_id from public.championship_entries where championship_id=cid limit 1); raise exception 'Playing artwork deleted'; exception when raise_exception then if sqlerrm not like 'Entry in an open championship%' then raise; end if; end;
end; $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
  perform public.get_championship('photo');
  begin perform public.cast_championship_vote(gen_random_uuid(),1::smallint); raise exception 'Anonymous vote allowed'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.championship_votes; raise exception 'Anonymous voter leak'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"b0000000-0000-4000-8000-000000000099"}',true);
set local role authenticated;
do $$ declare cid uuid:=(select val from championship_test_state where key='main'); mid uuid; begin
  begin perform public.create_championship('music','Forged',array[gen_random_uuid()],null); raise exception 'Nonadmin can create'; exception when raise_exception then if sqlerrm<>'Administrator required' then raise; end if; end;
  begin perform public.cancel_championship(cid); raise exception 'Nonadmin can cancel'; exception when raise_exception then if sqlerrm<>'Administrator required' then raise; end if; end;
  begin perform public.get_admin_community(); raise exception 'Community emails exposed'; exception when raise_exception then if sqlerrm<>'Administrator required' then raise; end if; end;
  begin perform public.tick_championships(); raise exception 'Client scheduler allowed'; exception when insufficient_privilege then null; end;
  select id into mid from public.championship_matches where championship_id=cid and number=2;
  begin perform public.cast_championship_vote(mid,1::smallint); raise exception 'Early voting allowed'; exception when raise_exception then if sqlerrm<>'Match not open' then raise; end if; end;
  select id into mid from public.championship_matches where championship_id=cid and number=1;
  perform public.cast_championship_vote(mid,2::smallint);
  begin perform public.cast_championship_vote(mid,1::smallint); raise exception 'Duplicate voting allowed'; exception when unique_violation then null; end;
  if (select votes_2 from public.championship_matches where id=mid)<>1 then raise exception 'Vote not counted once'; end if;
  if jsonb_array_length(public.get_championship('photo')->'my_votes')<>1 then raise exception 'Own vote absent'; end if;
end; $$;
reset role;
-- Move the test calendar only, keeping every exact 48h slot intact.
update public.championships set start_at=start_at-interval '96 hours',end_at=end_at-interval '96 hours' where id=(select val from championship_test_state where key='main');
update public.championship_matches set start_at=start_at-interval '96 hours',end_at=end_at-interval '96 hours' where championship_id=(select val from championship_test_state where key='main');
select public.tick_championships();
do $$ declare cid uuid:=(select val from championship_test_state where key='main'); begin
  if (select count(*) from public.championship_matches where championship_id=cid and winner_id is not null)<>2 then raise exception 'Wrong catchup count'; end if;
  if not exists(select 1 from public.championship_matches where championship_id=cid and number=1 and winner_id=entry_2_id and tie_break is null) then raise exception 'Higher vote lost'; end if;
  if not exists(select 1 from public.championship_matches where championship_id=cid and number=2 and winner_id=entry_1_id and tie_break='seed') then raise exception 'Seed tie failed'; end if;
  if not exists(select 1 from public.championship_matches where championship_id=cid and number=9 and entry_1_id is not null and entry_2_id is not null) then raise exception 'Quarter not populated'; end if;
end; $$;
set local role authenticated;
do $$ declare cid uuid:=(select val from championship_test_state where key='main'); mid uuid; begin
  select id into mid from public.championship_matches where championship_id=cid and number=1;
  begin perform public.cast_championship_vote(mid,1::smallint); raise exception 'Late vote allowed'; exception when raise_exception then if sqlerrm<>'Match not open' then raise; end if; end;
end; $$;
reset role;
-- Another voter cannot see voter identities, even via the aggregate RPC.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(select id from auth.users where lower(email)='deboshoot@gmail.com'))::text,true);
set local role authenticated;
do $$ begin
  if jsonb_array_length(public.get_championship('photo')->'my_votes')<>0 then raise exception 'Other voter leaked in RPC'; end if;
  if (public.get_admin_community()->'stats'->>'votes')::integer<1 then raise exception 'Community totals missing'; end if;
end; $$;
reset role;
update public.championship_matches set entry_1_id=entry_2_id,entry_2_id=entry_1_id where championship_id=(select val from championship_test_state where key='main') and number=9;
-- Catch up all remaining 13 matches in one call, propagating newly filled slots.
update public.championships set start_at=start_at-interval '720 hours',end_at=end_at-interval '720 hours' where id=(select val from championship_test_state where key='main');
update public.championship_matches set start_at=start_at-interval '720 hours',end_at=end_at-interval '720 hours' where championship_id=(select val from championship_test_state where key='main');
select public.tick_championships();
select public.tick_championships();
do $$ declare cid uuid:=(select val from championship_test_state where key='main'); begin
  if (select count(*) from public.championship_matches where championship_id=cid and winner_id is not null)<>15 then raise exception 'Catchup bracket incomplete'; end if;
  if not exists(select 1 from public.championships c join public.championship_entries e on e.id=c.winner_id where c.id=cid and c.status='completed' and e.seed=2) then raise exception 'Wrong champion'; end if;
end; $$;
-- Build the independent music bracket using 16 actual user identities.
insert into auth.users(id,email,raw_user_meta_data) select ('b1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'championship-music-'||n||'@example.invalid','{}' from generate_series(1,16) n;
insert into public.media_assets(id,owner_id,bucket,object_key,kind,mime_type,bytes,etag,is_public)
select ((case k when 'cover' then 'b3000000' else 'b4000000' end)||'-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('b1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'unseen-media','championship-fixture/'||n||'/'||k,k,case k when 'cover' then 'image/webp' else 'audio/mpeg' end,100,'fixture',true from generate_series(1,16) n cross join unnest(array['cover','audio']) k;
insert into public.music_tracks(id,user_id,title,artist,cover_url,audio_url,cover_asset_id,audio_asset_id,status) select ('b2000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('b1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Music fixture '||n,'Artist '||n,'https://example.invalid/cover.webp','https://example.invalid/audio.mp3',('b3000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('b4000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'accepted' from generate_series(1,16) n;
set local role authenticated;
insert into championship_test_state values('music',public.create_championship('music','Music test',(select array_agg(id order by id) from public.music_tracks where title like 'Music fixture %'),clock_timestamp()+interval '1 hour'));
insert into championship_test_state values('second',public.create_championship('photo','Second test',(select array_agg(id order by id) from public.opere where titolo like 'Championship test %'),clock_timestamp()+interval '1 hour'));
do $$ begin
  begin perform public.create_championship('photo','Overlapping',(select array_agg(id order by id) from public.opere where titolo like 'Championship test %'),null); raise exception 'Overlapping championship allowed'; exception when unique_violation then null; end;
  perform public.cancel_championship((select val from championship_test_state where key='second'));
end; $$;
reset role;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"b1000000-0000-4000-8000-000000000001"}',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.championship_votes) then raise exception 'Wrong test context'; end if;
end; $$;
reset role;
