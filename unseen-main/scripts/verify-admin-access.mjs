import assert from 'node:assert/strict';
import { supabaseRequest as request } from './setup-supabase-r2.mjs';

const expectedEmails = ['deboshoot@gmail.com', 'irushadissanayake2@gmail.com'];
const accounts = await request('database/query/read-only', 'POST', {
  query: 'select u.id,u.email,u.email_confirmed_at is not null as confirmed from unseen_private.admin_accounts a join auth.users u on u.id=a.user_id;',
});
assert.deepEqual(accounts.map(account => account.email.toLowerCase()).sort(), expectedEmails.toSorted(), 'Unexpected administrator membership');
assert.ok(accounts.every(account => account.confirmed), 'Unconfirmed administrator');
assert.ok(accounts.every(account => /^[a-f0-9-]{36}$/.test(account.id)), 'Invalid account ID');

const checks = accounts.map(account => `
  select set_config('request.jwt.claims','{"sub":"${account.id}","role":"authenticated"}',true);
  set local role authenticated;
  do $$ begin
    if public.is_unseen_admin() is not true then raise exception 'Administrator denied'; end if;
    perform public.get_admin_overview();
  end; $$;
  reset role;
`).join('\n');

// Read-only transaction: no users, roles, submissions or permissions are changed.
// Use the management connection so SET ROLE can emulate application requests;
// BEGIN READ ONLY below still prevents every persistent write.
const result = await request('database/query', 'POST', { read_only: false, query: `
  begin read only;
  ${checks}
  select set_config('request.jwt.claims',jsonb_build_object(
    'sub',coalesce((select id from auth.users where id not in(select user_id from unseen_private.admin_accounts) order by id limit 1),gen_random_uuid()),
    'role','authenticated','email','deboshoot@gmail.com','user_metadata',jsonb_build_object('is_admin',true)
  )::text,true);
  set local role authenticated;
  do $$ begin
    if public.is_unseen_admin() is not false then raise exception 'Ordinary user promoted'; end if;
    begin
      perform public.get_admin_overview();
      raise exception 'Private overview exposed';
    exception when raise_exception then
      if sqlerrm <> 'Administrator required' then raise; end if;
    end;
    begin
      perform public.get_admin_community(0,0);
      raise exception 'Private community exposed';
    exception when raise_exception then
      if sqlerrm <> 'Administrator required' then raise; end if;
    end;
    begin
      perform user_id from unseen_private.admin_accounts;
      raise exception 'Admin membership exposed';
    exception when insufficient_privilege then null; end;
  end; $$;
  reset role;
  select set_config('request.jwt.claims','{"role":"anon"}',true);
  set local role anon;
  do $$ begin
    if public.is_unseen_admin() is not false then raise exception 'Anonymous user promoted'; end if;
    begin
      perform public.get_admin_overview();
      raise exception 'Anonymous overview exposed';
    exception when insufficient_privilege then null; end;
  end; $$;
  reset role;
  rollback;
  select 'passed' as admin_access_checks;
` });
assert.ok(result.some(row => row.admin_access_checks === 'passed'), 'Access checks did not finish');
console.log('Verified on the live database: exactly two confirmed administrators; both retain dashboard access; ordinary and anonymous accounts cannot read private admin data, including with forged role metadata. No data changed.');
