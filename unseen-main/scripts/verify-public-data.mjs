import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from './cloudflare-env.mjs';

const origin = 'https://unseen-virid.vercel.app';
const gateway = 'https://unseen-data.unseen-deboshoot.workers.dev';
const rpc = `${gateway}/rest/v1/rpc/get_championship`;
const send = (kind, headers = {}) => fetch(rpc, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ p_kind: kind, p_id: null }), signal: AbortSignal.timeout(20000) });
const preflight = await fetch(rpc, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
assert.equal((await send('photo', { Authorization: 'Bearer invalid' })).status, 400);
assert.equal((await fetch(`${gateway}/rest/v1/rpc/cast_championship_vote`, { method: 'POST' })).status, 404);
const checks = [];
for (const kind of ['photo', 'music']) {
  const response = await send(kind);
  const body = await response.json();
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  if (response.ok) {
    assert.equal(body.my_votes.length, 0);
    const next = await send(kind);
    assert.ok(next.ok);
    checks.push({ kind, status: response.status, cache: next.headers.get('X-Unseen-Cache') });
  } else {
    assert.equal(response.status, 402, `Unexpected upstream failure: ${JSON.stringify(body)}`);
    assert.match(body.message, /exceed.*egress_quota/);
    const next = await send(kind);
    assert.equal(next.status, 402);
    assert.equal(next.headers.get('X-Unseen-Cache'), 'MISS');
    checks.push({ kind, status: response.status, available: false, restrictionPreserved: true, errorsCached: false });
  }
}
const folder = path.resolve(app, '..', 'debug.local', 'supabase-egress');
await fs.mkdir(folder, { recursive: true });
const report = { at: new Date().toISOString(), gateway, checks, cors: true, writesRejected: true, userTokensRejected: true };
await fs.writeFile(path.join(folder, 'public-cache-verification.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
