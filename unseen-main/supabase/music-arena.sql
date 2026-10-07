-- LEGACY: superseded by r2-storage.sql and the registered R2 migrations.
-- Do not execute this script on the current UNSEEN project. See ../R2.md.
-- Original setup for Supabase Storage, kept only as historical reference.
-- This adds music tables and buckets; it does not change photographic tables.
begin;

create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null check (length(trim(title)) between 1 and 120),
  artist text not null check (length(trim(artist)) between 1 and 120),
  story text not null default '' check (length(story) <= 1500),
  cover_url text not null,
  audio_url text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);
create table if not exists public.music_duels (
  id uuid primary key default gen_random_uuid(),
  track_1_id uuid not null references public.music_tracks(id),
  track_2_id uuid not null references public.music_tracks(id),
  start_at timestamptz not null default now(),
  end_at timestamptz not null,
  is_active boolean not null default false,
  votes_1 integer not null default 0 check (votes_1 >= 0),
  votes_2 integer not null default 0 check (votes_2 >= 0),
  check (track_1_id <> track_2_id),
  check (end_at > start_at)
);
create table if not exists public.music_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  duel_id uuid not null references public.music_duels(id) on delete cascade,
  vote_slot smallint not null check (vote_slot in (1, 2)),
  created_at timestamptz not null default now(),
  unique (user_id, duel_id)
);
create index if not exists music_duels_active_start on public.music_duels (start_at desc) where is_active;

alter table public.music_tracks enable row level security;
alter table public.music_duels enable row level security;
alter table public.music_votes enable row level security;

drop policy if exists "Read music tracks" on public.music_tracks;
create policy "Read music tracks" on public.music_tracks for select to anon, authenticated
using (status = 'accepted' or user_id = auth.uid() or (auth.jwt() ->> 'email') = 'deboshoot@gmail.com');
drop policy if exists "Submit own pending track" on public.music_tracks;
create policy "Submit own pending track" on public.music_tracks for insert to authenticated
with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "Admin manage music tracks" on public.music_tracks;
create policy "Admin manage music tracks" on public.music_tracks for all to authenticated
using ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com') with check ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com');

drop policy if exists "Read active music duels" on public.music_duels;
create policy "Read active music duels" on public.music_duels for select to anon, authenticated
using (is_active and start_at <= now() and exists (select 1 from public.music_tracks where id = track_1_id and status = 'accepted') and exists (select 1 from public.music_tracks where id = track_2_id and status = 'accepted'));
drop policy if exists "Admin manage music duels" on public.music_duels;
create policy "Admin manage music duels" on public.music_duels for all to authenticated
using ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com') with check ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com');
drop policy if exists "Read own music vote" on public.music_votes;
create policy "Read own music vote" on public.music_votes for select to authenticated
using (user_id = auth.uid() or (auth.jwt() ->> 'email') = 'deboshoot@gmail.com');

grant select on public.music_tracks, public.music_duels to anon, authenticated;
grant insert on public.music_tracks to authenticated;
grant update, delete on public.music_tracks to authenticated;
grant insert, update, delete on public.music_duels to authenticated;
grant select on public.music_votes to authenticated;
revoke insert, update, delete on public.music_votes from anon, authenticated;

create or replace function public.cast_music_vote(p_duel_id uuid, p_vote_slot smallint)
returns void language plpgsql security definer set search_path = public as $$
declare
  voter uuid := auth.uid();
  duel public.music_duels%rowtype;
begin
  if voter is null then raise exception 'Authentication required'; end if;
  if p_vote_slot is null or p_vote_slot not in (1, 2) then raise exception 'Invalid vote slot'; end if;
  select * into duel from public.music_duels where id = p_duel_id for update;
  if not found or not duel.is_active or duel.start_at > now() or duel.end_at <= now() then raise exception 'Duel is not active'; end if;
  if (select count(*) from public.music_tracks where id in (duel.track_1_id, duel.track_2_id) and status = 'accepted') <> 2 then raise exception 'Tracks are not approved'; end if;
  insert into public.music_votes (user_id, duel_id, vote_slot) values (voter, p_duel_id, p_vote_slot);
  update public.music_duels set votes_1 = votes_1 + case when p_vote_slot = 1 then 1 else 0 end,
    votes_2 = votes_2 + case when p_vote_slot = 2 then 1 else 0 end where id = p_duel_id;
exception when unique_violation then raise exception 'You have already voted in this duel';
end;
$$;
revoke all on function public.cast_music_vote(uuid, smallint) from public;
grant execute on function public.cast_music_vote(uuid, smallint) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('music-covers', 'music-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('music-audio', 'music-audio', true, 31457280, array['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'])
on conflict (id) do nothing;

drop policy if exists "Upload own music files" on storage.objects;
create policy "Upload own music files" on storage.objects for insert to authenticated
with check (bucket_id in ('music-covers', 'music-audio') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Read own music files" on storage.objects;
create policy "Read own music files" on storage.objects for select to authenticated
using (bucket_id in ('music-covers', 'music-audio') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Remove own unused music files" on storage.objects;
create policy "Remove own unused music files" on storage.objects for delete to authenticated
using (bucket_id in ('music-covers', 'music-audio') and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (select 1 from public.music_tracks where user_id = auth.uid() and (cover_url like '%' || name or audio_url like '%' || name)));

commit;
