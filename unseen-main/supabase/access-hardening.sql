-- UNSEEN: preserve dashboard operations; only the confirmed account selected
-- by the user is an application administrator. Run as the management role.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if (select count(*) from auth.users where lower(email)='deboshoot@gmail.com' and email_confirmed_at is not null) <> 1 then
    raise exception 'Expected exactly one confirmed UNSEEN administrator';
  end if;
end;
$$;

create schema if not exists unseen_private;
revoke all on schema unseen_private from public, anon, authenticated;
grant usage on schema unseen_private to service_role;
create table if not exists unseen_private.admin_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table unseen_private.admin_accounts enable row level security;
revoke all on unseen_private.admin_accounts from public, anon, authenticated;
grant all on unseen_private.admin_accounts to service_role;
insert into unseen_private.admin_accounts(user_id)
select id from auth.users where lower(email)='deboshoot@gmail.com' and email_confirmed_at is not null
on conflict (user_id) do nothing;
do $$
begin
  if (select count(*) from unseen_private.admin_accounts) <> 1 then
    raise exception 'Unexpected additional administrator: migration aborted';
  end if;
end;
$$;

create or replace function public.is_unseen_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from unseen_private.admin_accounts where user_id = (select auth.uid()));
$$;
revoke all on function public.is_unseen_admin() from public;
grant execute on function public.is_unseen_admin() to anon, authenticated, service_role;

-- Remove old permissive rules, including the policies that used USING(true).
do $$
declare item record;
begin
  for item in select schemaname,tablename,policyname from pg_policies
    where (schemaname='public' and tablename in ('opere','profiles','duels','votes','final_arenas','final_arena_votes','gallery_months'))
       or (schemaname='storage' and tablename='objects')
  loop
    execute format('drop policy %I on %I.%I',item.policyname,item.schemaname,item.tablename);
  end loop;
end;
$$;

revoke all on public.opere,public.profiles,public.duels,public.votes,
  public.final_arenas,public.final_arena_votes,public.gallery_months from anon, authenticated;
grant select on public.opere,public.duels,public.final_arenas,public.gallery_months to anon;
grant insert on public.opere to anon;
-- RLS restricts the full CRUD grant to the application administrator.
grant select,insert,update,delete on public.opere,public.profiles,public.duels,public.votes,
  public.final_arenas,public.final_arena_votes,public.gallery_months to authenticated;

create policy "UNSEEN published artworks" on public.opere for select to anon,authenticated
using (status='accepted' or coalesce(is_in_gallery,false));
create policy "UNSEEN pending photo submission" on public.opere for insert to anon,authenticated
with check (status='pending' and not coalesce(is_in_gallery,false) and coalesce(voti,0)=0 and duello_fine is null);
create policy "UNSEEN admin artworks" on public.opere for all to authenticated
using ((select public.is_unseen_admin())) with check ((select public.is_unseen_admin()));

create policy "UNSEEN own profile" on public.profiles for select to authenticated
using (id=(select auth.uid()));
create policy "UNSEEN admin profiles" on public.profiles for all to authenticated
using ((select public.is_unseen_admin())) with check ((select public.is_unseen_admin()));

create policy "UNSEEN public active duels" on public.duels for select to anon,authenticated
using (is_active=true and (start_at is null or start_at<=now()));
create policy "UNSEEN admin duels" on public.duels for all to authenticated
using ((select public.is_unseen_admin())) with check ((select public.is_unseen_admin()));

create policy "UNSEEN own votes" on public.votes for select to authenticated
using (user_id=(select auth.uid()));
create policy "UNSEEN admin votes" on public.votes for all to authenticated
using ((select public.is_unseen_admin())) with check ((select public.is_unseen_admin()));

create policy "UNSEEN public final arena" on public.final_arenas for select to anon,authenticated
using (is_active=true and start_at<=now() and end_at>now());
create policy "UNSEEN admin final arenas" on public.final_arenas for all to authenticated
using ((select public.is_unseen_admin())) with check ((select public.is_unseen_admin()));
create policy "UNSEEN own final votes" on public.final_arena_votes for select to authenticated
using (user_id=(select auth.uid()));
create policy "UNSEEN admin final votes" on public.final_arena_votes for all to authenticated
using ((select public.is_unseen_admin())) with check ((select public.is_unseen_admin()));

create policy "UNSEEN public monthly gallery" on public.gallery_months for select to anon,authenticated using (true);
create policy "UNSEEN admin monthly gallery" on public.gallery_months for all to authenticated
using ((select public.is_unseen_admin())) with check ((select public.is_unseen_admin()));

-- Keep the current public photo submission working until R2 replaces it.
create policy "UNSEEN photo upload" on storage.objects for insert to anon,authenticated
with check (bucket_id='galleria');
create policy "UNSEEN photo read" on storage.objects for select to anon,authenticated
using (bucket_id='galleria');
create policy "UNSEEN admin media" on storage.objects for all to authenticated
using ((select public.is_unseen_admin()) and bucket_id='galleria')
with check ((select public.is_unseen_admin()) and bucket_id='galleria');
update storage.buckets set file_size_limit=5242880,
  allowed_mime_types=array['image/jpeg','image/jpg','image/png','image/webp'] where id='galleria';

