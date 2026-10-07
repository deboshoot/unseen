-- Requires access-hardening.sql. Applied transactionally by setup-r2.mjs.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.media_assets (
  id uuid primary key,
  owner_id uuid references auth.users(id) on delete set null,
  provider text not null default 'r2' check(provider='r2'),
  bucket text not null,
  object_key text not null,
  kind text not null check(kind in ('image','cover','audio')),
  mime_type text not null,
  bytes bigint not null check(bytes between 1 and 31457280),
  etag text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  unique(bucket,object_key)
);
alter table public.media_assets enable row level security;
revoke all on public.media_assets from public,anon,authenticated;
grant all on public.media_assets to service_role;
grant select on public.media_assets to authenticated;
create policy "UNSEEN own media metadata" on public.media_assets for select to authenticated
using(owner_id=(select auth.uid()) or (select public.is_unseen_admin()));
create index media_assets_owner_idx on public.media_assets(owner_id);

alter table public.opere add column media_asset_id uuid references public.media_assets(id);
alter table public.opere add column owner_id uuid references auth.users(id) on delete set null;
create index opere_media_asset_idx on public.opere(media_asset_id) where media_asset_id is not null;
create index opere_owner_idx on public.opere(owner_id) where owner_id is not null;

create table public.r2_uploads (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('photo','music')),
  metadata jsonb not null,
  files jsonb not null,
  total_bytes bigint not null check(total_bytes between 1 and 36700160),
  state text not null default 'prepared' check(state in ('prepared','complete')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '15 minutes'
);
alter table public.r2_uploads enable row level security;
revoke all on public.r2_uploads from public,anon,authenticated;
grant all on public.r2_uploads to service_role;
create index r2_uploads_user_created_idx on public.r2_uploads(user_id,created_at);

create table public.r2_operations (
  id uuid primary key, lease uuid not null, expires_at timestamptz not null
);
alter table public.r2_operations enable row level security;
revoke all on public.r2_operations from public,anon,authenticated;
grant all on public.r2_operations to service_role;
create function public.r2_claim_operation(p_id uuid,p_lease uuid) returns boolean language sql set search_path='' as $$
  with claimed as (
    insert into public.r2_operations(id,lease,expires_at) values(p_id,p_lease,now()+interval '5 minutes')
    on conflict(id) do update set lease=excluded.lease,expires_at=excluded.expires_at
      where public.r2_operations.expires_at<now()
    returning id
  ) select exists(select 1 from claimed);
$$;
revoke all on function public.r2_claim_operation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.r2_claim_operation(uuid,uuid) to service_role;

create table public.r2_delete_jobs (
  id bigint generated always as identity primary key,
  bucket text not null, object_key text not null, record_id uuid not null, created_at timestamptz not null default now(),
  unique(bucket,object_key)
);
alter table public.r2_delete_jobs enable row level security;
revoke all on public.r2_delete_jobs from public,anon,authenticated;
grant all on public.r2_delete_jobs to service_role;
grant usage,select on sequence public.r2_delete_jobs_id_seq to service_role;

create table public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null check(length(trim(title)) between 1 and 120),
  artist text not null check(length(trim(artist)) between 1 and 120),
  story text not null default '' check(length(story)<=1500),
  cover_url text not null,
  audio_url text not null,
  cover_asset_id uuid not null references public.media_assets(id),
  audio_asset_id uuid not null references public.media_assets(id),
  status text not null default 'pending' check(status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now()
);
create table public.music_duels (
  id uuid primary key default gen_random_uuid(),
  track_1_id uuid not null references public.music_tracks(id),
  track_2_id uuid not null references public.music_tracks(id),
  start_at timestamptz not null default now(),
  end_at timestamptz not null,
  is_active boolean not null default false,
  votes_1 integer not null default 0 check(votes_1>=0),
  votes_2 integer not null default 0 check(votes_2>=0),
  check(track_1_id<>track_2_id), check(end_at>start_at)
);
create table public.music_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  duel_id uuid not null references public.music_duels(id) on delete cascade,
  vote_slot smallint not null check(vote_slot in (1,2)),
  created_at timestamptz not null default now(), unique(user_id,duel_id)
);
create index music_tracks_status_created_idx on public.music_tracks(status,created_at desc);
create index music_tracks_owner_idx on public.music_tracks(user_id);
create index music_duels_active_start_idx on public.music_duels(start_at desc) where is_active;
create index music_duels_track_1_idx on public.music_duels(track_1_id);
create index music_duels_track_2_idx on public.music_duels(track_2_id);
create index music_votes_duel_idx on public.music_votes(duel_id);
alter table public.music_tracks enable row level security;
alter table public.music_duels enable row level security;
alter table public.music_votes enable row level security;
revoke all on public.music_tracks,public.music_duels,public.music_votes from public,anon,authenticated;
grant all on public.music_tracks,public.music_duels,public.music_votes to service_role;
grant select on public.music_tracks,public.music_duels to anon,authenticated;
grant select,update,delete on public.music_tracks to authenticated;
grant insert,update,delete on public.music_duels to authenticated;
grant select,insert,update,delete on public.music_votes to authenticated;
create policy "UNSEEN public music tracks" on public.music_tracks for select to anon,authenticated using(status='accepted');
create policy "UNSEEN own music tracks" on public.music_tracks for select to authenticated using(user_id=(select auth.uid()));
create policy "UNSEEN admin music tracks" on public.music_tracks for all to authenticated using((select public.is_unseen_admin())) with check((select public.is_unseen_admin()));
create policy "UNSEEN active music duels" on public.music_duels for select to anon,authenticated using(is_active and start_at<=now() and end_at>now());
create policy "UNSEEN admin music duels" on public.music_duels for all to authenticated using((select public.is_unseen_admin())) with check((select public.is_unseen_admin()));
create policy "UNSEEN own music vote" on public.music_votes for select to authenticated using(user_id=(select auth.uid()));
create policy "UNSEEN admin music votes" on public.music_votes for all to authenticated using((select public.is_unseen_admin())) with check((select public.is_unseen_admin()));

