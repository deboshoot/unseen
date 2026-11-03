import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { app } from './cloudflare-env.mjs';
import { supabaseRequest as request } from './setup-supabase-r2.mjs';

const sql = await fs.readFile(path.join(app, 'supabase/community-search.sql'), 'utf8');
const tests = await fs.readFile(path.join(app, 'supabase/tests/community-search.sql'), 'utf8');
const hash = createHash('sha256').update(sql + tests).digest('hex');
const folder = path.resolve(app, '../debug.local/community-search');
await fs.mkdir(folder, { recursive: true });
async function verify(rehearsal) {
  const result = await request('database/query', 'POST', {
    query: `begin; set local statement_timeout='30s';\n${rehearsal ? sql : ''}\n${tests}\nrollback; select 'passed' as community_search_checks;`, read_only: false,
  });
  assert.ok(result.some(row => row.community_search_checks === 'passed'), 'Community search checks failed');
  await fs.writeFile(path.join(folder, rehearsal ? 'rehearsal.json' : 'verified.json'), JSON.stringify({ hash, passed: true, rolledBack: true, at: new Date().toISOString() }, null, 2));
  console.log(`${rehearsal ? 'Prova' : 'Verifica online'} superata: ricerca email, pagine, conteggi, caratteri letterali, compatibilità e permessi. Dati di prova annullati.`);
}
if (process.argv.includes('--rehearse')) await verify(true);
if (process.argv.includes('--apply')) {
  const check = JSON.parse(await fs.readFile(path.join(folder, 'rehearsal.json'), 'utf8'));
  assert.ok(check.passed && check.hash === hash, 'Run --rehearse on the same SQL first');
  const before = await request('database/query/read-only', 'POST', { query: "select pg_get_functiondef(p.oid) as definition from pg_proc p where p.oid=to_regprocedure('public.get_admin_community(integer,integer,text)');" });
  await fs.writeFile(path.join(folder, `rollback-${Date.now()}.sql`), before[0]?.definition ?? 'drop function if exists public.get_admin_community(integer,integer,text);\nnotify pgrst, \'reload schema\';');
  await request('database/query', 'POST', { query: `begin;\n${sql}\ncommit;`, read_only: false });
  await verify(false);
  const name = 'unseen_community_search';
  let history = await request('database/migrations');
  if (!history.some(row => row.name === name)) {
    await request('database/migrations', 'PUT', { name, query: sql });
    history = await request('database/migrations');
  }
  const migration = history.find(row => row.name === name);
  assert.ok(migration, 'Migration history not confirmed');
  await fs.writeFile(path.join(app, 'supabase/migrations', `${migration.version}_${name}.sql`), sql);
  console.log('Ricerca Community attivata e migrazione registrata.');
}
if (process.argv.includes('--verify') && !process.argv.includes('--apply')) await verify(false);
