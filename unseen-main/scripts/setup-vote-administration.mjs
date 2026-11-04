import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { app } from './cloudflare-env.mjs';
import { supabaseRequest as request } from './setup-supabase-r2.mjs';

const sql = await fs.readFile(path.join(app, 'supabase/championship-vote-administration.sql'), 'utf8');
const tests = await fs.readFile(path.join(app, 'supabase/tests/championship-vote-administration.sql'), 'utf8');
const hash = createHash('sha256').update(sql + tests).digest('hex');
const folder = path.resolve(app, '../debug.local/vote-administration');
await fs.mkdir(folder, { recursive: true });
const status = await request('database/query/read-only', 'POST', { query: "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='championship_votes' and column_name='administration_note') as applied;" });

async function verify(rehearsal) {
  const result = await request('database/query', 'POST', {
    read_only: false,
    query: `begin; set local lock_timeout='5s'; set local statement_timeout='30s';\n${rehearsal && !status[0].applied ? sql : ''}\n${tests}\nrollback; select 'passed' as vote_administration_checks;`,
  });
  assert.ok(result.some(row => row.vote_administration_checks === 'passed'), 'Administrative vote checks did not finish');
  await fs.writeFile(path.join(folder, rehearsal ? 'rehearsal.json' : 'verified.json'), JSON.stringify({ hash, passed: true, rolledBack: true, at: new Date().toISOString() }, null, 2));
  console.log('Administrative history verified: explanation visible to admins, no invented voter, no duplicate tally increment, ordinary and anonymous access blocked. Fixtures rolled back.');
}

if (process.argv.includes('--rehearse')) await verify(true);
if (process.argv.includes('--apply')) {
  const check = JSON.parse(await fs.readFile(path.join(folder, 'rehearsal.json'), 'utf8'));
  assert.ok(check.passed && check.hash === hash, 'Run --rehearse on the same SQL and tests first');
  if (!status[0].applied) await request('database/query', 'POST', { query: `begin; set local lock_timeout='5s';\n${sql}\ncommit;`, read_only: false });
  await verify(false);
  const name = 'unseen_championship_vote_administration';
  let history = await request('database/migrations');
  if (!history.some(row => row.name === name)) {
    await request('database/migrations', 'PUT', { name, query: sql });
    history = await request('database/migrations');
  }
  const migration = history.find(row => row.name === name);
  assert.ok(migration, 'Migration history not confirmed');
  await fs.writeFile(path.join(app, 'supabase/migrations', `${migration.version}_${name}.sql`), sql);
  console.log('Administrative vote history schema applied and migration registered.');
}
if (process.argv.includes('--verify') && !process.argv.includes('--apply')) await verify(false);
