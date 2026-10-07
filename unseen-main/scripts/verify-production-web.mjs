import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { app } from './cloudflare-env.mjs';
import { cfRequest } from './cloudflare-api.mjs';
import { supabaseRequest } from './setup-supabase-r2.mjs';

const origin = 'https://unseen.unseen-deboshoot.workers.dev';
async function get(route, options = {}) {
  const response = await fetch(origin + route, { ...options, signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `Pagina ${route} non disponibile`);
  return response;
}
const root = await (await get('/')).text();
assert.ok(root.includes(`${origin}/`), 'Metadati del nuovo sito non aggiornati');
const local = await fs.readFile(path.join(app, 'dist/index.html'), 'utf8');
const js = local.match(/src="([^\"]+\.js)"/)[1];
assert.ok(root.includes(js), 'Il sito non serve la build locale aggiornata');
const remoteJs = Buffer.from(await (await get(js)).arrayBuffer());
const localJs = await fs.readFile(path.join(app, 'dist', js));
assert.ok(remoteJs.equals(localJs), 'Bundle pubblico diverso da quello verificato');
assert.ok(remoteJs.toString().includes('r2-media'), 'Integrazione R2 assente dal bundle');
for (const route of ['/arena','/arena/fotografica','/arena/musicale','/submit','/auth','/admin']) {
  assert.equal(await (await get(route, { headers: { 'Sec-Fetch-Mode': 'navigate' } })).text(), root, `Routing SPA non valido: ${route}`);
}
const deployment = await (await get('/deployment.json')).json();
assert.equal(deployment.storage, 'cloudflare-r2');
const cors = await fetch('https://mpqphroecgfwonclmkyb.supabase.co/functions/v1/r2-media', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' }, signal: AbortSignal.timeout(20000) });
assert.equal(cors.status, 204);
assert.equal(cors.headers.get('access-control-allow-origin'), origin);
const auth = await supabaseRequest('config/auth');
assert.ok(auth.uri_allow_list.split(',').includes(`${origin}/**`), 'Redirect login del nuovo dominio mancante');
const cron = await cfRequest('workers/scripts/unseen-media/schedules');
assert.ok(cron.schedules.some(schedule => schedule.cron === '17 * * * *'), 'Pulizia media non programmata');
const folder = path.resolve(app, '..', 'debug.local', 'r2');
await fs.writeFile(path.join(folder, 'production-verified.json'), JSON.stringify({ passed: true, url: origin, commit: deployment.commit, routes: 7, bundle: js, checks: ['exact_public_bundle','r2_in_bundle','spa_routes','auth_redirect','edge_cors','hourly_cleanup'], at: new Date().toISOString() }, null, 2));
console.log(`Frontend pubblico verificato: ${origin}; bundle, sette pagine, redirect login, CORS e pulizia.`);
