-- Run only inside a transaction that is rolled back, including after deployment.
-- Cancelled fixture championships avoid interference with the real calendar.
create temporary table vote_results_test_state(kind text, cid uuid, mid uuid, future_mid uuid, voter uuid, other_voter uuid);
grant select on vote_results_test_state to anon,authenticated;
do $$
declare k text; cid uuid; mid uuid; future_mid uuid; voter uuid:=gen_random_uuid(); other_voter uuid:=gen_random_uuid(); first_entry uuid; second_entry uuid; starts timestamptz:=clock_timestamp()-interval '1 hour';
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (voter,'vote-results-'||voter||'@example.invalid','{}'),
    (other_voter,'vote-results-'||other_voter||'@example.invalid','{}');
  foreach k in array array['photo','music'] loop
    cid:=gen_random_uuid(); mid:=gen_random_uuid(); future_mid:=gen_random_uuid(); first_entry:=gen_random_uuid(); second_entry:=gen_random_uuid();
    insert into public.championships(id,kind,name,start_at,end_at,status)
      values(cid,k,'Percentuali: prova annullata',starts,starts+interval '720 hours','cancelled');
    insert into public.championship_entries(id,championship_id,seed,title,artist,image_url) values
      (first_entry,cid,1,'Fixture 1','Fixture 1','https://example.invalid/1.webp'),
      (second_entry,cid,2,'Fixture 2','Fixture 2','https://example.invalid/2.webp');
    insert into public.championship_matches(id,championship_id,number,round,position,entry_1_id,entry_2_id,votes_1,votes_2,start_at,end_at) values
      (mid,cid,1,1,1,first_entry,second_entry,38,62,starts,starts+interval '48 hours'),
      (future_mid,cid,2,1,2,first_entry,second_entry,17,11,starts+interval '48 hours',starts+interval '96 hours');
    insert into vote_results_test_state values(k,cid,mid,future_mid,voter,other_voter);
  end loop;
end; $$;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(select voter from vote_results_test_state limit 1))::text,true);
set local role authenticated;
do $$ declare fixture record; result jsonb; begin
  for fixture in select * from vote_results_test_state loop
    result:=public.get_championship(fixture.kind,fixture.cid);
    if result->'matches'->0->'vote_percentages' is distinct from 'null'::jsonb then raise exception 'Percentuali visibili prima del voto: %',fixture.kind; end if;
  end loop;
end; $$;
reset role;
insert into public.championship_votes(match_id,user_id,vote_slot) select mid,voter,2 from vote_results_test_state;

set local role authenticated;
do $$ declare fixture record; result jsonb; p jsonb; begin
  for fixture in select * from vote_results_test_state loop
    result:=public.get_championship(fixture.kind,fixture.cid);
    p:=result->'matches'->0->'vote_percentages';
    if p is distinct from '{"slot_1":38,"slot_2":62,"leading_slot":2}'::jsonb then raise exception 'Percentuali errate dopo il voto: %',fixture.kind; end if;
    if result->'matches'->1->'vote_percentages' is distinct from 'null'::jsonb then raise exception 'Voto sblocca un altro duello: %',fixture.kind; end if;
    if result->'matches'->0->>'votes_1' is not null or result->'matches'->0->>'votes_2' is not null then raise exception 'Conteggi grezzi esposti: %',fixture.kind; end if;
    if jsonb_array_length(result->'my_votes')<>1 then raise exception 'Voto personale mancante'; end if;
  end loop;
  begin perform votes_1 from public.championship_matches; raise exception 'Lettura diretta dei conteggi consentita'; exception when insufficient_privilege then null; end;
end; $$;
reset role;

-- A different authenticated account and an anonymous request remain locked.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(select other_voter from vote_results_test_state limit 1))::text,true);
set local role authenticated;
do $$ declare fixture record; result jsonb; begin
  for fixture in select * from vote_results_test_state loop
    result:=public.get_championship(fixture.kind,fixture.cid);
    if result->'matches'->0->'vote_percentages' is distinct from 'null'::jsonb then raise exception 'Altro utente vede le percentuali: %',fixture.kind; end if;
    if jsonb_array_length(result->'my_votes')<>0 then raise exception 'Voto di un altro utente esposto'; end if;
  end loop;
