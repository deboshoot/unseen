import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audit = path.resolve(app, '..', 'debug.local', 'supabase-audit');
const project = 'mpqphroecgfwonclmkyb';
const entries = (await fs.readFile(path.join(app, '.env.supabase.local'), 'utf8'))
  .split(/\r?\n/).map(line => line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean);
const credentials = Object.fromEntries(entries.map(([,key,value]) => [key,value.replace(/^['"]|['"]$/g,'')]));
if (credentials.SUPABASE_PROJECT_REF !== project || !credentials.SUPABASE_ACCESS_TOKEN) throw new Error('Missing credentials or unexpected project');
const test = JSON.parse(await fs.readFile(path.join(audit, 'hardening-test.json'), 'utf8'));
if (test.result !== 'passed' || test.transaction !== 'rolled_back') throw new Error('Missing successful rehearsal');
const migration = await fs.readFile(path.join(app, 'supabase', 'access-hardening.sql'), 'utf8');
const rollback = await fs.readFile(path.join(audit, 'rollback-access-hardening.sql'), 'utf8');

async function request(endpoint, method, body, timeout = 30000) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${credentials.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${String(result.message ?? 'request failed').slice(0, 800)}`);
  return result;
}

const status = await request('query/read-only', 'POST', { query: "select to_regprocedure('public.is_unseen_admin()') is not null as applied;" });
if (process.argv.includes('--verify')) {
  if (!status[0]?.applied) throw new Error('Admin function not present on remote project');
  const tests = await fs.readFile(path.join(app, 'supabase', 'tests', 'access-hardening.sql'), 'utf8');
  const verified = await request('query', 'POST', {
    query: `begin;\n${tests}\nrollback;\nselect 'passed' as unseen_live_access_test;`,
    read_only: false,
  });
  if (!verified.some(row => row.unseen_live_access_test === 'passed')) throw new Error('Live access test not confirmed');
  await fs.writeFile(path.join(audit, 'verified-hardening.json'), JSON.stringify({ actualRemoteConfiguration: 'passed', fixtures: 'rolled_back', at: new Date().toISOString() }, null, 2));
  process.stdout.write('Permessi e operazioni verificati sulla configurazione remota applicata; dati di prova annullati.\n');
  process.exit(0);
}
if (status[0]?.applied) throw new Error('Already applied: audit existing state before any repeat');
const result = await request('query', 'POST', {
  query: `begin;\n${migration}\ncommit;\nselect to_regprocedure('public.is_unseen_admin()') is not null as applied;`,
  read_only: false,
});
if (!result.some(row => row.applied === true)) throw new Error('Commit result not confirmed; audit before retry');
await fs.writeFile(path.join(audit, 'applied-hardening.json'), JSON.stringify({ applied: true, endpoint: 'database/query', at: new Date().toISOString() }, null, 2));
process.stdout.write('Migrazione applicata e commit confermato.\n');
try {
  await request('migrations', 'PUT', { query: migration, name: 'unseen_access_hardening', rollback }, 15000);
  const history = await request('migrations', 'GET');
  const entry = history.find(row => row.name === 'unseen_access_hardening');
  if (!entry || !/^\d{14}$/.test(entry.version)) throw new Error('Migration history entry not confirmed');
  await fs.writeFile(path.join(audit, 'hardening-history.json'), JSON.stringify({ version: entry.version, name: entry.name }, null, 2));
  process.stdout.write('Migrazione registrata nello storico Supabase.\n');
} catch {
  process.stdout.write('Storico API non confermato; SQL applicato e registrazione locale conservata.\n');
}
