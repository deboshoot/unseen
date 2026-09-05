-- Monthly gallery structure: exactly three artworks per month.
-- Run after rls-policies.sql in the Supabase SQL Editor.

create table if not exists public.gallery_months (
  id uuid primary key default gen_random_uuid(),
  month_key date not null unique,
  month_label text not null,
  winner_id uuid not null references public.opere(id) on delete restrict,
  people_choice_id uuid not null references public.opere(id) on delete restrict,
  jury_choice_id uuid not null references public.opere(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint gallery_months_three_distinct_artworks check (
    winner_id <> people_choice_id
    and winner_id <> jury_choice_id
    and people_choice_id <> jury_choice_id
  )
);

alter table public.gallery_months enable row level security;

drop policy if exists "Public can view monthly gallery" on public.gallery_months;
drop policy if exists "Admin can manage monthly gallery" on public.gallery_months;

create policy "Public can view monthly gallery"
on public.gallery_months for select
to anon, authenticated
using (true);

create policy "Admin can manage monthly gallery"
on public.gallery_months for all
to authenticated
using ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com')
with check ((auth.jwt() ->> 'email') = 'deboshoot@gmail.com');

create index if not exists gallery_months_month_key_idx
on public.gallery_months (month_key desc);