end; $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ declare fixture record; result jsonb; begin
  for fixture in select * from vote_results_test_state loop
    result:=public.get_championship(fixture.kind,fixture.cid);
    if result->'matches'->0->'vote_percentages' is distinct from 'null'::jsonb then raise exception 'Percentuali anonime esposte: %',fixture.kind; end if;
  end loop;
end; $$;
reset role;

-- Exact ties, no votes, and narrow margins must retain the correct leader.
update public.championship_matches set votes_1=0,votes_2=0 where id in(select mid from vote_results_test_state);
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(select voter from vote_results_test_state limit 1))::text,true);
set local role authenticated;
do $$ declare fixture record; begin
  for fixture in select * from vote_results_test_state loop
    if public.get_championship(fixture.kind,fixture.cid)->'matches'->0->'vote_percentages' is distinct from '{"slot_1":0,"slot_2":0,"leading_slot":null}'::jsonb then raise exception 'Zero voti errato'; end if;
  end loop;
end; $$;
reset role;
update public.championship_matches set votes_1=500,votes_2=501 where id in(select mid from vote_results_test_state);
set local role authenticated;
do $$ declare fixture record; begin
  for fixture in select * from vote_results_test_state loop
    if public.get_championship(fixture.kind,fixture.cid)->'matches'->0->'vote_percentages' is distinct from '{"slot_1":49.95,"slot_2":50.05,"leading_slot":2}'::jsonb then raise exception 'Vantaggio decimale errato'; end if;
  end loop;
end; $$;
reset role;
update public.championship_matches set votes_1=10,votes_2=10 where id in(select mid from vote_results_test_state);
set local role authenticated;
do $$ declare fixture record; begin
  for fixture in select * from vote_results_test_state loop
    if public.get_championship(fixture.kind,fixture.cid)->'matches'->0->'vote_percentages' is distinct from '{"slot_1":50,"slot_2":50,"leading_slot":null}'::jsonb then raise exception 'Parita errata'; end if;
  end loop;
end; $$;
reset role;

-- Recurring fractions, one-sided results, very small leads and large totals.
do $$ declare fixture record; sample record; p jsonb; begin
  for sample in select * from (values
    (1,2,33.33,66.67,2), (2,1,66.67,33.33,1),
    (1,7,12.50,87.50,2), (1,0,100,0,1), (0,1,0,100,2),
    (10000,10001,50,50,2), (2147483647,2147483647,50,50,null)
  ) as cases(v1,v2,p1,p2,leader) loop
    for fixture in select * from vote_results_test_state loop
      update public.championship_matches set votes_1=sample.v1,votes_2=sample.v2 where id=fixture.mid;
      p:=public.get_championship(fixture.kind,fixture.cid)->'matches'->0->'vote_percentages';
      if p is distinct from jsonb_build_object('slot_1',sample.p1,'slot_2',sample.p2,'leading_slot',sample.leader)
        or (p->>'slot_1')::numeric+(p->>'slot_2')::numeric<>100 then
        raise exception 'Precisione errata per %: %/% -> %',fixture.kind,sample.v1,sample.v2,p;
      end if;
    end loop;
  end loop;
end; $$;
update public.championship_matches set votes_1=10,votes_2=10 where id in(select mid from vote_results_test_state);

-- Resolved matches remain public.
update public.championship_matches set resolved_at=clock_timestamp(),winner_id=entry_1_id where id in(select mid from vote_results_test_state);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ declare fixture record; begin
  for fixture in select * from vote_results_test_state loop
    if public.get_championship(fixture.kind,fixture.cid)->'matches'->0->'vote_percentages' is distinct from '{"slot_1":50,"slot_2":50,"leading_slot":null}'::jsonb then raise exception 'Risultato concluso nascosto'; end if;
  end loop;
end; $$;
reset role;
