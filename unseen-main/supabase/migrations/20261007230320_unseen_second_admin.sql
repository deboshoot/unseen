-- Explicitly authorized second administrator; preserve existing memberships.
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$
begin
  if (select count(*) from auth.users where lower(email)='irushadissanayake2@gmail.com' and email_confirmed_at is not null) <> 1 then
    raise exception 'Expected one confirmed account for the second administrator';
  end if;
  if not exists(select 1 from unseen_private.admin_accounts a join auth.users u on u.id=a.user_id where lower(u.email)='deboshoot@gmail.com') then
    raise exception 'Original administrator must remain authorized';
  end if;
end; $$;
insert into unseen_private.admin_accounts(user_id)
select id from auth.users where lower(email)='irushadissanayake2@gmail.com' and email_confirmed_at is not null
on conflict(user_id) do nothing;
