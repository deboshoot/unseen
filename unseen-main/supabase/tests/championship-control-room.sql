-- Runs after championship.sql tests, inside the same rollback-only transaction.
do $$ declare cid uuid:=(select val from championship_test_state where key='main'); begin
  if (select votes_2 from public.championship_matches where championship_id=cid and number=1)<>1 then raise exception 'Vote counted incorrectly'; end if;
  if (select count(*) from public.championship_gallery where championship_id=cid)<>1 then raise exception 'Photo champion not published exactly once'; end if;
  if not exists(select 1 from public.championship_gallery g join public.championships c on c.id=g.championship_id where c.id=cid and g.entry_id=c.winner_id and g.month_key=date_trunc('month',c.start_at at time zone 'Europe/Rome')::date) then raise exception 'Wrong photo gallery month'; end if;
end; $$;

select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ declare result jsonb; begin
  result:=public.get_championship('music',(select val from championship_test_state where key='music'));
  if result->'matches'->0->>'votes_1' is not null or result->'matches'->0->>'votes_2' is not null then raise exception 'Unfinished scores leaked through RPC'; end if;
  begin perform votes_1 from public.championship_matches; raise exception 'REST score read allowed'; exception when insufficient_privilege then null; end;
  begin perform id from public.championship_matches where votes_2>0; raise exception 'Score filter allowed'; exception when insufficient_privilege then null; end;
  result:=public.get_championship('photo',(select val from championship_test_state where key='main'));
  if (result->'matches'->0->>'votes_2')::integer<>1 then raise exception 'Final result hidden after closure'; end if;
  if (result->'matches'->0->>'results_available')::boolean is not true then raise exception 'Results availability wrong'; end if;
  if not exists(select 1 from public.championship_gallery where championship_id=(select val from championship_test_state where key='main')) then raise exception 'Published photo champion invisible'; end if;
  begin perform public.get_admin_overview(); raise exception 'Anonymous overview allowed'; exception when insufficient_privilege then null; end;
end; $$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(select id from auth.users where lower(email)='irushadissanayake2@gmail.com'))::text,true);
set local role authenticated;
do $$ declare result jsonb; begin
  result:=public.get_championship('music',(select val from championship_test_state where key='music'));
  if (result->'matches'->0->>'votes_1')::integer<>0 then raise exception 'Admin live score unavailable'; end if;
  if public.get_admin_overview()->>'users' is null then raise exception 'Admin overview unavailable'; end if;
end; $$;
reset role;

-- Rome starts in April, ends in May: archive must use the starting month.
update public.championships set start_at='2026-03-31 22:30:00+00',end_at='2026-03-31 22:30:00+00'::timestamptz+interval '720 hours'
where id=(select val from championship_test_state where key='music');
update public.championship_matches set start_at='2026-03-31 22:30:00+00'::timestamptz+(number-1)*interval '48 hours',end_at='2026-03-31 22:30:00+00'::timestamptz+number*interval '48 hours'
where championship_id=(select val from championship_test_state where key='music');
select public.tick_championships();
select public.tick_championships();
do $$ declare cid uuid:=(select val from championship_test_state where key='music'); begin
  if not exists(select 1 from public.championship_gallery where championship_id=cid and kind='music' and month_key='2026-04-01') then raise exception 'Music gallery not associated with Rome starting month'; end if;
  if (select count(*) from public.championship_gallery where championship_id=cid)<>1 then raise exception 'Duplicate gallery publication'; end if;
  if (select end_at from public.championships where id=cid)<>(select end_at from public.championship_matches where championship_id=cid and number=15) then raise exception 'End differs from final deadline'; end if;
  begin update public.music_tracks set status='rejected' where id=(select e.track_id from public.championship_entries e join public.championship_gallery g on g.entry_id=e.id where g.championship_id=cid); raise exception 'Gallery winner hidden'; exception when raise_exception then if sqlerrm<>'Opera vincitrice esposta nella galleria del campionato.' then raise; end if; end;
end; $$;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"b1000000-0000-4000-8000-000000000001"}',true);
set local role authenticated;
do $$ begin
  begin perform public.get_admin_overview(); raise exception 'User can read admin overview'; exception when raise_exception then if sqlerrm<>'Administrator required' then raise; end if; end;
  begin insert into public.championship_gallery(championship_id,entry_id,kind,month_key) values(gen_random_uuid(),gen_random_uuid(),'photo',current_date); raise exception 'User can publish a gallery champion'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
