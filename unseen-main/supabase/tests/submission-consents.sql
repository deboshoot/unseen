-- Rehearsal only: run inside a transaction and roll it back afterward.
insert into auth.users(id,email,raw_user_meta_data)
values('a0000000-0000-4000-8000-000000000098','unseen-consent-fixture@example.invalid','{}');

set local role service_role;
insert into public.submission_consents(
  submission_id,user_id,submission_kind,terms_version,age_rights_confirmed,terms_accepted,accepted_at
) values (
  'a0000000-0000-4000-8000-000000000097',
  'a0000000-0000-4000-8000-000000000098',
  'photo',
  '2026-11-22',
  true,
  true,
  '2026-11-22 12:00:00+00'
);
reset role;

select set_config('request.jwt.claims','{"role":"authenticated","sub":"a0000000-0000-4000-8000-000000000098"}',true);
set local role authenticated;
do $$ begin
  begin
    perform count(*) from public.submission_consents;
    raise exception 'User can read consent audit records';
  exception when insufficient_privilege then null;
  end;
end; $$;
reset role;

set local role service_role;
delete from auth.users where id='a0000000-0000-4000-8000-000000000098';
do $$ begin
  if not exists(
    select 1 from public.submission_consents
    where submission_id='a0000000-0000-4000-8000-000000000097'
      and user_id is null
      and terms_version='2026-11-22'
      and age_rights_confirmed
      and terms_accepted
  ) then raise exception 'Consent record was not retained'; end if;
end; $$;
reset role;
