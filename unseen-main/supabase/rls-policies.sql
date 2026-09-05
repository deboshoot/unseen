-- Unseen security policies
-- Run this script in the Supabase SQL Editor.
-- The admin identity is intentionally tied to the authenticated email.

alter table public.opere enable row level security;
alter table public.duels enable row level security;
alter table public.votes enable row level security;
alter table public.profiles enable row level security;

-- Re-running this file is safe.
drop policy if exists "Public can view accepted artworks" on public.opere;
drop policy if exists "Public can submit pending artworks" on public.opere;
drop policy if exists "Admin can manage artworks" on public.opere;
drop policy if exists "Public can view active duels" on public.duels;
drop policy if exists "Admin can manage duels" on public.duels;
drop policy if exists "Authenticated users can insert their own votes" on public.votes;
drop policy if exists "Admin can view votes" on public.votes;
drop policy if exists "Admin can view profiles" on public.profiles;

create policy "Public can view accepted artworks"
on public.opere for select
to anon, authenticated
using (status = 'accepted' or is_in_gallery = true);

create policy "Public can submit pending artworks"
on public.opere for insert
to anon, authenticated
with check (status = 'pending' and coalesce(is_in_gallery, false) = false);

create policy "Admin can manage artworks"
on public.opere for all
to authenticated
using ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com')
with check ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com');

create policy "Public can view active duels"
on public.duels for select
to anon, authenticated
using (is_active = true);

create policy "Admin can manage duels"
on public.duels for all
to authenticated
using ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com')
with check ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com');

create policy "Authenticated users can insert their own votes"
on public.votes for insert
to authenticated
with check (user_id = auth.uid());

create policy "Admin can view votes"
on public.votes for select
to authenticated
using ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com');

create policy "Admin can view profiles"
on public.profiles for select
to authenticated
using ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com');

-- One vote per user and duel, enforced by the database.
create unique index if not exists votes_one_per_user_per_duel
on public.votes (user_id, duel_id);

-- Atomic vote operation: inserts the vote and increments the correct counter
-- in one transaction, without exposing direct duel updates to the browser.
create or replace function public.cast_vote(p_duel_id uuid, p_vote_slot smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_vote_slot not in (1, 2) then
    raise exception 'Invalid vote slot';
  end if;

  if not exists (
    select 1 from public.duels
    where id = p_duel_id
      and is_active = true
      and (end_at is null or end_at > now())
  ) then
    raise exception 'Duel is not active';
  end if;

  insert into public.votes (user_id, duel_id, vote_slot)
  values (current_user_id, p_duel_id, p_vote_slot);

  if p_vote_slot = 1 then
    update public.duels
    set votes_champion = coalesce(votes_champion, 0) + 1
    where id = p_duel_id;
  else
    update public.duels
    set votes_challenger = coalesce(votes_challenger, 0) + 1
    where id = p_duel_id;
  end if;
exception
  when unique_violation then
    raise exception 'You have already voted in this duel';
end;
$$;

revoke all on function public.cast_vote(uuid, smallint) from public;
grant execute on function public.cast_vote(uuid, smallint) to authenticated;

-- Allow public uploads to the submission bucket. Keep the bucket itself public
-- only if submitted images are intended to be visible in the gallery.
drop policy if exists "Public can upload artwork images" on storage.objects;
create policy "Public can upload artwork images"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'galleria');
