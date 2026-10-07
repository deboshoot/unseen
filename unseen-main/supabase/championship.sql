-- 16 entries, 15 sequential 48-hour matches. Old duels/votes remain historical.
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.championships (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('photo','music')),
  name text not null check (length(btrim(name)) between 1 and 120),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','running','completed','cancelled')),
  winner_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_at = start_at + interval '720 hours')
);
create unique index championship_one_open_per_kind on public.championships(kind) where status in ('scheduled','running');
create index championship_kind_date on public.championships(kind,start_at desc);
create table public.championship_entries (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null references public.championships(id) on delete cascade,
  seed smallint not null check (seed between 1 and 16),
  artwork_id uuid references public.opere(id) on delete set null,
  track_id uuid references public.music_tracks(id) on delete set null,
  title text not null, artist text not null, image_url text not null, audio_url text,
  unique(championship_id,seed), unique(championship_id,id),
  unique(championship_id,artwork_id), unique(championship_id,track_id),
  check (not (artwork_id is not null and track_id is not null))
);
alter table public.championships add constraint championship_winner_fk foreign key (id,winner_id) references public.championship_entries(championship_id,id);
create table public.championship_matches (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null references public.championships(id) on delete cascade,
  number smallint not null check (number between 1 and 15),
  round smallint not null check (round between 1 and 4),
  position smallint not null,
  entry_1_id uuid, entry_2_id uuid, winner_id uuid,
  votes_1 integer not null default 0 check (votes_1>=0),
  votes_2 integer not null default 0 check (votes_2>=0),
  start_at timestamptz not null, end_at timestamptz not null,
  resolved_at timestamptz,
  tie_break text check (tie_break='seed'),
  unique(championship_id,number), unique(championship_id,round,position),
  foreign key (championship_id,entry_1_id) references public.championship_entries(championship_id,id),
  foreign key (championship_id,entry_2_id) references public.championship_entries(championship_id,id),
  foreign key (championship_id,winner_id) references public.championship_entries(championship_id,id),
  check (entry_1_id is distinct from entry_2_id or entry_1_id is null),
  check (winner_id is null or winner_id in (entry_1_id,entry_2_id)),
  check ((resolved_at is null) = (winner_id is null)),
  check (end_at=start_at+interval '48 hours')
);
create table public.championship_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.championship_matches(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  vote_slot smallint not null check (vote_slot in (1,2)),
  created_at timestamptz not null default clock_timestamp(),
  unique(match_id,user_id)
);
create index championship_votes_user on public.championship_votes(user_id,match_id);
alter table public.championships enable row level security;
alter table public.championship_entries enable row level security;
alter table public.championship_matches enable row level security;
alter table public.championship_votes enable row level security;
revoke all on public.championships,public.championship_entries,public.championship_matches,public.championship_votes from anon,authenticated;
grant select on public.championships,public.championship_entries,public.championship_matches to anon,authenticated;
grant select on public.championship_votes to authenticated;
create policy championship_public_read on public.championships for select to anon,authenticated using(true);
create policy championship_entries_public_read on public.championship_entries for select to anon,authenticated using(true);
create policy championship_matches_public_read on public.championship_matches for select to anon,authenticated using(true);
create policy championship_votes_private on public.championship_votes for select to authenticated using(user_id=auth.uid() or public.is_unseen_admin());
grant all on public.championships,public.championship_entries,public.championship_matches,public.championship_votes to service_role;

