-- Championship dashboard, secret live scores and automatic monthly champions.
set local lock_timeout='5s';
set local statement_timeout='30s';

-- Scores must not be retrievable through a direct REST query or a WHERE filter.
revoke select on public.championship_matches from anon,authenticated;
grant select(id,championship_id,number,round,position,entry_1_id,entry_2_id,winner_id,start_at,end_at,resolved_at,tie_break)
  on public.championship_matches to anon,authenticated;

create or replace function public.get_championship(p_kind text,p_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cid uuid; ts timestamptz; admin boolean:=public.is_unseen_admin();
begin
  select id into cid from public.championships where kind=p_kind and (p_id is null or id=p_id)
    order by case when status in ('scheduled','running') then 0 else 1 end,start_at desc limit 1;
  if cid is null then return jsonb_build_object('server_now',clock_timestamp(),'championship',null,'entries','[]'::jsonb,'matches','[]'::jsonb,'my_votes','[]'::jsonb); end if;
  perform 1 from public.championships where id=cid for update;
  ts:=clock_timestamp();
  perform unseen_private.advance_championship(cid,ts);
  return jsonb_build_object('server_now',clock_timestamp(),
    'championship',(select to_jsonb(c) from public.championships c where id=cid),
    'entries',(select jsonb_agg(e order by e.seed) from public.championship_entries e where e.championship_id=cid),
    'matches',(select jsonb_agg(
      (to_jsonb(m)-'votes_1'-'votes_2')||jsonb_build_object(
        'votes_1',case when admin or m.resolved_at is not null then m.votes_1 else null end,
        'votes_2',case when admin or m.resolved_at is not null then m.votes_2 else null end,
        'results_available',m.resolved_at is not null)
      order by m.number) from public.championship_matches m where m.championship_id=cid),
    'my_votes',coalesce((select jsonb_agg(jsonb_build_object('match_id',v.match_id,'vote_slot',v.vote_slot))
      from public.championship_votes v join public.championship_matches m on m.id=v.match_id
      where m.championship_id=cid and v.user_id=auth.uid()),'[]'::jsonb));
end; $$;
revoke all on function public.get_championship(text,uuid) from public;
grant execute on function public.get_championship(text,uuid) to anon,authenticated;

create table public.championship_gallery (
  championship_id uuid primary key references public.championships(id),
  entry_id uuid not null,
  kind text not null check(kind in ('photo','music')),
  month_key date not null,
  published_at timestamptz not null default clock_timestamp(),
  foreign key(championship_id,entry_id) references public.championship_entries(championship_id,id)
);
create index championship_gallery_month on public.championship_gallery(month_key desc,kind);
alter table public.championship_gallery enable row level security;
revoke all on public.championship_gallery from public,anon,authenticated;
grant select on public.championship_gallery to anon,authenticated;
grant all on public.championship_gallery to service_role;
create policy championship_gallery_public on public.championship_gallery for select to anon,authenticated
  using(exists(select 1 from public.championships c where c.id=championship_id and c.status='completed' and c.end_at<=statement_timestamp()));

create or replace function unseen_private.publish_championship_winner()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='completed' and new.winner_id is not null then
    if not exists(select 1 from public.championship_matches m where m.championship_id=new.id and m.number=15 and m.winner_id=new.winner_id and m.resolved_at is not null and m.end_at=new.end_at) then
      raise exception 'A completed final is required before gallery publication';
    end if;
    insert into public.championship_gallery(championship_id,entry_id,kind,month_key)
    values(new.id,new.winner_id,new.kind,date_trunc('month',new.start_at at time zone 'Europe/Rome')::date)
    on conflict(championship_id) do nothing;
  end if;
  return new;
end; $$;
revoke all on function unseen_private.publish_championship_winner() from public,anon,authenticated,service_role;
create trigger championship_publish_winner after update of status,winner_id on public.championships
  for each row execute function unseen_private.publish_championship_winner();
insert into public.championship_gallery(championship_id,entry_id,kind,month_key)
select c.id,c.winner_id,c.kind,date_trunc('month',c.start_at at time zone 'Europe/Rome')::date
from public.championships c join public.championship_matches m on m.championship_id=c.id and m.number=15
where c.status='completed' and c.winner_id=m.winner_id and m.resolved_at is not null;

-- A winning work must keep its approved files available in the gallery.
create or replace function public.guard_championship_work()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' or new.status is distinct from old.status then
    if exists(select 1 from public.championship_entries e join public.championships c on c.id=e.championship_id
      where c.status in ('scheduled','running') and (case when tg_table_name='opere' then e.artwork_id=old.id else e.track_id=old.id end)) then
      raise exception 'Entry in an open championship: cancel championship before removing or rejecting';
    end if;
    if exists(select 1 from public.championship_entries e join public.championship_gallery g on g.entry_id=e.id
      where case when tg_table_name='opere' then e.artwork_id=old.id else e.track_id=old.id end) then
      raise exception 'Opera vincitrice esposta nella galleria del campionato.';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;

create or replace function public.get_admin_overview()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not public.is_unseen_admin() then raise exception 'Administrator required'; end if;
  return jsonb_build_object(
    'pending_photos',(select count(*) from public.opere where status='pending'),
    'pending_music',(select count(*) from public.music_tracks where status='pending'),
    'approved_photos',(select count(*) from public.opere where status='accepted'),
    'approved_music',(select count(*) from public.music_tracks where status='accepted'),
    'open_championships',(select count(*) from public.championships where status in ('scheduled','running')),
    'championship_votes',(select count(*) from public.championship_votes),
    'users',(select count(*) from public.profiles),
    'gallery_champions',(select count(*) from public.championship_gallery));
end; $$;
revoke all on function public.get_admin_overview() from public,anon;
grant execute on function public.get_admin_overview() to authenticated;
