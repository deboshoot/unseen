import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { app } from './cloudflare-env.mjs';
import { readLocalEnv } from './cloudflare-env.mjs';
import { cfRequest } from './cloudflare-api.mjs';
import { supabaseRequest } from './setup-supabase-r2.mjs';

const origin = 'https://unseen-virid.vercel.app';
async function get(route, options = {}) {
  const response = await fetch(origin + route, { ...options, signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `Pagina ${route} non disponibile`);
  return response;
}
const root = await (await get('/')).text();
assert.ok(root.includes(`${origin}/`), 'Metadati del nuovo sito non aggiornati');
const js = root.match(/src="([^\"]+\.js)"/)[1];
const remoteJs = Buffer.from(await (await get(js)).arrayBuffer());
assert.ok(remoteJs.toString().includes('r2-media'), 'Integrazione R2 assente dal bundle');
assert.ok(remoteJs.toString().includes('/arena/musicale'), 'Arena musicale assente dal bundle');
assert.ok(remoteJs.toString().includes('get_championship') && remoteJs.toString().includes('cast_championship_vote'), 'Campionati assenti dal bundle');
assert.ok(remoteJs.toString().includes('unseen-clip.wav') && remoteJs.toString().includes('instagram_reel_url') && remoteJs.toString().includes('music-studio-form'), 'Nuovo invio brani assente dal bundle');
assert.ok(remoteJs.toString().includes('get_admin_overview') && remoteJs.toString().includes('admin-studio') && remoteJs.toString().includes('championship_gallery'), 'Nuova dashboard o galleria dei campioni assente dal bundle');
assert.ok(remoteJs.toString().includes('mpqphroecgfwonclmkyb.supabase.co'), 'Progetto Supabase errato nel frontend');
const publicEnv=await readLocalEnv('.env.production.local');
let publicKey=remoteJs.toString().includes(publicEnv.VITE_SUPABASE_ANON_KEY)?publicEnv.VITE_SUPABASE_ANON_KEY:null;
publicKey ||= remoteJs.toString().match(/\bsb_publishable_[A-Za-z0-9_-]+/)?.[0];
if(!publicKey) for(const token of remoteJs.toString().match(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g)||[]) {
  try { const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()); if(claims.role==='anon'&&claims.ref==='mpqphroecgfwonclmkyb') publicKey=token; } catch { /* not a public Supabase token */ }
}
assert.ok(publicKey,'Chiave pubblica Supabase non riconosciuta nel frontend');
const publicRead=await fetch('https://mpqphroecgfwonclmkyb.supabase.co/rest/v1/opere?select=id&limit=1',{headers:{apikey:publicKey,Authorization:`Bearer ${publicKey}`},signal:AbortSignal.timeout(20000)});
assert.equal(publicRead.status,200,'La chiave Supabase della build pubblica non funziona');
for (const route of ['/arena','/arena/fotografica','/arena/musicale','/campionato','/submit','/submit?tipo=musica','/auth','/admin']) {
  assert.equal(await (await get(route, { headers: { 'Sec-Fetch-Mode': 'navigate' } })).text(), root, `Routing SPA non valido: ${route}`);
}
for (const kind of ['photo','music']) {
  const response=await fetch('https://mpqphroecgfwonclmkyb.supabase.co/rest/v1/rpc/get_championship',{method:'POST',headers:{apikey:publicKey,'Content-Type':'application/json'},body:JSON.stringify({p_kind:kind,p_id:null}),signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,'Campionato pubblico non disponibile');
  const snapshot=await response.json();
  assert.ok(Number.isFinite(Date.parse(snapshot.server_now)) && Array.isArray(snapshot.matches));
  assert.equal(snapshot.my_votes.length,0,'Voti privati esposti agli anonimi');
  for (const match of snapshot.matches) if (!match.resolved_at) { assert.equal(match.votes_1,null,'Punteggio in corso esposto'); assert.equal(match.votes_2,null,'Punteggio in corso esposto'); }
}
const headers = { apikey: publicKey };
const select = 'championship_id,entry_id,kind,month_key,published_at,entry:championship_entries!championship_gallery_championship_id_entry_id_fkey(*),championship:championships!championship_gallery_championship_id_fkey(name,start_at,end_at)';
const gallery = await fetch(`https://mpqphroecgfwonclmkyb.supabase.co/rest/v1/championship_gallery?${new URLSearchParams({select,limit:'1'})}`,{headers,signal:AbortSignal.timeout(20000)});
assert.equal(gallery.status,200,'Collegamento galleria-campionato-opera non disponibile');
for (const query of ['select=votes_1&limit=1','select=id&votes_1=gt.0&limit=1']) {
  const response = await fetch(`https://mpqphroecgfwonclmkyb.supabase.co/rest/v1/championship_matches?${query}`,{headers,signal:AbortSignal.timeout(20000)});
  assert.ok([401,403].includes(response.status),'Punteggi leggibili direttamente dal REST');
}
const jobs=await supabaseRequest('database/query/read-only','POST',{query:"select jobname,active from cron.job;"});
assert.ok(jobs.some(job=>job.jobname==='advance-championships'&&job.active),'Scheduler campionati assente');
const cors = await fetch('https://mpqphroecgfwonclmkyb.supabase.co/functions/v1/r2-media', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' }, signal: AbortSignal.timeout(20000) });
assert.equal(cors.status, 204);
assert.equal(cors.headers.get('access-control-allow-origin'), origin);
const auth = await supabaseRequest('config/auth');
assert.ok(auth.uri_allow_list.split(',').includes(`${origin}/**`), 'Redirect login del nuovo dominio mancante');
const cron = await cfRequest('workers/scripts/unseen-media/schedules');
assert.ok(cron.schedules.some(schedule => schedule.cron === '17 * * * *'), 'Pulizia media non programmata');
const folder = path.resolve(app, '..', 'debug.local', 'r2');
await fs.writeFile(path.join(folder, 'production-verified.json'), JSON.stringify({ passed: true, url: origin, routes: 9, bundle: js, checks: ['r2_in_bundle','music_in_bundle','music_submission_studio','championship_in_bundle','championship_rpc','championship_cron','public_supabase_key','spa_routes','auth_redirect','edge_cors','hourly_cleanup'], at: new Date().toISOString() }, null, 2));
console.log(`Frontend pubblico verificato: ${origin}; dashboard, galleria automatica, voti segreti, invio brani, campionati, nove pagine, Supabase, redirect login, CORS e pulizia.`);
