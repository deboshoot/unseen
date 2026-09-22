-- Final Arena: three manually selected artworks, custom start/end, one vote per user.
-- Run after rls-policies.sql in the Supabase SQL Editor.

create table if not exists public.final_arenas (
  id uuid primary key default gen_random_uuid(),
  artwork_1_id uuid not null references public.opere(id) on delete restrict,
  artwork_2_id uuid not null references public.opere(id) on delete restrict,
  artwork_3_id uuid not null references public.opere(id) on delete restrict,
  unseen_choice_id uuid references public.opere(id) on delete restrict,
  most_wins_id uuid references public.opere(id) on delete restrict,
  last_duel_winner_id uuid references public.opere(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_active boolean not null default true,
  votes_1 integer not null default 0,
  votes_2 integer not null default 0,
  votes_3 integer not null default 0,
  created_at timestamptz not null default now(),
  constraint final_arena_distinct_artworks check (
    artwork_1_id <> artwork_2_id
    and artwork_1_id <> artwork_3_id
    and artwork_2_id <> artwork_3_id
  ),
  constraint final_arena_valid_window check (end_at > start_at)
);

alter table public.final_arenas add column if not exists unseen_choice_id uuid references public.opere(id) on delete restrict;
alter table public.final_arenas add column if not exists most_wins_id uuid references public.opere(id) on delete restrict;
alter table public.final_arenas add column if not exists last_duel_winner_id uuid references public.opere(id) on delete restrict;

create table if not exists public.final_arena_votes (
  id uuid primary key default gen_random_uuid(),
  final_arena_id uuid not null references public.final_arenas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  artwork_slot smallint not null check (artwork_slot between 1 and 3),
  created_at timestamptz not null default now(),
  constraint final_arena_one_vote_per_user unique (final_arena_id, user_id)
);

create index if not exists final_arenas_window_idx
on public.final_arenas (start_at, end_at);

alter table public.final_arenas enable row level security;
alter table public.final_arena_votes enable row level security;

drop policy if exists "Public can view active final arena" on public.final_arenas;
create policy "Public can view active final arena"
on public.final_arenas for select
to anon, authenticated
using (is_active = true and start_at <= now() and end_at > now());

drop policy if exists "Admin can manage final arenas" on public.final_arenas;
create policy "Admin can manage final arenas"
on public.final_arenas for all
to authenticated
using ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com')
with check ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com');

drop policy if exists "Admin can view final arena votes" on public.final_arena_votes;
create policy "Admin can view final arena votes"
on public.final_arena_votes for select
to authenticated
using ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com');

create or replace function public.cast_final_arena_vote(
  p_final_arena_id uuid,
  p_artwork_slot smallint
)
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

  if p_artwork_slot not in (1, 2, 3) then
    raise exception 'Invalid artwork slot';
  end if;

  if not exists (
    select 1 from public.final_arenas
    where id = p_final_arena_id
      and is_active = true
      and start_at <= now()
      and end_at > now()
  ) then
    raise exception 'Final arena is not active';
  end if;

  insert into public.final_arena_votes (final_arena_id, user_id, artwork_slot)
  values (p_final_arena_id, current_user_id, p_artwork_slot);

  if p_artwork_slot = 1 then
    update public.final_arenas set votes_1 = votes_1 + 1 where id = p_final_arena_id;
  elsif p_artwork_slot = 2 then
    update public.final_arenas set votes_2 = votes_2 + 1 where id = p_final_arena_id;
  else
    update public.final_arenas set votes_3 = votes_3 + 1 where id = p_final_arena_id;
  end if;
exception
  when unique_violation then
    raise exception 'You have already voted in this final arena';
end;
$$;

revoke all on function public.cast_final_arena_vote(uuid, smallint) from public;
grant execute on function public.cast_final_arena_vote(uuid, smallint) to authenticated;