create function public.cast_music_vote(p_duel_id uuid,p_vote_slot smallint)
returns void language plpgsql security definer set search_path='' as $$
declare voter uuid:=auth.uid(); duel public.music_duels%rowtype;
begin
  if voter is null then raise exception 'Authentication required'; end if;
  if p_vote_slot is null or p_vote_slot not in (1,2) then raise exception 'Invalid vote slot'; end if;
  select * into duel from public.music_duels where id=p_duel_id for update;
  if not found or not duel.is_active or duel.start_at>now() or duel.end_at<=now() then raise exception 'Duel is not active'; end if;
  if (select count(*) from public.music_tracks where id in (duel.track_1_id,duel.track_2_id) and status='accepted')<>2 then raise exception 'Tracks are not approved'; end if;
  insert into public.music_votes(user_id,duel_id,vote_slot) values(voter,p_duel_id,p_vote_slot);
  update public.music_duels set votes_1=votes_1+case when p_vote_slot=1 then 1 else 0 end,
    votes_2=votes_2+case when p_vote_slot=2 then 1 else 0 end where id=p_duel_id;
exception when unique_violation then raise exception 'You have already voted in this duel';
end; $$;
revoke all on function public.cast_music_vote(uuid,smallint) from public;
grant execute on function public.cast_music_vote(uuid,smallint) to authenticated;

-- Only the trusted Edge Function can reserve/finalize media. An advisory lock makes
-- the daily limit atomic even when several browser tabs submit at the same time.
create function public.r2_reserve_upload(p_id uuid,p_user_id uuid,p_kind text,p_metadata jsonb,p_files jsonb)
returns void language plpgsql set search_path='' as $$
declare total bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,783));
  if (select count(*) from public.r2_uploads where user_id=p_user_id and created_at>=now()-interval '24 hours')>=5 then
    raise exception 'Limite giornaliero raggiunto: riprova domani.';
  end if;
  select sum((f->>'bytes')::bigint) into total from jsonb_array_elements(p_files) f;
  if jsonb_array_length(p_files)<>(case when p_kind='photo' then 1 else 2 end) then raise exception 'Invalid files'; end if;
  insert into public.r2_uploads(id,user_id,kind,metadata,files,total_bytes) values(p_id,p_user_id,p_kind,p_metadata,p_files,total);