-- Internal only: caller must lock championship first. Never accepts a client clock.
create or replace function unseen_private.advance_championship(p_id uuid,p_now timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare c public.championships; m public.championship_matches; w uuid; parent_number integer; slot integer; n integer;
begin
  select * into c from public.championships where id=p_id for update;
  if not found or c.status in ('completed','cancelled') or c.start_at>p_now then return; end if;
  if c.status='scheduled' then update public.championships set status='running' where id=p_id; end if;
  for n in 1..15 loop
    -- Read each row after its feeders were updated (also when catching up).
    select * into m from public.championship_matches where championship_id=p_id and number=n for update;
    if m.resolved_at is not null then continue; end if;
    if m.end_at>p_now then exit; end if;
    if m.entry_1_id is null or m.entry_2_id is null then raise exception 'Incomplete championship bracket'; end if;
    w := case when m.votes_1>m.votes_2 then m.entry_1_id when m.votes_2>m.votes_1 then m.entry_2_id else (select id from public.championship_entries where id in (m.entry_1_id,m.entry_2_id) order by seed limit 1) end;
    update public.championship_matches set winner_id=w,resolved_at=p_now,tie_break=case when m.votes_1=m.votes_2 then 'seed' end where id=m.id;
    if m.number<15 then
      parent_number := case when m.number<=8 then 8+(m.number+1)/2 when m.number<=12 then 12+(m.number-8+1)/2 else 15 end;
      slot := case when m.number%2=1 then 1 else 2 end;
      update public.championship_matches set entry_1_id=case when slot=1 then w else entry_1_id end,entry_2_id=case when slot=2 then w else entry_2_id end where championship_id=p_id and number=parent_number;
    else
      update public.championships set status='completed',winner_id=w where id=p_id;
    end if;
  end loop;
end;
$$;
revoke all on function unseen_private.advance_championship(uuid,timestamptz) from public,anon,authenticated,service_role;

create or replace function public.create_championship(p_kind text,p_name text,p_entry_ids uuid[],p_start_at timestamptz default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid; eid uuid; s timestamptz:=coalesce(p_start_at,clock_timestamp()); n integer; r integer; pos integer; ids uuid[]:='{}'; work record; identities text[]:='{}'; identity_key text;
begin
  if not public.is_unseen_admin() then raise exception 'Administrator required'; end if;
  if p_kind not in ('photo','music') or p_kind is null or p_name is null or length(btrim(p_name)) not between 1 and 120 then raise exception 'Invalid championship'; end if;
  if cardinality(p_entry_ids)<>16 or p_entry_ids is null or (select count(distinct x) from unnest(p_entry_ids) x)<>16 then raise exception 'Select exactly 16 different entries'; end if;
  if s<clock_timestamp()-interval '5 seconds' then raise exception 'Start must be now or in the future'; end if;
  perform pg_advisory_xact_lock(741204);
  insert into public.championships(kind,name,start_at,end_at,created_by) values(p_kind,btrim(p_name),s,s+interval '720 hours',auth.uid()) returning id into cid;
  for n in 1..16 loop
    if p_kind='photo' then
      select id,titolo as title,autore as artist,immagine_url as image_url,null::text as audio_url,coalesce(owner_id::text,lower(btrim(autore))) as identity into work from public.opere where id=p_entry_ids[n] and status='accepted' for share;
    else
      select id,title,artist,cover_url as image_url,audio_url,user_id::text as identity into work from public.music_tracks where id=p_entry_ids[n] and status='accepted' for share;
    end if;
    if not found then raise exception 'All 16 entries must be approved'; end if;
    identity_key:=work.identity;
    if identity_key=any(identities) then raise exception 'Select 16 different participants'; end if;
    identities:=array_append(identities,identity_key);
    insert into public.championship_entries(championship_id,seed,artwork_id,track_id,title,artist,image_url,audio_url) values(cid,n,case when p_kind='photo' then work.id end,case when p_kind='music' then work.id end,work.title,work.artist,work.image_url,work.audio_url) returning id into eid;
    ids:=array_append(ids,eid);
  end loop;
  for n in 1..15 loop
    r:=case when n<=8 then 1 when n<=12 then 2 when n<=14 then 3 else 4 end;
    pos:=case r when 1 then n when 2 then n-8 when 3 then n-12 else 1 end;
    insert into public.championship_matches(championship_id,number,round,position,entry_1_id,entry_2_id,start_at,end_at) values(cid,n,r,pos,case when n<=8 then ids[2*n-1] end,case when n<=8 then ids[2*n] end,s+((n-1)*interval '48 hours'),s+(n*interval '48 hours'));
  end loop;
  perform unseen_private.advance_championship(cid,clock_timestamp());
  return cid;
end;
$$;
revoke all on function public.create_championship(text,text,uuid[],timestamptz) from public,anon,authenticated;
grant execute on function public.create_championship(text,text,uuid[],timestamptz) to authenticated;

create or replace function public.cancel_championship(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_unseen_admin() then raise exception 'Administrator required'; end if;
  perform 1 from public.championships where id=p_id for update;
  update public.championships set status='cancelled' where id=p_id and status in ('scheduled','running');
end;
$$;
revoke all on function public.cancel_championship(uuid) from public,anon,authenticated;
grant execute on function public.cancel_championship(uuid) to authenticated;

create or replace function public.cast_championship_vote(p_match_id uuid,p_vote_slot smallint)
returns void language plpgsql security definer set search_path='' as $$
declare cid uuid; c public.championships; m public.championship_matches; ts timestamptz;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if p_vote_slot is null or p_vote_slot not in (1,2) then raise exception 'Invalid vote'; end if;
  select championship_id into cid from public.championship_matches where id=p_match_id;
  select * into c from public.championships where id=cid for update;
  ts:=clock_timestamp();
  if not found or c.status in ('cancelled','completed') then raise exception 'Championship not active'; end if;
  perform unseen_private.advance_championship(cid,ts);
  select * into m from public.championship_matches where id=p_match_id for update;
  -- Recheck after locks: a vote waiting behind another vote cannot cross deadline.
  ts:=clock_timestamp();
  if m.start_at>ts or m.end_at<=ts or m.resolved_at is not null or m.entry_1_id is null or m.entry_2_id is null then raise exception 'Match not open'; end if;
  insert into public.championship_votes(match_id,user_id,vote_slot) values(m.id,auth.uid(),p_vote_slot);
  update public.championship_matches set votes_1=votes_1+case when p_vote_slot=1 then 1 else 0 end,votes_2=votes_2+case when p_vote_slot=2 then 1 else 0 end where id=m.id;
end;
$$;
revoke all on function public.cast_championship_vote(uuid,smallint) from public,anon,authenticated;
grant execute on function public.cast_championship_vote(uuid,smallint) to authenticated;

-- One bounded response, aggregate counts only; never expose other voters.
create or replace function public.get_championship(p_kind text,p_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cid uuid; ts timestamptz;
begin
  select id into cid from public.championships where kind=p_kind and (p_id is null or id=p_id) order by case when status in ('scheduled','running') then 0 else 1 end,start_at desc limit 1;
  if cid is null then return jsonb_build_object('server_now',clock_timestamp(),'championship',null,'entries','[]'::jsonb,'matches','[]'::jsonb,'my_votes','[]'::jsonb); end if;
  perform 1 from public.championships where id=cid for update;
  ts:=clock_timestamp();
  perform unseen_private.advance_championship(cid,ts);
  return jsonb_build_object('server_now',clock_timestamp(),'championship',(select to_jsonb(c) from public.championships c where id=cid),'entries',(select jsonb_agg(e order by e.seed) from public.championship_entries e where e.championship_id=cid),'matches',(select jsonb_agg(m order by m.number) from public.championship_matches m where m.championship_id=cid),'my_votes',coalesce((select jsonb_agg(jsonb_build_object('match_id',v.match_id,'vote_slot',v.vote_slot)) from public.championship_votes v join public.championship_matches m on m.id=v.match_id where m.championship_id=cid and v.user_id=auth.uid()),'[]'::jsonb));
end;
$$;
revoke all on function public.get_championship(text,uuid) from public,anon,authenticated;
grant execute on function public.get_championship(text,uuid) to anon,authenticated;

-- Bounded dashboard pages, with totals including the historical competitions.
create or replace function public.get_admin_community(p_users_page integer default 0,p_voters_page integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.is_unseen_admin() then raise exception 'Administrator required'; end if;
  if p_users_page not between 0 and 100000 or p_voters_page not between 0 and 100000 or p_users_page is null or p_voters_page is null then raise exception 'Invalid page'; end if;
  with all_votes as (
    select user_id,created_at from public.votes union all select user_id,created_at from public.final_arena_votes union all select user_id,created_at from public.music_votes union all select user_id,created_at from public.championship_votes
  ), voter_totals as (
    select user_id,count(*) as "voteCount",max(created_at) as "lastVoteAt" from all_votes where user_id is not null group by user_id
  ), voter_page as (
    select p.id,p.email,p.created_at,v."voteCount",v."lastVoteAt" from voter_totals v join public.profiles p on p.id=v.user_id order by v."lastVoteAt" desc,p.id limit 100 offset p_voters_page*100
  ), user_page as (
    select id,email,created_at from public.profiles order by created_at desc,id limit 100 offset p_users_page*100
  ) select jsonb_build_object('stats',jsonb_build_object('users',(select count(*) from public.profiles),'opere',(select count(*) from public.opere)+(select count(*) from public.music_tracks),'votes',(select count(*) from all_votes),'voters',(select count(*) from voter_totals v join public.profiles p on p.id=v.user_id)),'users',coalesce((select jsonb_agg(u) from user_page u),'[]'::jsonb),'voters',coalesce((select jsonb_agg(v) from voter_page v),'[]'::jsonb)) into result;
  return result;
end;
$$;
revoke all on function public.get_admin_community(integer,integer) from public,anon,authenticated;
grant execute on function public.get_admin_community(integer,integer) to authenticated;

create or replace function public.tick_championships()
returns void language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
  if not (session_user in ('postgres','supabase_admin') and coalesce(current_setting('role',true),'none') in ('none','postgres','supabase_admin')) then raise exception 'Scheduler only'; end if;
  for cid in select id from public.championships where status in ('scheduled','running') and start_at<=clock_timestamp() order by id for update skip locked loop
    perform unseen_private.advance_championship(cid,clock_timestamp());
  end loop;
end;
$$;
revoke all on function public.tick_championships() from public,anon,authenticated,service_role;

-- Keep a scheduled/running bracket playable and its R2 files available.
create or replace function public.guard_championship_work()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' or new.status is distinct from old.status then
    if exists(select 1 from public.championship_entries e join public.championships c on c.id=e.championship_id where c.status in ('scheduled','running') and (case when tg_table_name='opere' then e.artwork_id=old.id else e.track_id=old.id end)) then
      raise exception 'Entry in an open championship: cancel championship before removing or rejecting';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.guard_championship_work() from public,anon,authenticated;
create trigger championship_guard_photo before delete or update of status on public.opere for each row execute function public.guard_championship_work();
create trigger championship_guard_music before delete or update of status on public.music_tracks for each row execute function public.guard_championship_work();

-- Retire the daily scheduler; all historical rows/votes are preserved.
select cron.unschedule(jobid) from cron.job where jobname='activate-scheduled-duel';
select cron.schedule('advance-championships','* * * * *','select public.tick_championships();');

-- Retire the public vote endpoints of the former game; retain historical reads.
revoke execute on function public.cast_vote(uuid,smallint) from authenticated;
revoke execute on function public.cast_music_vote(uuid,smallint) from authenticated;
revoke execute on function public.cast_final_arena_vote(uuid,smallint) from authenticated;
