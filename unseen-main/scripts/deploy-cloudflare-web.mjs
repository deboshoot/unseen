import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { app } from './cloudflare-env.mjs';
import { cloudflare as env, cfRequest } from './cloudflare-api.mjs';

// Static assets are served by Cloudflare's asset service, before this script.
// The frontend receives only the public Supabase configuration from its build.
if(!process.argv.includes('--standalone')) throw new Error('Il sito principale è su Vercel. Usare deploy-cloudflare-alias.mjs per il link Cloudflare; --standalone serve solo per pubblicare una copia indipendente di emergenza.');
const worker = 'unseen';
const subdomain = (await cfRequest('workers/subdomain')).subdomain;
if (subdomain !== 'unseen-deboshoot') throw new Error('Account Cloudflare diverso da quello configurato per UNSEEN');
const origin = `https://${worker}.${subdomain}.workers.dev`;
const dist = path.join(app, 'dist');
const assets = new Map();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff': 'font/woff', '.woff2': 'font/woff2' };
async function collect(folder) {
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) { await collect(full); continue; }
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    const url = '/' + path.relative(dist, full).replaceAll('\\', '/');
    let bytes = await fs.readFile(full);
    if (['/index.html', '/sitemap.xml', '/robots.txt'].includes(url)) bytes = Buffer.from(bytes.toString('utf8').replaceAll('https://unseen-virid.vercel.app', origin));
    assets.set(url, { bytes, mime: mime[path.extname(full).toLowerCase()] || 'application/octet-stream' });
  }
}
await collect(dist);
if (!assets.has('/index.html')) throw new Error('Eseguire prima npm run build');
const sha = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
if (sha.status !== 0) throw new Error('Commit Git non disponibile');
assets.set('/deployment.json', { bytes: Buffer.from(JSON.stringify({ commit: sha.stdout.trim(), deployedAt: new Date().toISOString(), storage: 'cloudflare-r2', database: 'supabase' })), mime: 'application/json' });
const manifest = {};
const byHash = new Map();
for (const [url, asset] of assets) {
  if (asset.bytes.length > 25 * 1024 * 1024) throw new Error(`Asset troppo grande: ${url}`);
  const hash = createHash('sha256').update(asset.bytes).update(asset.mime).digest('hex').slice(0, 32);
  manifest[url] = { hash, size: asset.bytes.length };
  byHash.set(hash, asset);
}
const upload = await cfRequest(`workers/scripts/${worker}/assets-upload-session`, 'POST', { manifest });
let completion = upload.buckets.length ? null : upload.jwt;
for (const bucket of upload.buckets) {
  const form = new FormData();
  for (const hash of bucket) {
    const asset = byHash.get(hash);
    if (!asset) throw new Error('Manifest degli asset non valido');
    form.append(hash, new Blob([asset.bytes.toString('base64')], { type: asset.mime }), hash);
  }
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/assets/upload?base64=true`, {
    method: 'POST', headers: { Authorization: `Bearer ${upload.jwt}` }, body: form, signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(`Upload asset Cloudflare: HTTP ${response.status}, codici ${(result.errors || []).map(error => error.code).join(',')}`);
  if (result.result?.jwt) completion = result.result.jwt;
}
if (!completion) throw new Error('Caricamento degli asset non completato');
const form = new FormData();
form.append('metadata', new Blob([JSON.stringify({ main_module: 'web.mjs', compatibility_date: '2026-10-07',
  bindings: [{ type: 'assets', name: 'ASSETS' }], assets: { jwt: completion, config: { not_found_handling: 'single-page-application' } },
  annotations: { 'workers/message': `UNSEEN ${sha.stdout.trim()}` },
})], { type: 'application/json' }));
form.append('web.mjs', new Blob(['export default { fetch(request, env) { return env.ASSETS.fetch(request); } };'], { type: 'application/javascript+module' }), 'web.mjs');
await cfRequest(`workers/scripts/${worker}`, 'PUT', form);
await cfRequest(`workers/scripts/${worker}/subdomain`, 'POST', { enabled: true, previews_enabled: false });
const folder = path.resolve(app, '..', 'debug.local', 'r2');
await fs.mkdir(folder, { recursive: true });
await fs.writeFile(path.join(folder, 'cloudflare-web-deployment.json'), JSON.stringify({ url: origin, commit: sha.stdout.trim(), files: assets.size, at: new Date().toISOString() }, null, 2));
console.log(`Frontend pubblicato: ${origin} (${assets.size} file statici).`);
