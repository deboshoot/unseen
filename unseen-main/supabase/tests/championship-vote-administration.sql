-- Fixtures must always be rolled back.
create temporary table vote_administration_test_state(mid uuid, voter uuid);
grant select on vote_administration_test_state to anon,authenticated;
do $$ declare cid uuid:=gen_random_uuid(); mid uuid:=gen_random_uuid(); voter uuid:=gen_random_uuid(); ts timestamptz:=clock_timestamp(); begin
  insert into auth.users(id,email,raw_user_meta_data) values(voter,'administration-test-'||voter||'@example.invalid','{}');
  insert into public.championships(id,kind,name,start_at,end_at,status)
    values(cid,'photo','Administrative vote rollback fixture',ts,ts+interval '720 hours','cancelled');
  insert into public.championship_matches(id,championship_id,number,round,position,votes_1,votes_2,start_at,end_at)
    values(mid,cid,1,1,1,73,72,ts,ts+interval '48 hours');
  insert into vote_administration_test_state values(mid,voter);
  insert into public.championship_votes(match_id,vote_slot,administration_note) values(mid,1,'Administrative tie-break correction');
  if (select votes_1 from public.championship_matches where id=mid)<>73 then raise exception 'Audit record increments tally twice'; end if;
  begin
    insert into public.championship_votes(match_id,user_id,vote_slot,administration_note) values(mid,voter,1,'Not an account vote');
    raise exception 'Administrative vote attributed to an account';
  exception when check_violation then null; end;
  begin
    insert into public.championship_votes(match_id,vote_slot,administration_note) values(mid,1,' ');
    raise exception 'Empty administrative explanation accepted';
  exception when check_violation then null; end;
end; $$;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(select voter from vote_administration_test_state))::text,true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.championship_votes where match_id=(select mid from vote_administration_test_state)) then raise exception 'Administrative history exposed to ordinary account'; end if;
  begin
    insert into public.championship_votes(match_id,vote_slot,administration_note) select mid,1,'Forged administration' from vote_administration_test_state;
    raise exception 'Ordinary account can create administration record';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(select user_id from unseen_private.admin_accounts limit 1))::text,true);
set local role authenticated;
do $$ begin
  if not exists(select 1 from public.championship_votes where match_id=(select mid from vote_administration_test_state) and user_id is null and administration_note='Administrative tie-break correction') then raise exception 'Administrative explanation missing from admin history'; end if;
end; $$;
reset role;

select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
  begin
    perform administration_note from public.championship_votes;
    raise exception 'Anonymous history access allowed';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
