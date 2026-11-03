-- Run inside BEGIN/ROLLBACK: no fixture users or votes are retained.
create temporary table community_search_fixture(n integer,id uuid);
insert into community_search_fixture select n,gen_random_uuid() from generate_series(1,105) n;
grant select on community_search_fixture to authenticated;
insert into auth.users(id,email,raw_user_meta_data)
select id,'community-search-fixture-'||lpad(n::text,3,'0')||'@example.invalid','{}' from community_search_fixture;
insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'literal%_community-search@example.invalid','{}');
update public.profiles p set created_at='2000-01-01'::timestamptz+f.n*interval '1 second' from community_search_fixture f where p.id=f.id;
do $$
declare cid uuid:=gen_random_uuid(); mid uuid:=gen_random_uuid(); first_entry uuid:=gen_random_uuid(); second_entry uuid:=gen_random_uuid(); starts timestamptz:='2000-01-01';
begin
  insert into public.championships(id,kind,name,start_at,end_at,status) values(cid,'music','Community search rolled-back fixture',starts,starts+interval '720 hours','cancelled');
  insert into public.championship_entries(id,championship_id,seed,title,artist,image_url) values
    (first_entry,cid,1,'Fixture 1','Fixture 1','https://example.invalid/1.webp'),
    (second_entry,cid,2,'Fixture 2','Fixture 2','https://example.invalid/2.webp');
  insert into public.championship_matches(id,championship_id,number,round,position,entry_1_id,entry_2_id,start_at,end_at,votes_1)
    values(mid,cid,1,1,1,first_entry,second_entry,starts,starts+interval '48 hours',105);
  insert into public.championship_votes(match_id,user_id,vote_slot,created_at)
    select mid,id,1,starts+n*interval '1 second' from community_search_fixture;
end; $$;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(select id from auth.users where lower(email)='deboshoot@gmail.com'))::text,true);
set local role authenticated;
do $$
declare result jsonb; second_page jsonb; target uuid:=(select id from community_search_fixture where n=1);
begin
  result:=public.get_admin_community(0,0,'community-search-fixture-');
  second_page:=public.get_admin_community(1,1,'community-search-fixture-');
  if (result->'stats'->>'users')::integer<>105 or (result->'stats'->>'voters')::integer<>105 or (result->'stats'->>'votes')::integer<>105 then raise exception 'Filtered totals incorrect'; end if;
  if jsonb_array_length(result->'users')<>100 or jsonb_array_length(result->'voters')<>100 or jsonb_array_length(second_page->'users')<>5 or jsonb_array_length(second_page->'voters')<>5 then raise exception 'Filtered pagination incorrect'; end if;
  if exists(select 1 from jsonb_array_elements(result->'users') x where x->>'id'=target::text) or exists(select 1 from jsonb_array_elements(result->'voters') x where x->>'id'=target::text) then raise exception 'Target fixture should be outside first page'; end if;
  result:=public.get_admin_community(0,0,'  COMMUNITY-SEARCH-FIXTURE-001@  ');
  if jsonb_array_length(result->'users')<>1 or result->'users'->0->>'id'<>target::text or jsonb_array_length(result->'voters')<>1 or result->'voters'->0->>'id'<>target::text or (result->'voters'->0->>'voteCount')::integer<>1 then raise exception 'Case-insensitive partial email search across pages failed'; end if;
  result:=public.get_admin_community(0,0,'%_community-search');
  if (result->'stats'->>'users')::integer<>1 or (result->'stats'->>'voters')::integer<>0 or jsonb_array_length(result->'voters')<>0 then raise exception 'Literal wildcard search or nonvoter filtering failed'; end if;
  result:=public.get_admin_community(0,0,'no-such-community-search-fixture@example.invalid');
  if result->'users'<>'[]'::jsonb or result->'voters'<>'[]'::jsonb or (result->'stats'->>'users')::integer<>0 then raise exception 'Empty search results incorrect'; end if;
  if public.get_admin_community(0,0,'  ') is distinct from public.get_admin_community(0,0) then raise exception 'Blank search compatibility failed'; end if;
  begin perform public.get_admin_community(-1,0,'email'); raise exception 'Invalid page accepted'; exception when raise_exception then if sqlerrm<>'Invalid page' then raise; end if; end;
  begin perform public.get_admin_community(0,0,repeat('x',321)); raise exception 'Long search accepted'; exception when raise_exception then if sqlerrm<>'Search too long' then raise; end if; end;
end; $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',(select id from community_search_fixture where n=1))::text,true);
set local role authenticated;
do $$ begin
  begin perform public.get_admin_community(0,0,'community'); raise exception 'Ordinary user can search community'; exception when raise_exception then if sqlerrm<>'Administrator required' then raise; end if; end;
end; $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
  begin perform public.get_admin_community(0,0,'community'); raise exception 'Anonymous can search community'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