create or replace function public.cast_vote(p_duel_id uuid,p_vote_slot smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare voter uuid := auth.uid(); duel public.duels%rowtype;
begin
  if voter is null then raise exception 'Authentication required'; end if;
  if p_vote_slot is null or p_vote_slot not in (1,2) then raise exception 'Invalid vote slot'; end if;
  select * into duel from public.duels where id=p_duel_id for update;
  if not found or not coalesce(duel.is_active,false) or (duel.start_at is not null and duel.start_at>now()) or (duel.end_at is not null and duel.end_at<=now()) then
    raise exception 'Duel is not active';
  end if;
  insert into public.votes(user_id,duel_id,vote_slot) values(voter,p_duel_id,p_vote_slot::text);
  update public.duels set votes_champion=coalesce(votes_champion,0)+case when p_vote_slot=1 then 1 else 0 end,
    votes_challenger=coalesce(votes_challenger,0)+case when p_vote_slot=2 then 1 else 0 end where id=p_duel_id;
exception when unique_violation then raise exception 'You have already voted in this duel';
end;
$$;
revoke all on function public.cast_vote(uuid,smallint) from public,anon,authenticated;
grant execute on function public.cast_vote(uuid,smallint) to authenticated;

create or replace function public.cast_final_arena_vote(p_final_arena_id uuid,p_artwork_slot smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare voter uuid := auth.uid(); arena public.final_arenas%rowtype;
begin
  if voter is null then raise exception 'Authentication required'; end if;
  if p_artwork_slot is null or p_artwork_slot not in (1,2,3) then raise exception 'Invalid artwork slot'; end if;
  select * into arena from public.final_arenas where id=p_final_arena_id for update;
  if not found or not arena.is_active or arena.start_at>now() or arena.end_at<=now() then raise exception 'Final arena is not active'; end if;
  insert into public.final_arena_votes(final_arena_id,user_id,artwork_slot) values(p_final_arena_id,voter,p_artwork_slot);
  update public.final_arenas set votes_1=votes_1+case when p_artwork_slot=1 then 1 else 0 end,
    votes_2=votes_2+case when p_artwork_slot=2 then 1 else 0 end,
    votes_3=votes_3+case when p_artwork_slot=3 then 1 else 0 end where id=p_final_arena_id;
exception when unique_violation then raise exception 'You have already voted in this final arena';
end;
$$;
revoke all on function public.cast_final_arena_vote(uuid,smallint) from public,anon,authenticated;
grant execute on function public.cast_final_arena_vote(uuid,smallint) to authenticated;

-- Trigger defaults must never overwrite participants/time selected in the dashboard.
create or replace function public.start_duel_logic()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(new.is_active,false) then
    if new.champion_id is null then
      select id into new.champion_id from public.opere where status='accepted' and id is distinct from new.challenger_id order by random() limit 1;
    end if;
    if new.challenger_id is null then
      select id into new.challenger_id from public.opere where status='accepted' and id is distinct from new.champion_id order by random() limit 1;
    end if;
    if new.champion_id is null or new.challenger_id is null or new.champion_id=new.challenger_id then raise exception 'Two distinct artworks are required'; end if;
    new.votes_champion := coalesce(new.votes_champion,0);
    new.votes_challenger := coalesce(new.votes_challenger,0);
    new.end_at := coalesce(new.end_at,coalesce(new.start_at,now())+interval '24 hours');
    if new.start_at is not null and new.end_at<=new.start_at then raise exception 'Invalid duel window'; end if;
  end if;
  return new;
end;
$$;
alter function public.start_duel_timer() set search_path = public;
alter function public.handle_new_user() set search_path = '';
revoke all on function public.start_duel_logic(),public.start_duel_timer(),public.handle_new_user() from public,anon,authenticated;

-- The cron job already exists. Only the dashboard and job need this function.
revoke all on function public.activate_scheduled_duel() from public,anon,authenticated;
grant execute on function public.activate_scheduled_duel() to authenticated;
-- Enforce admin inside this SECURITY DEFINER function as well (cron has no UID).
create or replace function public.activate_scheduled_duel()
returns void language plpgsql security definer set search_path = '' as $$
declare next_duel_id uuid;
begin
  if not public.is_unseen_admin() and not (
    session_user in ('postgres','supabase_admin')
    and coalesce(current_setting('role',true),'none') in ('none','postgres','supabase_admin')
  ) then raise exception 'Administrator required'; end if;
  perform pg_advisory_xact_lock(741203);
  select id into next_duel_id from public.duels
    where is_active=true and start_at is not null and start_at<=now() and (end_at is null or end_at>now())
    order by start_at asc limit 1 for update;
  if next_duel_id is null then return; end if;
  update public.duels set is_active=false where is_active=true and id<>next_duel_id and (start_at is null or start_at<=now());
  -- The selected row is already active; avoid an unnecessary write and trigger.
end;
$$;

-- Keep the existing UNIQUE constraint and remove its redundant standalone index.
drop index if exists public.votes_one_per_user_per_duel;
create index if not exists votes_duel_id_idx on public.votes(duel_id);
create index if not exists opere_status_created_at_idx on public.opere(status,created_at desc);
