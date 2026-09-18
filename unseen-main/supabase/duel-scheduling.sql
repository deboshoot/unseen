-- Adds a scheduled opening time to duels.
-- Run this once in the Supabase SQL Editor.

alter table public.duels
add column if not exists start_at timestamptz;

create index if not exists duels_start_at_idx
on public.duels (start_at);

-- Scheduled duels must stay hidden until their opening time.
drop policy if exists "Public can view active duels" on public.duels;
create policy "Public can view active duels"
on public.duels for select
to anon, authenticated
using (
  is_active = true
  and (start_at is null or start_at <= now())
);

-- Also block early votes when the duel is scheduled for later.
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
      and (start_at is null or start_at <= now())
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