end; $$;
revoke all on function public.r2_reserve_upload(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.r2_reserve_upload(uuid,uuid,text,jsonb,jsonb) to service_role;

create function public.r2_complete_upload(p_id uuid,p_user_id uuid,p_bucket text,p_etags jsonb,p_public_url text)
returns uuid language plpgsql set search_path='' as $$
declare upload public.r2_uploads%rowtype; f jsonb; image_id uuid; cover_id uuid; audio_id uuid;
begin
  select * into upload from public.r2_uploads where id=p_id and user_id=p_user_id for update;
  if not found then raise exception 'Upload not found'; end if;
  if upload.state='complete' then return upload.id; end if;
  if upload.expires_at<now() then raise exception 'Upload expired'; end if;
  for f in select * from jsonb_array_elements(upload.files) loop
    if nullif(p_etags->>(f->>'id'),'') is null then raise exception 'Unverified asset'; end if;
    insert into public.media_assets(id,owner_id,bucket,object_key,kind,mime_type,bytes,etag)
    values((f->>'id')::uuid,p_user_id,p_bucket,f->>'key',f->>'kind',f->>'mime',(f->>'bytes')::bigint,p_etags->>(f->>'id'));
    case f->>'kind' when 'image' then image_id:=(f->>'id')::uuid; when 'cover' then cover_id:=(f->>'id')::uuid; when 'audio' then audio_id:=(f->>'id')::uuid; else raise exception 'Invalid asset'; end case;
  end loop;
  if upload.kind='photo' then
    insert into public.opere(id,owner_id,media_asset_id,titolo,autore,storia,social_link,immagine_url,status)
    select p_id,p_user_id,image_id,upload.metadata->>'titolo',upload.metadata->>'autore',upload.metadata->>'storia',upload.metadata->>'social_link',p_public_url||'/'||object_key,'pending'
      from public.media_assets where id=image_id;
  else
    insert into public.music_tracks(id,user_id,title,artist,story,cover_url,audio_url,cover_asset_id,audio_asset_id,status)
    select p_id,p_user_id,upload.metadata->>'title',upload.metadata->>'artist',upload.metadata->>'story',p_public_url||'/'||c.object_key,p_public_url||'/'||a.object_key,cover_id,audio_id,'pending'
      from public.media_assets c,public.media_assets a where c.id=cover_id and a.id=audio_id;
  end if;
  update public.r2_uploads set state='complete' where id=p_id;
  return p_id;
end; $$;
revoke all on function public.r2_complete_upload(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.r2_complete_upload(uuid,uuid,text,jsonb,text) to service_role;

create function public.r2_set_moderation(p_kind text,p_id uuid,p_status text,p_bucket text,p_is_public boolean)
returns void language plpgsql set search_path='' as $$
declare assets uuid[];
begin
  if p_status not in ('pending','accepted','rejected') or p_is_public<>(p_status='accepted') then raise exception 'Invalid moderation'; end if;
  if p_kind='photo' then
    select array[media_asset_id] into assets from public.opere where id=p_id for update;
    if assets is null or assets[1] is null then raise exception 'R2 artwork not found'; end if;
    insert into public.r2_delete_jobs(bucket,object_key,record_id) select bucket,object_key,p_id from public.media_assets where id=any(assets) and bucket<>p_bucket on conflict do nothing;
    update public.media_assets set bucket=p_bucket,is_public=p_is_public where id=any(assets);
    update public.opere set status=p_status,is_in_gallery=case when p_is_public then is_in_gallery else false end where id=p_id;
  elsif p_kind='music' then
    select array[cover_asset_id,audio_asset_id] into assets from public.music_tracks where id=p_id for update;
    if assets is null then raise exception 'Track not found'; end if;
    insert into public.r2_delete_jobs(bucket,object_key,record_id) select bucket,object_key,p_id from public.media_assets where id=any(assets) and bucket<>p_bucket on conflict do nothing;
    update public.media_assets set bucket=p_bucket,is_public=p_is_public where id=any(assets);
    update public.music_tracks set status=p_status where id=p_id;
  else raise exception 'Invalid media kind'; end if;
end; $$;
revoke all on function public.r2_set_moderation(text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.r2_set_moderation(text,uuid,text,text,boolean) to service_role;

-- Admin still manages all records, but R2 publication must use the Edge Function.
create function public.r2_guard_record() returns trigger language plpgsql set search_path='' as $$
begin
  if current_user in ('service_role','postgres','supabase_admin') then return new; end if;
  if tg_table_name='opere' then
    if new.media_asset_id is distinct from old.media_asset_id or (old.media_asset_id is not null and (new.status is distinct from old.status or new.immagine_url is distinct from old.immagine_url or (new.is_in_gallery and new.status<>'accepted'))) then
      raise exception 'Use R2 moderation to publish media';
    end if;
  else
    if new.status is distinct from old.status or new.cover_asset_id is distinct from old.cover_asset_id or new.audio_asset_id is distinct from old.audio_asset_id or new.cover_url is distinct from old.cover_url or new.audio_url is distinct from old.audio_url then
      raise exception 'Use R2 moderation to publish media';
    end if;
  end if;
  return new;
end; $$;
revoke all on function public.r2_guard_record() from public,anon,authenticated;
create trigger r2_guard_photo before update on public.opere for each row execute function public.r2_guard_record();
create trigger r2_guard_music before update on public.music_tracks for each row execute function public.r2_guard_record();

create function public.r2_queue_deleted_media() returns trigger language plpgsql security definer set search_path='' as $$
declare ids uuid[];
begin
  if tg_table_name='opere' then ids:=array[old.media_asset_id]; else ids:=array[old.cover_asset_id,old.audio_asset_id]; end if;
  insert into public.r2_delete_jobs(bucket,object_key,record_id)
    select bucket,object_key,old.id from public.media_assets where id=any(ids) on conflict do nothing;
  delete from public.media_assets where id=any(ids);
  return old;
end; $$;
revoke all on function public.r2_queue_deleted_media() from public,anon,authenticated;
create trigger r2_delete_photo after delete on public.opere for each row execute function public.r2_queue_deleted_media();
create trigger r2_delete_music after delete on public.music_tracks for each row execute function public.r2_queue_deleted_media();

-- Legacy uploads keep working during rollout. This policy prevents clients linking
-- someone else's R2 asset through the legacy insert path.
drop policy "UNSEEN pending photo submission" on public.opere;
create policy "UNSEEN pending photo submission" on public.opere for insert to anon,authenticated
with check(status='pending' and not coalesce(is_in_gallery,false) and coalesce(voti,0)=0 and duello_fine is null and media_asset_id is null and owner_id is null);
