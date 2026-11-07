-- Always run inside a transaction ending in ROLLBACK. The successful test vote
-- remains uncommitted and is never visible to visitors or tournament results.
create temporary table restored_vote_test as
select c.kind,c.id as cid,m.id as mid,m.votes_1,m.votes_2,
  (select f.id from public.championship_matches f where f.championship_id=c.id and f.start_at>clock_timestamp() order by f.number limit 1) as future_mid
from public.championships c join public.championship_matches m on m.championship_id=c.id
where c.status in ('running','scheduled') and m.start_at<=clock_timestamp() and m.end_at>clock_timestamp()
  and m.resolved_at is null and m.entry_1_id is not null and m.entry_2_id is not null;
grant select on restored_vote_test to authenticated,anon;
do $$ begin if (select count(*) from restored_vote_test)<>2 then raise exception 'Expected both open arenas for restoration checks'; end if; end; $$;
insert into auth.users(id,email,raw_user_meta_data) values('e0000000-0000-4000-8000-000000000099','restoration-vote-check@example.invalid','{}');
select set_config('request.jwt.claims','{"role":"authenticated","sub":"e0000000-0000-4000-8000-000000000099"}',true);
set local role authenticated;
do $$ declare fixture record; result jsonb; visible_match jsonb; begin
  if public.is_unseen_admin() then raise exception 'Ordinary voter became administrator'; end if;
  for fixture in select * from restored_vote_test loop
    perform public.cast_championship_vote(fixture.mid,1::smallint);
    if (select count(*) from public.championship_votes where match_id=fixture.mid and user_id=auth.uid())<>1 then raise exception 'Vote not recorded'; end if;
    result:=public.get_championship(fixture.kind,fixture.cid);
    if jsonb_array_length(result->'my_votes')<>1 then raise exception 'Personal vote not returned'; end if;
    select value into visible_match from jsonb_array_elements(result->'matches') where value->>'id'=fixture.mid::text;
    if visible_match->'vote_percentages' is null or visible_match->'vote_percentages'='null'::jsonb then raise exception 'Vote percentages unavailable'; end if;
    if visible_match->>'votes_1' is not null or visible_match->>'votes_2' is not null then raise exception 'Live tallies exposed'; end if;
    begin perform public.cast_championship_vote(fixture.mid,2::smallint); raise exception 'Duplicate vote accepted';
      exception when unique_violation then null; end;
    begin perform public.cast_championship_vote(fixture.mid,0::smallint); raise exception 'Invalid slot accepted';
      exception when raise_exception then if sqlerrm<>'Invalid vote' then raise; end if; end;
    if fixture.future_mid is not null then
      begin perform public.cast_championship_vote(fixture.future_mid,1::smallint); raise exception 'Future vote accepted';
        exception when raise_exception then if sqlerrm<>'Match not open' then raise; end if; end;
    end if;
  end loop;
end; $$;
reset role;
do $$ declare fixture record; begin
  for fixture in select * from restored_vote_test loop
    if not exists(select 1 from public.championship_matches where id=fixture.mid and votes_1=fixture.votes_1+1 and votes_2=fixture.votes_2) then raise exception 'Wrong vote increment'; end if;
  end loop;
end; $$;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
  begin perform public.cast_championship_vote((select mid from restored_vote_test limit 1),1::smallint); raise exception 'Anonymous vote accepted';
    exception when insufficient_privilege then null; end;
end; $$;
reset role;
