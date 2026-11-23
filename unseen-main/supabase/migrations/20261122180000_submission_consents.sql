create table public.submission_consents (
  submission_id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  submission_kind text not null check (submission_kind in ('photo','music')),
  terms_version text not null check (length(terms_version) between 1 and 32),
  age_rights_confirmed boolean not null check (age_rights_confirmed),
  terms_accepted boolean not null check (terms_accepted),
  accepted_at timestamptz not null
);

alter table public.submission_consents enable row level security;
revoke all on public.submission_consents from public, anon, authenticated;
grant all on public.submission_consents to service_role;

create index submission_consents_user_accepted_idx
  on public.submission_consents(user_id, accepted_at desc);
