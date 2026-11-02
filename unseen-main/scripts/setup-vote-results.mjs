import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { app } from './cloudflare-env.mjs';
import { supabaseRequest as request } from './setup-supabase-r2.mjs';

const sql = await fs.readFile(path.join(app, 'supabase/championship-vote-results.sql'), 'utf8');
const body = sql.replace(/^begin;\s*$/m, '').replace(/^commit;\s*$/m, '');
const tests = await fs.readFile(path.join(app, 'supabase/tests/championship-vote-results.sql'), 'utf8');
const hash = createHash('sha256').update(sql + tests).digest('hex');
const folder = path.resolve(app, '../debug.local/vote-results');
await fs.mkdir(folder, { recursive: true });

async function verify(rehearsal) {
  const result = await request('database/query', 'POST', {
    query: `begin; set local statement_timeout='30s';\n${rehearsal ? body : ''}\n${tests}\nrollback; select 'passed' as vote_results_checks;`,
    read_only: false,
  });
  assert.ok(result.some(row => row.vote_results_checks === 'passed'), 'Verifica percentuali non completata');
  await fs.writeFile(path.join(folder, rehearsal ? 'rehearsal.json' : 'verified.json'), JSON.stringify({ hash, passed: true, rolledBack: true, at: new Date().toISOString() }, null, 2));
  console.log(`${rehearsal ? 'Prova' : 'Verifica online'} superata per foto e musica: prima/dopo voto, cambio account, anonimi, duelli distinti, conteggi privati, parita e arrotondamenti. Dati di prova annullati.`);
}

if (process.argv.includes('--rehearse')) await verify(true);
if (process.argv.includes('--apply')) {
  const rehearsal = JSON.parse(await fs.readFile(path.join(folder, 'rehearsal.json'), 'utf8'));
  assert.ok(rehearsal.passed && rehearsal.hash === hash, 'Eseguire --rehearse sullo stesso SQL prima di applicarlo');
  const before = await request('database/query/read-only', 'POST', { query: "select pg_get_functiondef('public.get_championship(text,uuid)'::regprocedure) as definition;" });
  await fs.writeFile(path.join(folder, `rollback-${Date.now()}.sql`), before[0].definition);
  await request('database/query', 'POST', { query: sql, read_only: false });
  await verify(false);
  const name = 'unseen_championship_vote_results';
  let history = await request('database/migrations');
  if (!history.some(row => row.name === name)) {
    await request('database/migrations', 'PUT', { name, query: body });
    history = await request('database/migrations');
  }
  const migration = history.find(row => row.name === name);
  assert.ok(migration, 'Registrazione migrazione non confermata');
  await fs.writeFile(path.join(app, 'supabase/migrations', `${migration.version}_${name}.sql`), body);
  console.log('Percentuali dopo il voto attivate e migrazione registrata.');
}
if (process.argv.includes('--verify') && !process.argv.includes('--apply')) await verify(false);
