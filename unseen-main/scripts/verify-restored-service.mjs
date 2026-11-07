import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { app, readLocalEnv } from './cloudflare-env.mjs';
import { supabaseRequest } from './setup-supabase-r2.mjs';

const env = await readLocalEnv('.env.production.local');
const headers = { apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
const authHealth = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/health`, { headers, signal: AbortSignal.timeout(15000) });
assert.equal(authHealth.status, 200, 'Auth API remains unavailable');
const oauth = new URL(`${env.VITE_SUPABASE_URL}/auth/v1/authorize`);
oauth.searchParams.set('provider', 'google');
oauth.searchParams.set('redirect_to', 'https://unseen-virid.vercel.app/auth/callback');
const authRedirect = await fetch(oauth, { headers, redirect: 'manual', signal: AbortSignal.timeout(15000) });
assert.ok([302, 303].includes(authRedirect.status));
assert.equal(new URL(authRedirect.headers.get('Location')).hostname, 'accounts.google.com');
const anonVote = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/cast_championship_vote`, { method: 'POST', headers,
  body: JSON.stringify({ p_match_id: '00000000-0000-4000-8000-000000000001', p_vote_slot: 1 }), signal: AbortSignal.timeout(15000) });
assert.ok([401, 403].includes(anonVote.status), 'Anonymous vote endpoint accessible');
const sql = await fs.readFile(path.join(app, 'supabase/tests/restored-championship-voting.sql'), 'utf8');
const result = await supabaseRequest('database/query', 'POST', { query: `begin; set local lock_timeout='5s'; set local statement_timeout='20s';\n${sql}\nrollback; select 'passed' as restored_voting_checks;`, read_only: false });
assert.ok(result.some(row => row.restored_voting_checks === 'passed'));
const recovery = await fetch('https://unseen-data.unseen-deboshoot.workers.dev/recovery/public-v1.json');
assert.equal(recovery.status, 404, 'Outage copy still public after recovery');
const report = { at: new Date().toISOString(), authApi: true, googleRedirect: true, anonymousVotingDenied: true,
  photoAndMusicVoting: true, privateVoteAndPercentages: true, duplicateAndFutureVotesDenied: true, testVotesRolledBack: true, recoveryRetired: true };
const folder = path.resolve(app, '..', 'debug.local', 'supabase-egress');
await fs.writeFile(path.join(folder, 'restored-service-verified.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
