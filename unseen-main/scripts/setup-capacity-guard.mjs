import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { app } from './cloudflare-env.mjs';
import { supabaseRequest as request } from './setup-supabase-r2.mjs';

const sql = await fs.readFile(path.join(app, 'supabase/r2-capacity-guard.sql'), 'utf8');
const tests = await fs.readFile(path.join(app, 'supabase/tests/r2-capacity-guard.sql'), 'utf8');
const check = await request('database/query', 'POST', { query: `begin; set local lock_timeout='5s'; set local statement_timeout='20s';\n${sql}\n${tests}\nrollback; select 'passed' as capacity_checks;`, read_only: false });
assert.ok(check.some(row => row.capacity_checks === 'passed'));
console.log('Capacity admission checks passed and rolled back: normal uploads, size validation, backlog budget, global daily cap and client permissions.');
if (process.argv.includes('--apply')) {
  await request('database/query', 'POST', { query: `begin; set local lock_timeout='5s';\n${sql}\ncommit;`, read_only: false });
  const name = 'unseen_r2_capacity_guard';
  let history = await request('database/migrations');
  if (!history.some(row => row.name === name)) {
    await request('database/migrations', 'PUT', { name, query: sql });
    history = await request('database/migrations');
  }
  const migration = history.find(row => row.name === name);
  assert.ok(migration);
  await fs.writeFile(path.join(app, 'supabase/migrations', `${migration.version}_${name}.sql`), sql);
  const bundle = await build({ entryPoints: [path.join(app, 'supabase/functions/r2-media/index.ts')], bundle: true, write: false, format: 'esm', platform: 'neutral', external: ['npm:*'], logLevel: 'silent' });
  await request('functions/r2-media', 'PATCH', { name: 'r2-media', body: bundle.outputFiles[0].text, verify_jwt: false });
  console.log('Global upload safety budget and controlled user messages deployed. Existing reads and voting remain available.');
}
