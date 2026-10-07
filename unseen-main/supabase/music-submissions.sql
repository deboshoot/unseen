-- Additive migration: preserve existing music, media, championships and votes.
set local lock_timeout='5s';
set local statement_timeout='30s';
alter table public.music_tracks
  add column instagram_username text not null default '' check (instagram_username='' or instagram_username ~ '^[A-Za-z0-9._]{1,30}$'),
  add column youtube_url text not null default '' check (youtube_url='' or youtube_url ~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$'),
  add column instagram_reel_url text not null default '' check (instagram_reel_url='' or instagram_reel_url ~ '^https://www\.instagram\.com/reel/[A-Za-z0-9_-]+/$'),
  add column spotify_url text not null default '' check (spotify_url='' or spotify_url ~ '^https://open\.spotify\.com/track/[A-Za-z0-9]{22}$'),
  add column audio_duration_seconds double precision check (audio_duration_seconds>0 and audio_duration_seconds<=40);

alter table public.championship_entries
  add column instagram_username text not null default '',
  add column youtube_url text not null default '',
  add column instagram_reel_url text not null default '',
  add column spotify_url text not null default '';

-- The Edge Function supplies verified duration after inspecting the actual R2 WAV.
create or replace function public.r2_complete_upload(p_id uuid,p_user_id uuid,p_bucket text,p_etags jsonb,p_public_url text)
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
    insert into public.music_tracks(id,user_id,title,artist,cover_url,audio_url,cover_asset_id,audio_asset_id,status,instagram_username,youtube_url,instagram_reel_url,spotify_url,audio_duration_seconds)
    select p_id,p_user_id,upload.metadata->>'title',upload.metadata->>'artist',p_public_url||'/'||c.object_key,p_public_url||'/'||a.object_key,cover_id,audio_id,'pending',
      coalesce(upload.metadata->>'instagram_username',''),coalesce(upload.metadata->>'youtube_url',''),coalesce(upload.metadata->>'instagram_reel_url',''),coalesce(upload.metadata->>'spotify_url',''),(upload.metadata->>'audio_duration_seconds')::double precision
      from public.media_assets c,public.media_assets a where c.id=cover_id and a.id=audio_id;
  end if;
  update public.r2_uploads set state='complete' where id=p_id;
  return p_id;
end; $$;
revoke all on function public.r2_complete_upload(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.r2_complete_upload(uuid,uuid,text,jsonb,text) to service_role;

-- Freeze the published links together with the other championship entry data.
create or replace function unseen_private.snapshot_music_links()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.track_id is not null then
    select instagram_username,youtube_url,instagram_reel_url,spotify_url
      into new.instagram_username,new.youtube_url,new.instagram_reel_url,new.spotify_url
      from public.music_tracks where id=new.track_id;
  end if;
  return new;
end; $$;
revoke all on function unseen_private.snapshot_music_links() from public,anon,authenticated,service_role;
create trigger championship_snapshot_music_links before insert on public.championship_entries for each row execute function unseen_private.snapshot_music_links();
